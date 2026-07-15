-- Group task checklist assignments
-- Run once in the Supabase SQL editor after the groups foundation migration.

alter table public.group_task_steps
add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists group_task_steps_assigned_to_idx
on public.group_task_steps(assigned_to);

create or replace function public.get_group_members(target_group_id uuid)
returns table (
  user_id uuid,
  display_name text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    member.user_id,
    coalesce(profile.display_name, 'Group member') as display_name,
    member.role
  from public.group_members as member
  left join public.profiles as profile on profile.id = member.user_id
  where member.group_id = target_group_id
    and public.is_group_member(target_group_id)
  order by
    case when member.role = 'owner' then 0 else 1 end,
    coalesce(profile.display_name, 'Group member');
$$;

revoke all on function public.get_group_members(uuid) from public;
grant execute on function public.get_group_members(uuid) to authenticated;

-- Assignees must belong to the same group as the task.
create or replace function public.validate_group_step_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare step_group_id uuid;
begin
  if new.assigned_to is null then return new; end if;

  select group_id into step_group_id
  from public.group_tasks
  where id = new.task_id;

  if not public.is_group_member(step_group_id, new.assigned_to) then
    raise exception 'The selected assignee is not a member of this group';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_group_step_assignee_trigger on public.group_task_steps;
create trigger validate_group_step_assignee_trigger
before insert or update of assigned_to, task_id on public.group_task_steps
for each row execute function public.validate_group_step_assignee();
