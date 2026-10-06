-- =====================================================
-- E-Split: group members, settlement periods, invite RPCs, safe concurrent saves
-- Run in Supabase SQL Editor AFTER supabase_auth_setup.sql.
-- Safe to re-run: every statement is idempotent.
-- NOTE: this replaces ALL existing RLS policies on groups, group_members and
-- settlement_periods with the set defined below.
-- =====================================================

-- -----------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   TEXT NOT NULL REFERENCES public.groups(group_id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON public.group_members(user_id);

CREATE TABLE IF NOT EXISTS public.settlement_periods (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id           TEXT NOT NULL REFERENCES public.groups(group_id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  start_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date           TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  closed_at          TIMESTAMPTZ,
  closed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  final_balances     JSONB,
  final_settlements  JSONB,
  total_expenses     NUMERIC(12, 2),
  transaction_count  INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS settlement_periods_group_id_idx ON public.settlement_periods(group_id);

-- -----------------------------------------------------
-- 2. Optimistic concurrency for groups.data
--    The app only writes if `version` is unchanged since it read the row.
--    The trigger bumps it on every update, including writes from older clients.
-- -----------------------------------------------------
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.esplit_bump_group_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS esplit_bump_group_version ON public.groups;
CREATE TRIGGER esplit_bump_group_version
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.esplit_bump_group_version();

-- -----------------------------------------------------
-- 3. Membership helpers (SECURITY DEFINER avoids RLS recursion)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.esplit_is_member(p_group_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.esplit_is_admin(p_group_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM group_members
                 WHERE group_id = p_group_id AND user_id = auth.uid() AND role IN ('owner', 'admin'));
$$;

-- Owners are always listed in group_members, for new and existing groups
CREATE OR REPLACE FUNCTION public.esplit_add_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (NEW.group_id, NEW.user_id, 'owner')
    ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS esplit_add_owner_membership ON public.groups;
CREATE TRIGGER esplit_add_owner_membership
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.esplit_add_owner_membership();

INSERT INTO public.group_members (group_id, user_id, role)
SELECT group_id, user_id, 'owner' FROM public.groups WHERE user_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'owner';

-- -----------------------------------------------------
-- 4. Reset policies so no stale dashboard-created policy stays active
-- -----------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('groups', 'group_members', 'settlement_periods')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_periods ENABLE ROW LEVEL SECURITY;

-- groups: owner or member can read/update; only the owner creates (as themselves) or deletes
CREATE POLICY "Members can view groups"
  ON public.groups FOR SELECT
  USING (public.esplit_is_member(group_id));

CREATE POLICY "Users can create their own groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update groups"
  ON public.groups FOR UPDATE
  USING (public.esplit_is_member(group_id))
  WITH CHECK (public.esplit_is_member(group_id));

CREATE POLICY "Owners can delete groups"
  ON public.groups FOR DELETE
  USING (auth.uid() = user_id);

-- group_members: inserts only via add_group_member()
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  USING (public.esplit_is_member(group_id));

-- The owner row can't be edited or removed by admins, and nobody can be promoted to owner
CREATE POLICY "Admins can update member roles"
  ON public.group_members FOR UPDATE
  USING (public.esplit_is_admin(group_id) AND role <> 'owner')
  WITH CHECK (public.esplit_is_admin(group_id) AND role IN ('admin', 'member'));

CREATE POLICY "Admins remove members or users leave"
  ON public.group_members FOR DELETE
  USING ((public.esplit_is_admin(group_id) AND role <> 'owner') OR user_id = auth.uid());

-- settlement_periods
CREATE POLICY "Members manage periods"
  ON public.settlement_periods FOR ALL
  USING (public.esplit_is_member(group_id))
  WITH CHECK (public.esplit_is_member(group_id));

-- -----------------------------------------------------
-- 5. RPC: exact-match email lookup (no partial search => no account enumeration)
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS public.search_users_by_email(TEXT);

CREATE FUNCTION public.search_users_by_email(search_email TEXT)
RETURNS TABLE (id UUID, email TEXT, name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT u.id,
         u.email::TEXT,
         COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE auth.uid() IS NOT NULL
    AND lower(u.email) = lower(trim(search_email))
  LIMIT 1;
$$;

-- -----------------------------------------------------
-- 6. RPC: add member. Users may add themselves (invite link) as 'member';
--    owners/admins may add anyone with any role.
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS public.add_group_member(TEXT, UUID, TEXT);

CREATE FUNCTION public.add_group_member(p_group_id TEXT, p_user_id UUID, p_role TEXT DEFAULT 'member')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_role NOT IN ('owner', 'admin', 'member') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = p_group_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found');
  END IF;

  IF NOT public.esplit_is_admin(p_group_id) THEN
    IF p_user_id <> auth.uid() THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only group admins can add other users');
    END IF;
    p_role := 'member';
  ELSIF p_role = 'owner' THEN
    p_role := 'admin';
  END IF;

  INSERT INTO group_members (group_id, user_id, role)
  VALUES (p_group_id, p_user_id, p_role)
  ON CONFLICT (group_id, user_id) DO NOTHING
  RETURNING id INTO v_member_id;

  IF v_member_id IS NULL THEN
    SELECT id INTO v_member_id FROM group_members WHERE group_id = p_group_id AND user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'memberId', v_member_id, 'alreadyMember', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'memberId', v_member_id);
END;
$$;

-- -----------------------------------------------------
-- 7. RPC: list members with email/name (auth.users is not reachable via the REST API)
-- -----------------------------------------------------
DROP FUNCTION IF EXISTS public.get_group_members(TEXT);

CREATE FUNCTION public.get_group_members(p_group_id TEXT)
RETURNS TABLE (id UUID, user_id UUID, role TEXT, joined_at TIMESTAMPTZ, email TEXT, name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
  SELECT m.id, m.user_id, m.role, m.joined_at, u.email::TEXT,
         COALESCE(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
  FROM group_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.group_id = p_group_id
    AND public.esplit_is_member(p_group_id);
$$;

-- -----------------------------------------------------
-- 8. Permissions
-- -----------------------------------------------------
REVOKE ALL ON FUNCTION public.search_users_by_email(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_group_member(TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_group_members(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.esplit_is_member(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.esplit_is_admin(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_member(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_members(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.esplit_is_member(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.esplit_is_admin(TEXT) TO authenticated;

-- -----------------------------------------------------
-- 9. Realtime (app subscribes to these tables)
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND tablename = 'settlement_periods') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settlement_periods;
  END IF;
END $$;
