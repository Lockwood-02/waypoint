alter table public.tasks
  add column if not exists is_urgent boolean not null default false;

create index if not exists tasks_user_urgent_created_idx
  on public.tasks (user_id, is_urgent desc, created_at desc);
