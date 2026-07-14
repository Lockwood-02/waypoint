create or replace function public.uncomplete_task(target_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  task_owner uuid;
  task_points integer;
  completion_transaction_id uuid;
  removed_points integer := 0;
  new_total_points integer;
begin
  select user_id, points
    into task_owner, task_points
  from public.tasks
  where id = target_task_id
    and user_id = auth.uid()
    and status = 'Completed'
  for update;

  if not found then
    raise exception 'Completed task not found or access denied.';
  end if;

  select id
    into completion_transaction_id
  from public.point_transactions
  where task_id = target_task_id
    and user_id = task_owner
    and type = 'task_completed'
    and amount > 0
  order by created_at desc
  limit 1
  for update;

  if completion_transaction_id is not null then
    delete from public.point_transactions
    where id = completion_transaction_id;

    removed_points := task_points;
  end if;

  update public.tasks
  set status = 'In Progress',
      completed_at = null,
      updated_at = now()
  where id = target_task_id;

  update public.profiles
  set total_points = greatest(0, total_points - removed_points),
      updated_at = now()
  where id = task_owner
  returning total_points into new_total_points;

  if new_total_points is null then
    raise exception 'Profile not found.';
  end if;

  return jsonb_build_object(
    'total_points', new_total_points,
    'points_removed', removed_points
  );
end;
$$;

revoke all on function public.uncomplete_task(uuid) from public;
grant execute on function public.uncomplete_task(uuid) to authenticated;
