# CBAR Workspace

A private, invite-only web application for a Classroom-Based Action Research (CBAR) team. It centralizes the team's research writing, tasks, meetings, files, calendar, chat and announcements in one professional workspace.

**There is no public registration.** Only the administrator can create user accounts.

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** with shadcn-style UI components
- **Supabase** — Auth, PostgreSQL database, Storage, Realtime, Row Level Security
- **Recharts** for statistics, **Sonner** for toasts, **Lucide** icons
- Dark mode / light mode, fully responsive

## Features

| Module | What it does |
|---|---|
| **Login** | Email + password, remember me, forgot password (email reset). No sign-up. |
| **Dashboard** | Project progress, today's tasks, upcoming deadlines, meeting schedule, committee status, recent activity, storage usage, mini calendar, quick actions. |
| **Research** | All 25 sections of the paper, each with a rich text editor, autosave, images, tables, comments with replies/mentions/resolve, and version history with restore. |
| **Tasks** | Kanban board (To Do / In Progress / For Review / Completed) with drag & drop, checklists, priorities, due dates, attachments. Researchers only see their own tasks. |
| **Meetings** | Scheduler with agenda, attendance tracking, minutes editor and attachments. |
| **Chat** | Realtime general channel, group announcements, and private 1-to-1 direct messages. |
| **Files** | Folder-based file manager with drag & drop upload, version history, preview (images/PDF) and download. 50 MB per-file upload limit (Supabase free plan). |
| **Calendar** | Monthly view combining deadlines, meetings and consultations. |
| **Notifications** | Realtime bell with unread badge, mark-as-read, deep links. |
| **Activity Log** | Every login, upload, edit, delete, comment, approval and version restore. |
| **Statistics** | Completion, task status, committee workload, uploads and activity charts. |
| **Search** | Global search (Ctrl/Cmd + K) across research, tasks, files, meetings and members. |
| **Team** | Organizational chart with leader, committees and responsibilities. |
| **Profile** | Avatar, details, password change, personal activity. |
| **Admin Panel** | Create users, reset passwords, deactivate users, assign committees, manage files, view logs, download JSON database backup. |
| **Security** | Supabase Auth + Row Level Security on every table. Admins see everything; researchers see only what they're permitted to. |

## Quick Start

### 1. Prerequisites

- **Node.js 18.18+** (recommended 20+)
- A free [Supabase](https://supabase.com) project

### 2. Configure Supabase

Follow **[SETUP.md](./SETUP.md)** — it walks you through creating the project, running the SQL, deploying the edge function, and seeding the first admin account.

### 3. Install & run

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the login page.

### 4. First login

The seed script creates the first administrator:

- **Email:** `rhiannekenrama@gmail.com`
- **Password:** `CBARAdmin2026!`

> ⚠️ **Change this password immediately** on the Profile page after your first login.

The other 9 members are seeded with placeholder emails. To activate them, the admin creates their real accounts in **Admin Panel → Users → Create User** using their actual email — the profile (name, committee) is linked automatically.

### 5. Deploy to Vercel

1. Push this project to GitHub/GitLab.
2. In [Vercel](https://vercel.com), import the repository.
3. Add the environment variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. In Supabase → Authentication → URL Configuration, add your production URL to the allowed redirect URLs.

## Project Structure

```
cbar-workspace/
├── supabase/
│   ├── schema.sql              # tables, RLS, storage, realtime
│   ├── seed.sql                # committees, members, sections, sample data
│   └── functions/admin-users/  # edge function: create/reset/ban users
├── src/
│   ├── middleware.ts           # auth guard + session refresh
│   ├── app/
│   │   ├── login/              # login + forgot password
│   │   ├── auth/confirm/       # email link handler
│   │   └── dashboard/          # all workspace pages
│   ├── components/
│   │   ├── ui/                 # shadcn-style primitives
│   │   ├── layout/             # sidebar, topbar, providers
│   │   └── research/           # editor, comments, versions
│   ├── lib/                    # supabase clients, types, constants, helpers
│   └── hooks/                  # (shared hooks)
├── .env.example
├── SETUP.md
└── README.md
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript type check |

## Notes & Limitations

- **Uploads are capped at 50 MB per file** to match the Supabase free plan.
- The research project title is editable by the administrator (shown on the dashboard).
- Private chat is enforced at the database level — DM rows are only readable by the two participants.
- The database backup in the Admin Panel exports table data as JSON (not storage binaries).
