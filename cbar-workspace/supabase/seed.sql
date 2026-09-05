-- ============================================================
-- CBAR Workspace — Seed Data
-- Run AFTER schema.sql in the Supabase SQL Editor.
--
-- This creates the first administrator login:
--   Email:    rhiannekenrama@gmail.com
--   Password: CBARAdmin2026!
-- (Log in once, then change the password from the Profile page.)
-- ============================================================

-- ------------------------------------------------------------
-- COMMITTEES
-- ------------------------------------------------------------
insert into committees (id, name, description) values
  ('11111111-1111-1111-1111-111111111111', 'Technical Committee', 'QuizSync guidance, PowerPoint, network setup, technical support and troubleshooting.'),
  ('22222222-2222-2222-2222-222222222222', 'Data and Documentation', 'Encoding, master spreadsheet, formatting, statistics and research draft.'),
  ('33333333-3333-3333-3333-333333333333', 'Coordination Committee', 'Letters, consent forms, attendance, minutes, scheduling and communication.')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- FIRST ADMIN AUTH USER
-- ------------------------------------------------------------
do $$
declare
  admin_id uuid;
begin
  select id into admin_id from auth.users where email = 'rhiannekenrama@gmail.com';
  if admin_id is null then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, email_confirmed, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'rhiannekenrama@gmail.com',
      crypt('CBARAdmin2026!', gen_salt('bf')),
      now(), true,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Rhianne Ken S. Rama"}'::jsonb,
      now(), now(), '', '', ''
    ) returning id into admin_id;
  end if;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), admin_id,
    jsonb_build_object('sub', admin_id::text, 'email', 'rhiannekenrama@gmail.com', 'email_verified', true),
    'email', admin_id::text, now(), now(), now()
  ) on conflict (provider, provider_id) do nothing;
end $$;

-- ------------------------------------------------------------
-- PROFILES (all members)
-- ------------------------------------------------------------
insert into profiles (user_id, full_name, email, role, status, committee_id, student_number)
values (
  (select id from auth.users where email = 'rhiannekenrama@gmail.com'),
  'Rhianne Ken S. Rama', 'rhiannekenrama@gmail.com',
  'Administrator', 'Active', null, ''
)
on conflict (email) do update set user_id = excluded.user_id;

insert into profiles (full_name, email, role, status, committee_id, student_number) values
  ('Cherry Ann Catalogo',  'cherryann.catalogo@cbar.local',  'Researcher', 'Active', '33333333-3333-3333-3333-333333333333', ''),
  ('Prince Mercadal',      'prince.mercadal@cbar.local',     'Researcher', 'Active', '11111111-1111-1111-1111-111111111111', ''),
  ('Mariel Caidic',        'mariel.caidic@cbar.local',       'Researcher', 'Active', '11111111-1111-1111-1111-111111111111', ''),
  ('Arvie Bretaña',        'arvie.bretana@cbar.local',       'Researcher', 'Active', '11111111-1111-1111-1111-111111111111', ''),
  ('Alaiza Jane Paraiso',  'alaiza.paraiso@cbar.local',      'Researcher', 'Active', '22222222-2222-2222-2222-222222222222', ''),
  ('Daino Peleño',         'daino.peleno@cbar.local',        'Researcher', 'Active', '22222222-2222-2222-2222-222222222222', ''),
  ('Kelts Abanes',         'kelts.abanes@cbar.local',        'Researcher', 'Active', '22222222-2222-2222-2222-222222222222', ''),
  ('Shayne Campo',         'shayne.campo@cbar.local',        'Researcher', 'Active', '33333333-3333-3333-3333-333333333333', ''),
  ('Geline Bathan',        'geline.bathan@cbar.local',      'Researcher', 'Active', '33333333-3333-3333-3333-333333333333', '')
on conflict (email) do nothing;

-- ------------------------------------------------------------
-- PROJECT (single row — title is editable in the app)
-- ------------------------------------------------------------
insert into project (title, description)
values (
  'Classroom-Based Action Research',
  'Private workspace of the CBAR team. All research sections, tasks, meetings, files and communication live here.'
);

-- ------------------------------------------------------------
-- RESEARCH SECTIONS (25 modules)
-- ------------------------------------------------------------
insert into research_sections (slug, title, group_name, order_index) values
  ('title-page',                 'Title Page',                  'Preliminaries',    1),
  ('approval-sheet',             'Approval Sheet',              'Preliminaries',    2),
  ('acknowledgement',           'Acknowledgement',             'Preliminaries',    3),
  ('abstract',                  'Abstract',                    'Preliminaries',    4),
  ('introduction',              'Introduction',                'Chapter 1',        5),
  ('background-of-the-study',   'Background of the Study',     'Chapter 1',        6),
  ('statement-of-the-problem',  'Statement of the Problem',   'Chapter 1',        7),
  ('proposed-intervention',     'Proposed Intervention',       'Chapter 1',        8),
  ('theoretical-framework',     'Theoretical Framework',       'Chapter 1',        9),
  ('methodology',               'Methodology',                  'Chapter 2',       10),
  ('research-design',           'Research Design',              'Chapter 2',       11),
  ('research-locale',           'Research Locale',              'Chapter 2',       12),
  ('participants',              'Participants',                'Chapter 2',       13),
  ('research-instrument',       'Research Instrument',          'Chapter 2',       14),
  ('data-gathering',            'Data Gathering',               'Chapter 2',       15),
  ('data-analysis',             'Data Analysis',                'Chapter 2',       16),
  ('ethical-considerations',    'Ethical Considerations',       'Chapter 2',       17),
  ('trustworthiness',           'Trustworthiness',              'Chapter 2',       18),
  ('reflexivity',               'Reflexivity',                  'Chapter 2',       19),
  ('presentation-of-results',   'Presentation of Results',      'Chapter 3',       20),
  ('conclusions',               'Conclusions',                  'Chapter 4',        21),
  ('recommendations',           'Recommendations',             'Chapter 4',        22),
  ('references',                'References',                   'Back Matter',     23),
  ('appendices',                'Appendices',                   'Back Matter',     24),
  ('curriculum-vitae',          'Curriculum Vitae',             'Back Matter',     25)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- FILE FOLDERS
