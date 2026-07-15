-- Waypoint groups foundation
-- Run once in the Supabase SQL editor. Personal task tables are unchanged.

create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Completed', 'Archived')),
  points integer not null default 0 check (points >= 0),
  is_urgent boolean not null default false,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.group_tasks(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  is_completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_tasks_group_id_idx on public.group_tasks(group_id, created_at desc);
create index if not exists group_task_steps_task_id_idx on public.group_task_steps(task_id, position);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_tasks enable row level security;
alter table public.group_task_steps enable row level security;

-- Security-definer helper avoids recursive group_members RLS checks.
create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = target_user_id
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;

create or replace function public.is_group_owner(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups
    where id = target_group_id and owner_id = target_user_id
  );
$$;

revoke all on function public.is_group_owner(uuid, uuid) from public;
grant execute on function public.is_group_owner(uuid, uuid) to authenticated;

drop policy if exists "members can view groups" on public.groups;
create policy "members can view groups" on public.groups for select to authenticated
using (public.is_group_member(id));

drop policy if exists "owners can update groups" on public.groups;
create policy "owners can update groups" on public.groups for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "members can view memberships" on public.group_members;
create policy "members can view memberships" on public.group_members for select to authenticated
using (public.is_group_member(group_id));

drop policy if exists "users can leave groups" on public.group_members;
create policy "users can leave groups" on public.group_members for delete to authenticated
using (user_id = auth.uid() and role <> 'owner');

drop policy if exists "members can view group tasks" on public.group_tasks;
create policy "members can view group tasks" on public.group_tasks for select to authenticated
using (public.is_group_member(group_id));

drop policy if exists "members can create group tasks" on public.group_tasks;
create policy "members can create group tasks" on public.group_tasks for insert to authenticated
with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists "members can update group tasks" on public.group_tasks;
create policy "members can update group tasks" on public.group_tasks for update to authenticated
using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

drop policy if exists "members can delete group tasks" on public.group_tasks;
create policy "members can delete group tasks" on public.group_tasks for delete to authenticated
using (public.is_group_member(group_id));

drop policy if exists "members can view group task steps" on public.group_task_steps;
create policy "members can view group task steps" on public.group_task_steps for select to authenticated
using (exists (select 1 from public.group_tasks t where t.id = task_id and public.is_group_member(t.group_id)));

drop policy if exists "members can create group task steps" on public.group_task_steps;
create policy "members can create group task steps" on public.group_task_steps for insert to authenticated
with check (exists (select 1 from public.group_tasks t where t.id = task_id and public.is_group_member(t.group_id)));

drop policy if exists "members can update group task steps" on public.group_task_steps;
create policy "members can update group task steps" on public.group_task_steps for update to authenticated
using (exists (select 1 from public.group_tasks t where t.id = task_id and public.is_group_member(t.group_id)));

drop policy if exists "members can delete group task steps" on public.group_task_steps;
create policy "members can delete group task steps" on public.group_task_steps for delete to authenticated
using (exists (select 1 from public.group_tasks t where t.id = task_id and public.is_group_member(t.group_id)));

create or replace function public.create_group(group_name text, group_description text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.groups(name, description, owner_id)
  values (trim(group_name), nullif(trim(group_description), ''), auth.uid())
  returning id into new_group_id;
  insert into public.group_members(group_id, user_id, role)
  values (new_group_id, auth.uid(), 'owner');
  return new_group_id;
end;
$$;

create or replace function public.join_group_by_invite(supplied_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare target_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into target_group_id from public.groups where invite_token = supplied_token;
  if target_group_id is null then raise exception 'This invite link is invalid or has expired'; end if;
  insert into public.group_members(group_id, user_id, role)
  values (target_group_id, auth.uid(), 'member') on conflict do nothing;
  return target_group_id;
end;
$$;

create or replace function public.rotate_group_invite(target_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_token uuid := gen_random_uuid();
begin
  update public.groups set invite_token = new_token, updated_at = now()
  where id = target_group_id and owner_id = auth.uid();
  if not found then raise exception 'Only the group owner can reset the invite link'; end if;
  return new_token;
end;
$$;

revoke all on function public.create_group(text, text) from public;
revoke all on function public.join_group_by_invite(uuid) from public;
revoke all on function public.rotate_group_invite(uuid) from public;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.join_group_by_invite(uuid) to authenticated;
grant execute on function public.rotate_group_invite(uuid) to authenticated;
