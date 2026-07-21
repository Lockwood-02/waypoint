-- Run this script once in the Supabase SQL editor.
-- It ensures only a task's creator or the group's owner can delete a group task.

alter table public.group_tasks enable row level security;

drop policy if exists "Group task deletion requires ownership" on public.group_tasks;
create policy "Group task deletion requires ownership"
  on public.group_tasks
  as restrictive
  for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.groups
      where groups.id = group_tasks.group_id
        and groups.owner_id = auth.uid()
    )
  );
