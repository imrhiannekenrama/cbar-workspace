-- ============================================================
-- CBAR Workspace — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
create type user_role as enum ('Administrator', 'Researcher');
create type user_status as enum ('Active', 'Inactive');
create type task_priority as enum ('Low', 'Medium', 'High', 'Urgent');
create type task_status as enum ('To Do', 'In Progress', 'For Review', 'Completed');
create type section_status as enum ('Not Started', 'Draft', 'In Review', 'Completed');
create type event_type as enum ('Deadline', 'Meeting', 'Consultation');
create type attendance_status as enum ('Present', 'Absent', 'Late', 'Excused');

-- ------------------------------------------------------------
-- HELPER FUNCTIONS (used by RLS policies)
-- ------------------------------------------------------------
create or replace function current_profile_id()
returns uuid as $$
  select id from public.profiles where user_id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'Administrator'
  );
$$ language sql stable security definer set search_path = public;

create or replace function is_dm_participant(chan text)
returns boolean as $$
  select
    chan in ('general', 'announcements')
    or (
      chan like 'dm:%'
      and auth.uid() is not null
      and chan like '%' || auth.uid()::text || '%'
    );
$$ language sql stable security definer set search_path = public;

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

create table committees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text default '',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null unique,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'Researcher',
  status user_status not null default 'Active',
  committee_id uuid references committees (id) on delete set null,
  student_number text default '',
  avatar_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Research Project',
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table research_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  group_name text not null default 'Preliminaries',
  order_index int not null default 0,
  content_html text not null default '',
  status section_status not null default 'Not Started',
  progress int not null default 0 check (progress between 0 and 100),
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table section_versions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references research_sections (id) on delete cascade,
  content_html text not null,
  label text default '',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references research_sections (id) on delete cascade,
  parent_id uuid references comments (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  mentions uuid[] not null default '{}',
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  assignee_id uuid references profiles (id) on delete set null,
  committee_id uuid references committees (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  due_date date,
  priority task_priority not null default 'Medium',
  status task_status not null default 'To Do',
  progress int not null default 0 check (progress between 0 and 100),
  checklist jsonb not null default '[]',
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  agenda text default '',
  scheduled_at timestamptz not null,
  location text default '',
  minutes_html text default '',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  status attendance_status not null default 'Present',
  unique (meeting_id, profile_id)
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references folders (id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text default '',
  size_bytes bigint not null default 0,
  version int not null default 1,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files (id) on delete cascade,
  version int not null,
  storage_path text not null,
  size_bytes bigint not null default 0,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text default '',
  link text default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  details jsonb default '{}',
  created_at timestamptz not null default now()
);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  event_type event_type not null default 'Deadline',
  event_date date not null,
  event_time time,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles (id) on delete set null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  channel text not null, -- 'general' | 'announcements' | 'dm:<idA>|<idB>'
  body text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at TRIGGER
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_project_updated_at before update on project
  for each row execute function set_updated_at();
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function set_updated_at();
create trigger trg_files_updated_at before update on files
  for each row execute function set_updated_at();
create trigger trg_sections_updated_at before update on research_sections
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table profiles enable row level security;
alter table committees enable row level security;
alter table project enable row level security;
alter table research_sections enable row level security;
alter table section_versions enable row level security;
alter table comments enable row level security;
alter table tasks enable row level security;
alter table meetings enable row level security;
alter table meeting_attendance enable row level security;
alter table folders enable row level security;
alter table files enable row level security;
alter table file_versions enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table calendar_events enable row level security;
alter table announcements enable row level security;
alter table messages enable row level security;

-- profiles
create policy "Profiles are visible to every member"
  on profiles for select to authenticated using (true);
create policy "Admins create profiles"
  on profiles for insert to authenticated with check (is_admin());
create policy "Members update own profile, admin updates any"
  on profiles for update to authenticated
  using (is_admin() or id = current_profile_id());
create policy "Admins delete profiles"
  on profiles for delete to authenticated using (is_admin());

-- committees
create policy "Committees are visible to every member"
  on committees for select to authenticated using (true);
create policy "Admins manage committees"
  on committees for insert to authenticated with check (is_admin());
create policy "Admins update committees"
  on committees for update to authenticated using (is_admin());
create policy "Admins delete committees"
  on committees for delete to authenticated using (is_admin());

-- project (single row)
create policy "Project is visible to every member"
  on project for select to authenticated using (true);
create policy "Admins update the project"
  on project for update to authenticated using (is_admin());
create policy "Admins insert the project"
  on project for insert to authenticated with check (is_admin());
create policy "Admins delete the project"
  on project for delete to authenticated using (is_admin());

-- research sections
create policy "Sections are visible to every member"
  on research_sections for select to authenticated using (true);
create policy "Members update sections"
  on research_sections for update to authenticated using (true);
create policy "Admins insert sections"
  on research_sections for insert to authenticated with check (is_admin());
create policy "Admins delete sections"
  on research_sections for delete to authenticated using (is_admin());

-- section versions
create policy "Versions are visible to every member"
  on section_versions for select to authenticated using (true);
create policy "Members create versions"
  on section_versions for insert to authenticated with check (true);
create policy "Admins delete versions"
  on section_versions for delete to authenticated using (is_admin());

-- comments
create policy "Comments are visible to every member"
  on comments for select to authenticated using (true);
create policy "Members create comments"
  on comments for insert to authenticated with check (true);
create policy "Author or admin updates a comment"
  on comments for update to authenticated
  using (is_admin() or author_id = current_profile_id());
create policy "Author or admin deletes a comment"
  on comments for delete to authenticated
  using (is_admin() or author_id = current_profile_id());

-- tasks: researchers only see assigned tasks (or tasks they created)
create policy "Admin sees all tasks; researchers see assigned/own tasks"
  on tasks for select to authenticated
  using (
    is_admin()
    or assignee_id = current_profile_id()
    or created_by = current_profile_id()
  );
create policy "Admins create tasks"
  on tasks for insert to authenticated with check (is_admin());
create policy "Admin or assignee updates a task"
  on tasks for update to authenticated
  using (is_admin() or assignee_id = current_profile_id());
create policy "Admins delete tasks"
  on tasks for delete to authenticated using (is_admin());

-- meetings
create policy "Meetings are visible to every member"
  on meetings for select to authenticated using (true);
create policy "Admins create meetings"
  on meetings for insert to authenticated with check (is_admin());
create policy "Admins update meetings"
  on meetings for update to authenticated using (is_admin());
create policy "Admins delete meetings"
  on meetings for delete to authenticated using (is_admin());

-- meeting attendance
create policy "Attendance is visible to every member"
  on meeting_attendance for select to authenticated using (true);
create policy "Admins manage attendance"
  on meeting_attendance for insert to authenticated with check (is_admin());
create policy "Admins update attendance"
  on meeting_attendance for update to authenticated using (is_admin());
create policy "Admins delete attendance"
  on meeting_attendance for delete to authenticated using (is_admin());

-- folders
create policy "Folders are visible to every member"
  on folders for select to authenticated using (true);
create policy "Admins manage folders"
  on folders for insert to authenticated with check (is_admin());
create policy "Admins update folders"
  on folders for update to authenticated using (is_admin());
create policy "Admins delete folders"
  on folders for delete to authenticated using (is_admin());

-- files
create policy "Files are visible to every member"
  on files for select to authenticated using (true);
create policy "Members upload files"
  on files for insert to authenticated with check (true);
create policy "Uploader or admin updates a file"
  on files for update to authenticated
  using (is_admin() or uploaded_by = current_profile_id());
create policy "Uploader or admin deletes a file"
  on files for delete to authenticated
  using (is_admin() or uploaded_by = current_profile_id());

-- file versions
create policy "File versions are visible to every member"
  on file_versions for select to authenticated using (true);
create policy "Members create file versions"
  on file_versions for insert to authenticated with check (true);
create policy "Admins delete file versions"
  on file_versions for delete to authenticated using (is_admin());

-- notifications
create policy "Members see own notifications"
  on notifications for select to authenticated
  using (user_id = current_profile_id());
create policy "Members create notifications for others"
  on notifications for insert to authenticated with check (true);
create policy "Members update own notifications"
  on notifications for update to authenticated
  using (user_id = current_profile_id());
create policy "Members delete own notifications"
  on notifications for delete to authenticated
  using (user_id = current_profile_id());

-- activity logs
create policy "Members insert activity logs"
  on activity_logs for insert to authenticated with check (true);
create policy "Admin sees all logs; members see own logs"
  on activity_logs for select to authenticated
  using (is_admin() or user_id = current_profile_id());
create policy "Admins manage activity logs"
  on activity_logs for update to authenticated using (is_admin());
create policy "Admins delete activity logs"
  on activity_logs for delete to authenticated using (is_admin());

-- calendar events
create policy "Events are visible to every member"
  on calendar_events for select to authenticated using (true);
create policy "Admins create events"
  on calendar_events for insert to authenticated with check (is_admin());
create policy "Admins update events"
  on calendar_events for update to authenticated using (is_admin());
create policy "Admins delete events"
  on calendar_events for delete to authenticated using (is_admin());

-- announcements
create policy "Announcements are visible to every member"
  on announcements for select to authenticated using (true);
create policy "Admins create announcements"
  on announcements for insert to authenticated with check (is_admin());
create policy "Admins update announcements"
  on announcements for update to authenticated using (is_admin());
create policy "Admins delete announcements"
  on announcements for delete to authenticated using (is_admin());

-- messages (private chat)
create policy "Members read channels they participate in"
  on messages for select to authenticated
  using (is_dm_participant(channel));
create policy "Members write to channels they participate in"
  on messages for insert to authenticated
  with check (is_dm_participant(channel) and author_id = current_profile_id());
create policy "Author or admin deletes a message"
  on messages for delete to authenticated
  using (is_admin() or author_id = current_profile_id());

-- ------------------------------------------------------------
-- STORAGE BUCKETS & POLICIES
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('files', 'files', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public read access to workspace buckets"
  on storage.objects for select
  using (bucket_id in ('files', 'avatars'));

create policy "Members can upload to workspace buckets"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('files', 'avatars'));

create policy "Owner or admin deletes storage objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('files', 'avatars')
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.profiles
        where user_id = auth.uid() and role = 'Administrator'
      )
    )
  );

-- ------------------------------------------------------------
-- REALTIME
-- ------------------------------------------------------------
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table meetings;
alter publication supabase_realtime add table calendar_events;
alter publication supabase_realtime add table files;
