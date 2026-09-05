# Supabase Setup Guide

Complete these steps once. Total time: ~15 minutes.

---

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, pick an organization, and name it e.g. `cbar-workspace`.
3. Choose a region close to you and a strong database password.
4. Wait for provisioning to finish.

## 2. Run the schema

1. In the Supabase Dashboard, open **SQL Editor**.
2. Open `supabase/schema.sql` from this project, copy **all** of it, paste it into the editor, and click **Run**.
3. Confirm it executes without errors. This creates:
   - All 17 tables (profiles, committees, tasks, research sections, comments, meetings, attendance, folders, files, file versions, notifications, activity logs, calendar events, announcements, messages, project, section versions)
   - Row Level Security policies on every table
   - Two public storage buckets (`files`, `avatars`)
   - Realtime publication for chat, notifications, comments, tasks and more

## 3. Seed the data

1. In the SQL Editor, click **New query**.
2. Open `supabase/seed.sql`, copy **all** of it, paste, and **Run**.
3. This creates:
   - The 3 committees (Technical, Data & Documentation, Coordination)
   - The **first administrator login**:
     - Email: `rhiannekenrama@gmail.com`
     - Password: `CBARAdmin2026!`
   - Profile rows for all 10 team members
   - The 25 research sections
   - 10 file folders
   - Sample tasks, a kick-off meeting, calendar events and a welcome announcement

> **If the auth user seeding fails** (rare, on some Supabase versions): create the user manually in **Authentication → Users → Add user** with the email and a password (auto-confirm it), then re-run `seed.sql` — it will link the profile to your auth user by email.

## 4. Deploy the admin-users Edge Function

The admin's "Create User / Reset Password / Deactivate" actions need the service role, which must never live in the browser. That's what the edge function is for.

**Option A — Supabase CLI (recommended):**

```bash
npm install -g supabase     # if you don't have it
supabase login
# in the project root (folder containing supabase/):
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy admin-users
```

`YOUR_PROJECT_REF` is the `xxxx` part of `https://xxxx.supabase.co`.

**Option B — Dashboard:** clone this repo locally, run `supabase init` + `supabase link` as above, then deploy. (The Dashboard has no paste-to-deploy for functions.)

> The function reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` automatically when deployed via the CLI.

## 5. Get your API keys & configure the app

In **Project Settings → API** you'll find:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Copy the env template and fill them in:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 6. Authentication settings

In **Authentication → Providers**, make sure **Email** is enabled and **Confirm email** is on (edge function already auto-confirms created users).

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (add your production URL when deploying)
- **Redirect URLs:** add `http://localhost:3000/auth/confirm` and later your production equivalent, so the "Forgot password" reset links work.

## 7. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with the administrator account.

## 8. Create accounts for the 9 researchers

Log in as the administrator (`rhiannekenrama@gmail.com`), open **Admin Panel → Users → Create User**, and create each member with their **real email** and a starter password.

The seed created profiles with placeholder emails (`cherryann.catalogo@cbar.local`, etc.). When you create an account with the member's real email, a **new profile** is created and the placeholder remains — you can ignore or delete the placeholders afterwards (Admin Panel → Logs shows actions). Alternatively, to pre-assign committees before creating accounts, just create the users first and set the committee with the dropdown in the Users tab.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| "Invalid login credentials" | Run `seed.sql` again; verify the user exists in Authentication → Users. |
| Admin actions fail with "Failed to fetch" / 404 on functions | The edge function isn't deployed — see step 4. |
| Password reset email never arrives | Check Authentication → URL Configuration (step 6) and the recipient's spam folder. |
| Realtime chat not updating | Confirm `schema.sql` ran fully (realtime publication additions at the end). |
| Upload fails over 50 MB | Expected — the free plan caps uploads at 50 MB per file; the app enforces this limit in the UI. |
