-- Run this script once in the Supabase SQL editor.

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists note_folders_user_name_unique_idx
  on public.note_folders (user_id, lower(trim(name)));

alter table public.notes
  add column if not exists folder_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_folder_id_fkey'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_folder_id_fkey
      foreign key (folder_id)
      references public.note_folders(id)
      on delete set null;
  end if;
end
$$;

create index if not exists notes_user_folder_updated_idx
  on public.notes (user_id, folder_id, updated_at desc);

create or replace function public.validate_note_folder_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folder_id is not null and not exists (
    select 1
    from public.note_folders
    where id = new.folder_id
      and user_id = new.user_id
  ) then
    raise exception 'A note can only be placed in one of its owner''s folders.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_note_folder_owner_trigger on public.notes;
create trigger validate_note_folder_owner_trigger
  before insert or update of folder_id, user_id
  on public.notes
  for each row
  execute function public.validate_note_folder_owner();

alter table public.note_folders enable row level security;

grant select, insert, update, delete on public.note_folders to authenticated;

drop policy if exists "Users can view their note folders" on public.note_folders;
create policy "Users can view their note folders"
  on public.note_folders
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their note folders" on public.note_folders;
create policy "Users can create their note folders"
  on public.note_folders
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their note folders" on public.note_folders;
create policy "Users can update their note folders"
  on public.note_folders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their note folders" on public.note_folders;
create policy "Users can delete their note folders"
  on public.note_folders
  for delete
  using (auth.uid() = user_id);
