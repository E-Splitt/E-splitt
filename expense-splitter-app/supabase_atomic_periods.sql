-- Install after supabase_members_and_periods.sql and before deploying the client.
begin;

-- Some hosted installations have a legacy single-active-period trigger.
-- It must resolve the public table even when invoked by a function with a pinned search path.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.settlement_periods'::regclass
      and tgfoid = pg_catalog.to_regprocedure('public.ensure_single_active_period()')
      and not tgisinternal
  ) then
    alter function public.ensure_single_active_period() set search_path = pg_catalog, public, pg_temp;
  end if;
end $$;

create or replace function public.esplit_ensure_period(p_group text)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  result settlement_periods%rowtype;
begin
  perform 1 from groups where group_id = p_group for update;
  if not found or not esplit_is_member(p_group) then raise exception 'Group unavailable'; end if;
  select * into result from settlement_periods
    where group_id = p_group and status = 'active' order by start_date desc, id limit 1;
  if not found then
    insert into settlement_periods(group_id,name) values(p_group,'Initial Period') returning * into result;
  end if;
  return to_jsonb(result);
end $$;

create schema if not exists esplit_private;
revoke all on schema esplit_private from public, anon, authenticated;
grant usage on schema esplit_private to authenticated;

create or replace function esplit_private.period_summary(p_entries jsonb, p_participants jsonb, p_population jsonb)
returns table (balances jsonb, settlements jsonb, total numeric)
language plpgsql set search_path = pg_catalog, pg_temp as $$
declare
  remaining jsonb;
  people jsonb;
  debtor text;
  creditor text;
  debtors text[];
  creditors text[];
  i integer := 1;
  j integer := 1;
  payment numeric;
begin
  settlements := '[]';
  select coalesce(jsonb_object_agg(p->>'id', p->>'name'),'{}') into people
    from jsonb_array_elements(p_participants) p;

  with entries as (select e from jsonb_array_elements(p_entries) e),
  postings(person, amount) as (
    select key, 0 from jsonb_each(coalesce(p_population,people))
    union all select e->>'paidBy', round((e->>'amount')::numeric,2) from entries
    union all select e->>'paidTo', -round((e->>'amount')::numeric,2) from entries where (e->>'isSettlement')::boolean
    union all select key, -round(value::numeric,2) from entries, jsonb_each_text(e->'shares')
      where not coalesce((e->>'isSettlement')::boolean,false)
  )
  select coalesce(jsonb_object_agg(person,net_amount),'{}') into balances
    from (select person,sum(amount) net_amount from postings group by person) sums;
  if (select sum(value::numeric) from jsonb_each_text(balances)) <> 0 then
    raise exception 'Correct unreconciled splits before updating this period';
  end if;
  remaining := balances;
  select array_agg(key order by value::numeric,key) into debtors
    from jsonb_each_text(balances) where value::numeric<0;
  select array_agg(key order by value::numeric desc,key) into creditors
    from jsonb_each_text(balances) where value::numeric>0;
  while debtors[i] is not null and creditors[j] is not null loop
    debtor := debtors[i];
    creditor := creditors[j];
    payment := least(-(remaining->>debtor)::numeric,(remaining->>creditor)::numeric);
    settlements := settlements || jsonb_build_array(jsonb_build_object('amount',payment,
      'from',jsonb_build_object('id',debtor,'name',coalesce(people->>debtor,'Unknown')),
      'to',jsonb_build_object('id',creditor,'name',coalesce(people->>creditor,'Unknown'))));
    remaining := remaining || jsonb_build_object(debtor,(remaining->>debtor)::numeric+payment,
      creditor,(remaining->>creditor)::numeric-payment);
    if (remaining->>debtor)::numeric=0 then i := i+1; end if;
    if (remaining->>creditor)::numeric=0 then j := j+1; end if;
  end loop;
  select coalesce(sum(round((e->>'amount')::numeric,2)),0) into total
    from jsonb_array_elements(p_entries) e where not coalesce((e->>'isSettlement')::boolean,false);
  return next;
end $$;

revoke all on function esplit_private.period_summary(jsonb,jsonb,jsonb) from public, anon, authenticated;

