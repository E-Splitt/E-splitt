-- =====================================================
-- E-Split: group members, settlement periods, RPCs, RLS
-- Run in Supabase SQL Editor AFTER supabase_auth_setup.sql
-- =====================================================

-- Group membership (multi-user access)
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their memberships" ON group_members;
CREATE POLICY "Members can view their memberships"
    ON group_members FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group owners can manage members" ON group_members;
CREATE POLICY "Group owners can manage members"
    ON group_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.group_id = group_members.group_id
              AND g.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
              AND gm.user_id = auth.uid()
              AND gm.role IN ('owner', 'admin')
        )
    );

-- Settlement periods
CREATE TABLE IF NOT EXISTS settlement_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    final_balances JSONB,
    final_settlements JSONB,
    total_expenses NUMERIC(12, 2),
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_periods_group ON settlement_periods(group_id);

ALTER TABLE settlement_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group periods" ON settlement_periods;
CREATE POLICY "Members can view group periods"
    ON settlement_periods FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.group_id = settlement_periods.group_id
              AND g.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = settlement_periods.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can manage group periods" ON settlement_periods;
CREATE POLICY "Members can manage group periods"
    ON settlement_periods FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.group_id = settlement_periods.group_id
              AND g.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = settlement_periods.group_id
              AND gm.user_id = auth.uid()
        )
    );

-- Extend groups RLS so members (not only owners) can read/update shared groups
DROP POLICY IF EXISTS "Members can view shared groups" ON groups;
CREATE POLICY "Members can view shared groups"
    ON groups FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = groups.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can update shared groups" ON groups;
CREATE POLICY "Members can update shared groups"
    ON groups FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = groups.group_id
              AND gm.user_id = auth.uid()
        )
    );

-- Search users by email (limited fields for invites)
CREATE OR REPLACE FUNCTION search_users_by_email(search_email TEXT)
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT u.id, u.email::TEXT
    FROM auth.users u
    WHERE lower(u.email) = lower(search_email)
    LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION search_users_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_users_by_email(TEXT) TO authenticated;

-- Add a member to a group (owner or admin)
CREATE OR REPLACE FUNCTION add_group_member(
    p_group_id TEXT,
    p_user_id UUID,
    p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner UUID;
    v_caller UUID := auth.uid();
BEGIN
    IF v_caller IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT user_id INTO v_owner FROM groups WHERE group_id = p_group_id;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Group not found');
    END IF;

    IF v_caller <> v_owner AND NOT EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = p_group_id AND user_id = v_caller AND role IN ('owner', 'admin')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
    END IF;

    INSERT INTO group_members (group_id, user_id, role)
    VALUES (p_group_id, p_user_id, COALESCE(p_role, 'member'))
    ON CONFLICT (group_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION add_group_member(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_group_member(TEXT, UUID, TEXT) TO authenticated;