-- ------------------------------------------------------------
insert into folders (name, slug) values
  ('Research',           'research'),
  ('Questionnaires',     'questionnaires'),
  ('Consent Forms',      'consent-forms'),
  ('Observation Sheets', 'observation-sheets'),
  ('Statistics',         'statistics'),
  ('PowerPoints',        'powerpoints'),
  ('Pictures',           'pictures'),
  ('Videos',             'videos'),
  ('Appendices',         'appendices'),
  ('Miscellaneous',      'miscellaneous')
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- SAMPLE CONTENT (so the workspace isn't empty on first login)
-- ------------------------------------------------------------

-- Welcome announcement
insert into announcements (author_id, title, body)
values (
  (select id from profiles where email = 'rhiannekenrama@gmail.com'),
  'Welcome to the CBAR Workspace',
  'This is our private workspace. Everything for our Classroom-Based Action Research — drafts, tasks, meetings and files — lives here. Please keep your login credentials private.'
);

-- A first team meeting one week from seeding
insert into meetings (title, agenda, scheduled_at, location, created_by)
values (
  'Team Kick-off Meeting',
  E'1. Overview of the research timeline\n2. Committee assignments\n3. Next deliverables\n4. Open floor',
  now() + interval '7 days',
  'Research Room',
  (select id from profiles where email = 'rhiannekenrama@gmail.com')
);

-- Sample tasks
insert into tasks (title, description, assignee_id, committee_id, created_by, due_date, priority, status, progress, checklist)
values
  (
    'Draft the Statement of the Problem',
    'Write five research questions aligned with the proposed intervention.',
    (select id from profiles where email = 'cherryann.catalogo@cbar.local'),
    '33333333-3333-3333-3333-333333333333',
    (select id from profiles where email = 'rhiannekenrama@gmail.com'),
    current_date + 14, 'High', 'In Progress', 40,
    '[{"text":"Review related literature","done":true},{"text":"Draft research questions","done":false},{"text":"Circulate for comments","done":false}]'::jsonb
  ),
  (
    'Build the Master Spreadsheet',
    'Set up the master spreadsheet with encoding columns for all observation sheets.',
    (select id from profiles where email = 'alaiza.paraiso@cbar.local'),
    '22222222-2222-2222-2222-222222222222',
    (select id from profiles where email = 'rhiannekenrama@gmail.com'),
    current_date + 21, 'Medium', 'To Do', 0,
    '[{"text":"Design column layout","done":false},{"text":"Add validation rules","done":false}]'::jsonb
  ),
  (
    'Prepare QuizSync technical setup',
    'Install and test QuizSync on the lab machines before the intervention week.',
    (select id from profiles where email = 'prince.mercadal@cbar.local'),
    '11111111-1111-1111-1111-111111111111',
    (select id from profiles where email = 'rhiannekenrama@gmail.com'),
    current_date + 10, 'Urgent', 'To Do', 10,
    '[{"text":"Install on 5 machines","done":false},{"text":"Test connectivity","done":false}]'::jsonb
  ),
  (
    'Draft consent and assent letters',
    'Prepare parent consent and student assent forms for the participants.',
    (select id from profiles where email = 'geline.bathan@cbar.local'),
    '33333333-3333-3333-3333-333333333333',
    (select id from profiles where email = 'rhiannekenrama@gmail.com'),
    current_date + 7, 'High', 'To Do', 0,
    '[]'::jsonb
  );

-- Calendar events
insert into calendar_events (title, description, event_type, event_date, event_time, created_by)
values
  (
    'Submission of Chapter 1 draft',
    'Deadline for the consolidated Chapter 1 draft.',
    'Deadline', current_date + 14, '17:00',
    (select id from profiles where email = 'rhiannekenrama@gmail.com')
  ),
  (
    'Consultation with Research Adviser',
    'Bring the drafted Statement of the Problem.',
    'Consultation', current_date + 5, '10:00',
    (select id from profiles where email = 'rhiannekenrama@gmail.com')
  );

-- A couple of progress markers so the dashboard has data
update research_sections set status = 'Draft', progress = 50, updated_at = now()
where slug in ('introduction', 'background-of-the-study');
update research_sections set status = 'Draft', progress = 30, updated_at = now()
where slug = 'presentation-of-results';

-- Welcome message in the general channel
insert into messages (author_id, channel, body)
values (
  (select id from profiles where email = 'rhiannekenrama@gmail.com'),
  'general',
  'Welcome, team! Use this channel for day-to-day coordination. Committee channels and direct messages are also available.'
);