create or replace function esplit_private.close_period(p_group text, p_period uuid, p_name text, p_activity jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  ledger jsonb;
  active_entries jsonb;
  snapshot record;
  successor public.settlement_periods%rowtype;
begin
  if auth.uid() is null or not public.esplit_is_member(p_group) then raise exception 'Group unavailable'; end if;
  select data into ledger from public.groups where group_id=p_group for update;
  if not found or not public.esplit_is_member(p_group) then raise exception 'Group unavailable'; end if;
  perform 1 from public.settlement_periods where group_id=p_group and id=p_period and status='active' for update;
  if not found then raise exception 'This period is already closed or unavailable'; end if;

  select coalesce(jsonb_agg(e order by pos),'[]') into active_entries
    from jsonb_array_elements(ledger->'expenses') with ordinality as t(e,pos)
    where nullif(e->>'periodId','') is null;
  select * into snapshot from esplit_private.period_summary(active_entries, ledger->'participants', null);
  update public.settlement_periods set status='closed', name=coalesce(nullif(trim(p_name),''),name),
    closed_at=now(),end_date=now(),closed_by=auth.uid(),
    final_balances=snapshot.balances,final_settlements=snapshot.settlements,
    total_expenses=snapshot.total,transaction_count=jsonb_array_length(active_entries)
    where id=p_period;
  update public.groups set data=ledger || jsonb_build_object(
    'expenses',(select coalesce(jsonb_agg(case when nullif(e->>'periodId','') is null
      then e || jsonb_build_object('periodId',p_period) else e end order by pos),'[]')
      from jsonb_array_elements(ledger->'expenses') with ordinality as t(e,pos)),
    'activityLog',(select jsonb_agg(e order by pos) from
      jsonb_array_elements(jsonb_build_array(p_activity) || coalesce(ledger->'activityLog','[]')) with ordinality as t(e,pos)
      where pos<=50)) where group_id=p_group;
  -- Reuse an open period if an older client already created one.
  select * into successor from public.settlement_periods where group_id=p_group and status='active' order by start_date desc,id limit 1;
  if not found then
    insert into public.settlement_periods(group_id,name) values(p_group,'Settlement ' || current_date) returning * into successor;
  end if;
  return to_jsonb(successor);
end $$;

create or replace function public.esplit_close_period(p_group text, p_period uuid, p_name text, p_activity jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select esplit_private.close_period(p_group, p_period, p_name, p_activity);
$$;

-- Validate changed financial records, leaving untouched historical data readable.
create or replace function public.esplit_validate_expenses() returns trigger
language plpgsql set search_path=public as $$
declare
  previous jsonb := '{}';
  entry jsonb;
  amount numeric;
  share_total numeric;
begin
  if tg_op='UPDATE' then
    if old.data->'expenses' is not distinct from new.data->'expenses' then return new; end if;
    select coalesce(jsonb_object_agg(e->>'id',e),'{}') into previous from jsonb_array_elements(old.data->'expenses') e;
  end if;
  for entry in select e from jsonb_array_elements(new.data->'expenses') e loop
    if entry = previous->(entry->>'id') then continue; end if;
    amount := (entry->>'amount')::numeric;
    if amount is null or amount <= 0 or amount <> round(amount,2) then
      raise exception 'Use a positive whole-cent amount';
    end if;
    if not coalesce((entry->>'isSettlement')::boolean,false) then
      select sum(value::numeric) into share_total from jsonb_each_text(entry->'shares');
      if share_total is distinct from amount or exists (
        select 1 from jsonb_each_text(entry->'shares') where value is null or
          value::numeric < 0 or value::numeric <> round(value::numeric,2)
      ) then raise exception 'Expense shares must match the bill in cents'; end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists esplit_validate_expenses on public.groups;
create trigger esplit_validate_expenses before insert or update of data on public.groups
for each row execute function public.esplit_validate_expenses();

-- Only the owner of the private write functions may change the archived ledger
-- or its snapshot. Normal authenticated writes continue through the existing RLS.
create or replace function esplit_private.is_archive_writer() returns boolean
language sql stable security invoker set search_path = '' as $$
  select current_user = pg_catalog.pg_get_userbyid(proowner)
  from pg_catalog.pg_proc where oid = 'esplit_private.close_period(text,uuid,text,jsonb)'::pg_catalog.regprocedure;
$$;

create or replace function public.esplit_protect_archive() returns trigger
language plpgsql set search_path = pg_catalog, pg_temp as $$
begin
  if esplit_private.is_archive_writer() or old.data->'expenses' is not distinct from new.data->'expenses' then
    return new;
  end if;
  if exists (
    (select e from jsonb_array_elements(old.data->'expenses') e where nullif(e->>'periodId','') is not null
      except all
     select e from jsonb_array_elements(new.data->'expenses') e where nullif(e->>'periodId','') is not null)
    union all
    (select e from jsonb_array_elements(new.data->'expenses') e where nullif(e->>'periodId','') is not null
      except all
     select e from jsonb_array_elements(old.data->'expenses') e where nullif(e->>'periodId','') is not null)
  ) then raise exception 'Use the archive editor to change an archived expense'; end if;
  return new;
end $$;
drop trigger if exists esplit_protect_archive on public.groups;
create trigger esplit_protect_archive before update of data on public.groups
for each row execute function public.esplit_protect_archive();

create or replace function public.esplit_protect_period_snapshot() returns trigger
language plpgsql set search_path = pg_catalog, pg_temp as $$
begin
  if (old.status='closed' or new.status='closed') and new is distinct from old
    and not esplit_private.is_archive_writer() then
    raise exception 'Use the period functions to update an archived period';
  end if;
  return new;
end $$;
drop trigger if exists esplit_protect_snapshot on public.settlement_periods;
create trigger esplit_protect_snapshot before update on public.settlement_periods
for each row execute function public.esplit_protect_period_snapshot();

create table if not exists public.archived_expense_edits (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.settlement_periods(id) on delete cascade,
  group_id text not null,
  expense_id text not null,
  actor_id uuid not null,
  actor_name text not null,
  edited_at timestamptz not null default clock_timestamp(),
  before_expense jsonb,
  after_expense jsonb not null
);
-- A null before-state records a newly added archived expense.
alter table public.archived_expense_edits alter column before_expense drop not null;
create index if not exists archived_expense_edits_period_time_idx
  on public.archived_expense_edits(period_id, edited_at desc);
alter table public.archived_expense_edits enable row level security;
drop policy if exists "Members read archived expense edits" on public.archived_expense_edits;
create policy "Members read archived expense edits" on public.archived_expense_edits
  for select to authenticated using (public.esplit_is_member(group_id));
revoke all on public.archived_expense_edits from public, anon, authenticated;
grant select on public.archived_expense_edits to authenticated;

create or replace function esplit_private.write_archived_expense(p_group text, p_period uuid, p_previous jsonb, p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  actor uuid := auth.uid();
  editor_name text;
  ledger jsonb;
  previous_expense jsonb;
  existing_expense jsonb;
  is_add boolean := p_previous is null;
  target_period uuid := p_period;
  edited_expense jsonb;
  period_row public.settlement_periods%rowtype;
  period_expenses jsonb;
  snapshot record;
begin
  if actor is null or not public.esplit_is_member(p_group) then raise exception 'Group unavailable'; end if;
  select data into ledger from public.groups where group_id=p_group for update;
  if not found or not public.esplit_is_member(p_group) then raise exception 'Group unavailable'; end if;
  if not is_add then
    select e into previous_expense from jsonb_array_elements(ledger->'expenses') e
      where e->>'id'=p_previous->>'id';
    if previous_expense is null or nullif(previous_expense->>'periodId','') is null
      or coalesce((previous_expense->>'isSettlement')::boolean,false) then
      raise exception 'Archived expense unavailable';
    end if;
    if previous_expense is distinct from p_previous then
      raise exception 'Someone changed this expense. Close the editor and reopen it to see the latest version.';
    end if;
    target_period := (previous_expense->>'periodId')::uuid;
  end if;
  select * into period_row from public.settlement_periods
    where id=target_period and group_id=p_group and status='closed' for update;
  if not found then raise exception 'Archived period unavailable'; end if;

  select coalesce(previous_expense,'{}') || coalesce(jsonb_object_agg(key,value),'{}') into edited_expense
    from jsonb_each(p_changes)
    where key in ('description','amount','paidBy','category','shares','splitMode','splitInputs','isRecurring','recurringInterval');
  if is_add then
    if jsonb_typeof(p_changes->'id') is distinct from 'number'
      or (p_changes->>'id') !~ '^[1-9][0-9]{0,15}$' then
      raise exception 'Invalid expense ID';
    end if;
    if coalesce(p_changes->>'expenseDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Enter the expense date';
    end if;
    edited_expense := edited_expense || jsonb_build_object(
      'id',p_changes->'id','periodId',period_row.id,'isSettlement',false,
      'expenseDate',(p_changes->>'expenseDate')::date,'date',(p_changes->>'expenseDate')::date
    );
    select e into existing_expense from jsonb_array_elements(ledger->'expenses') e
      where e->>'id'=edited_expense->>'id';
    if found then
      if existing_expense = edited_expense then
        return jsonb_build_object('expense',existing_expense,'period',to_jsonb(period_row));
      end if;
      raise exception 'This expense was already saved. Reopen the archive to make changes.';
    end if;
  end if;
  if edited_expense is not distinct from previous_expense then
    return jsonb_build_object('expense',previous_expense,'period',to_jsonb(period_row));
  end if;
  if nullif(btrim(edited_expense->>'description'),'') is null or nullif(edited_expense->>'paidBy','') is null then
    raise exception 'Enter a description and select a payer';
  end if;
  if edited_expense->>'paidBy' is distinct from previous_expense->>'paidBy' then
    if not exists (select 1 from jsonb_array_elements(ledger->'participants') p where p->>'id'=edited_expense->>'paidBy') then
      raise exception 'Select a payer from this group';
    end if;
    edited_expense := edited_expense - 'paidByName';
  end if;
  if exists (
    select 1 from jsonb_object_keys(edited_expense->'shares') share(id)
    where not coalesce((previous_expense->'shares') ? share.id, false)
      and not exists (select 1 from jsonb_array_elements(ledger->'participants') p where p->>'id'=share.id)
  ) then raise exception 'Select participants from this group'; end if;

  if is_add then
    ledger := jsonb_set(ledger,'{expenses}',jsonb_build_array(edited_expense) || coalesce(ledger->'expenses','[]'));
  else
    ledger := jsonb_set(ledger,'{expenses}',(
      select jsonb_agg(case when e->>'id'=previous_expense->>'id' then edited_expense else e end order by pos)
      from jsonb_array_elements(ledger->'expenses') with ordinality as t(e,pos)
    ));
  end if;
  update public.groups set data=ledger where group_id=p_group;

  if is_add or (edited_expense->'amount', edited_expense->'paidBy', edited_expense->'shares')
    is distinct from (previous_expense->'amount', previous_expense->'paidBy', previous_expense->'shares') then
    select jsonb_agg(e) into period_expenses from jsonb_array_elements(ledger->'expenses') e
      where e->>'periodId'=period_row.id::text;
    select * into snapshot from esplit_private.period_summary(
      period_expenses, ledger->'participants', period_row.final_balances
    );
    update public.settlement_periods set final_balances=snapshot.balances,final_settlements=snapshot.settlements,
      total_expenses=snapshot.total,transaction_count=jsonb_array_length(period_expenses)
      where id=period_row.id returning * into period_row;
  end if;

  select coalesce(nullif(btrim(raw_user_meta_data->>'name'),''),nullif(btrim(raw_user_meta_data->>'full_name'),''),
    nullif(split_part(email,'@',1),'')) into editor_name from auth.users where id=actor;
  insert into public.archived_expense_edits(period_id,group_id,expense_id,actor_id,actor_name,before_expense,after_expense)
    values(period_row.id,p_group,edited_expense->>'id',actor,coalesce(editor_name,actor::text),previous_expense,edited_expense);
  return jsonb_build_object('expense',edited_expense,'period',to_jsonb(period_row));
end $$;

create or replace function public.esplit_edit_archived_expense(p_group text, p_previous jsonb, p_changes jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select esplit_private.write_archived_expense(p_group, null, p_previous, p_changes);
$$;

create or replace function public.esplit_add_archived_expense(p_group text, p_period uuid, p_expense jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select esplit_private.write_archived_expense(p_group, p_period, null, p_expense);
$$;

drop function if exists esplit_private.edit_archived_expense(text,jsonb,jsonb);

revoke all on function esplit_private.is_archive_writer(), esplit_private.close_period(text,uuid,text,jsonb),
  esplit_private.write_archived_expense(text,uuid,jsonb,jsonb), public.esplit_ensure_period(text),
  public.esplit_close_period(text,uuid,text,jsonb), public.esplit_edit_archived_expense(text,jsonb,jsonb),
  public.esplit_add_archived_expense(text,uuid,jsonb) from public,anon;
grant execute on function esplit_private.is_archive_writer(), esplit_private.close_period(text,uuid,text,jsonb),
  esplit_private.write_archived_expense(text,uuid,jsonb,jsonb), public.esplit_ensure_period(text),
  public.esplit_close_period(text,uuid,text,jsonb), public.esplit_edit_archived_expense(text,jsonb,jsonb),
  public.esplit_add_archived_expense(text,uuid,jsonb) to authenticated;
commit;
