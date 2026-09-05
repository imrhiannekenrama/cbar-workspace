"use client";

import * as React from "react";
import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
} from "date-fns";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Files,
  HardDrive,
  ListChecks,
  Megaphone,
  Plus,
  Presentation,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLog,
  CalendarEvent,
  Committee,
  FileRecord,
  Meeting,
  Profile,
  Project,
  ResearchSection,
  Task,
} from "@/lib/types";
import { SECTION_GROUPS } from "@/lib/constants";
import { useApp } from "@/components/layout/app-provider";
import { cn, formatBytes, formatDate, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";

export default function DashboardPage() {
  const { profile, isAdmin } = useApp();
  const [project, setProject] = React.useState<Project | null>(null);
  const [sections, setSections] = React.useState<ResearchSection[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [files, setFiles] = React.useState<FileRecord[]>([]);
  const [committees, setCommittees] = React.useState<Committee[]>([]);
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: projectData },
        { data: sectionData },
        { data: taskData },
        { data: meetingData },
        { data: eventData },
        { data: logData },
        { data: fileData },
        { data: committeeData },
        { data: memberData },
      ] = await Promise.all([
        supabase.from("project").select("*").limit(1).maybeSingle(),
        supabase.from("research_sections").select("*").order("order_index"),
        supabase
          .from("tasks")
          .select("*, assignee:profiles!tasks_assignee_id_fkey(*), committee:committees(*)")
          .order("due_date", { ascending: false }),
        supabase.from("meetings").select("*").order("scheduled_at"),
        supabase.from("calendar_events").select("*").order("event_date"),
        supabase
          .from("activity_logs")
          .select("*, user:profiles!activity_logs_user_id_fkey(*)")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("files").select("*"),
        supabase.from("committees").select("*"),
        supabase.from("profiles").select("*").eq("status", "Active"),
      ]);
      setProject((projectData ?? null) as Project | null);
      setSections((sectionData ?? []) as ResearchSection[]);
      setTasks((taskData ?? []) as unknown as Task[]);
      setMeetings((meetingData ?? []) as Meeting[]);
      setEvents((eventData ?? []) as CalendarEvent[]);
      setLogs((logData ?? []) as unknown as ActivityLog[]);
      setFiles((fileData ?? []) as FileRecord[]);
      setCommittees((committeeData ?? []) as Committee[]);
      setMembers((memberData ?? []) as Profile[]);
      setLoading(false);
    }
    load();
  }, []);

  // ---- derived data ----
  const overallProgress =
    sections.length > 0
      ? Math.round(
          sections.reduce((acc, s) => acc + s.progress, 0) / sections.length
        )
      : 0;

  const groupProgress = SECTION_GROUPS.map((group) => {
    const groupSections = sections.filter((s) => s.group_name === group);
    return {
      group,
      progress:
        groupSections.length > 0
          ? Math.round(
              groupSections.reduce((acc, s) => acc + s.progress, 0) /
                groupSections.length
            )
          : 0,
    };
  });

  const today = new Date();
  const todaysTasks = tasks.filter(
    (t) =>
      (t.due_date && isSameDay(new Date(t.due_date), today)) ||
      t.status === "In Progress"
  );

  const upcomingDeadlines = [
    ...tasks
      .filter((t) => t.due_date && new Date(t.due_date) >= today)
      .map((t) => ({ id: t.id, title: t.title, date: t.due_date!, type: "Task" })),
    ...events
      .filter((e) => new Date(e.event_date) >= today)
      .map((e) => ({ id: e.id, title: e.title, date: e.event_date, type: e.event_type })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const upcomingMeetings = meetings
    .filter((m) => new Date(m.scheduled_at) >= today)
    .slice(0, 3);

  const storageUsed = files.reduce((acc, f) => acc + f.size_bytes, 0);

  const committeeStatus = committees.map((c) => {
    const cTasks = tasks.filter((t) => t.committee_id === c.id);
    return {
      committee: c,
      total: cTasks.length,
      completed: cTasks.filter((t) => t.status === "Completed").length,
    };
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${profile?.full_name.split(" ")[0]} 👋`}
        description={project?.title ?? "Classroom-Based Action Research"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/tasks">
              <Button size="sm" variant="outline">
                <ClipboardList className="h-4 w-4" /> Tasks
              </Button>
            </Link>
            <Link href="/dashboard/files">
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </Link>
            {isAdmin && (
              <>
                <Link href="/dashboard/meetings">
                  <Button size="sm" variant="outline">
                    <Presentation className="h-4 w-4" /> Meeting
                  </Button>
                </Link>
                <Link href="/dashboard/chat">
                  <Button size="sm" variant="outline">
                    <Megaphone className="h-4 w-4" /> Announce
                  </Button>
                </Link>
                <Link href="/dashboard/tasks">
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> New Task
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={<FileText className="h-4 w-4" />}
          label="Overall Progress"
          value={`${overallProgress}%`}
          sub={`${sections.filter((s) => s.status === "Completed").length}/${sections.length} sections completed`}
        />
        <StatTile
          icon={<ListChecks className="h-4 w-4" />}
          label="Open Tasks"
          value={String(tasks.filter((t) => t.status !== "Completed").length)}
          sub={`${tasks.filter((t) => t.status === "Completed").length} completed`}
        />
        <StatTile
          icon={<Files className="h-4 w-4" />}
          label="Files Uploaded"
          value={String(files.length)}
          sub={`${members.length} active members`}
        />
        <StatTile
          icon={<HardDrive className="h-4 w-4" />}
          label="Storage Used"
          value={formatBytes(storageUsed)}
          sub="Supabase Storage"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Project progress */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Project Progress</CardTitle>
              <CardDescription>
                {project?.title ?? "Research project"} — computed from all sections
              </CardDescription>
            </div>
            <Link href="/dashboard/statistics">
              <Button variant="ghost" size="sm">
                <BarChart3 className="h-4 w-4" /> Statistics
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall</span>
              <span className="text-muted-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2.5" />
            <div className="grid gap-3 sm:grid-cols-2">
              {groupProgress.map((g) => (
                <div key={g.group}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{g.group}</span>
                    <span className="font-medium">{g.progress}%</span>
                  </div>
                  <Progress value={g.progress} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s Tasks</CardTitle>
            <CardDescription>Due today or in progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing due today — great job! 🎉
              </p>
            ) : (
              todaysTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-2 rounded-lg border bg-background p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.assignee?.full_name ?? "Unassigned"}
                      {task.due_date ? ` · due ${formatDate(task.due_date)}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      task.status === "Completed" &&
                        "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    )}
                  >
                    {task.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" /> Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            ) : (
              upcomingDeadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{d.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(d.date)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Meeting schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Presentation className="h-4 w-4 text-primary" /> Meeting Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings scheduled.</p>
            ) : (
              upcomingMeetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/dashboard/meetings/${m.id}`}
                  className="block rounded-lg border bg-background p-2.5 transition-colors hover:border-primary/40"
                >
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.scheduled_at).toLocaleString("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {m.location ? ` · ${m.location}` : ""}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Committee status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Committee Status</CardTitle>
            <CardDescription>Tasks per committee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {committeeStatus.map((c) => (
              <div key={c.committee.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.committee.name}</span>
                  <span className="font-medium">
                    {c.completed}/{c.total} done
                  </span>
                </div>
                <Progress
                  value={c.total > 0 ? (c.completed / c.total) * 100 : 0}
                  className="h-1.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mini calendar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {format(today, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="text-muted-foreground">
                  {d}
                </span>
              ))}
              {eachDayOfInterval({
                start: startOfMonth(today),
                end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
              }).map((day) => {
                const hasEvent = events.some(
                  (e) => e.event_date === format(day, "yyyy-MM-dd")
                );
                const hasMeeting = meetings.some((m) => isSameDay(new Date(m.scheduled_at), day));
                const hasTaskDue = tasks.some((t) => t.due_date === format(day, "yyyy-MM-dd"));
                return (
                  <span
                    key={day.toISOString()}
                    className={cn(
                      "relative mx-auto flex h-7 w-7 items-center justify-center rounded-full",
                      isToday(day) && "bg-primary font-semibold text-primary-foreground"
                    )}
                  >
                    {getDate(day)}
                    {(hasEvent || hasMeeting || hasTaskDue) && (
                      <span className="absolute mt-4 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
            {isAdmin && (
              <Link href="/dashboard/admin?tab=logs">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <Avatar
                    src={log.user?.avatar_url}
                    name={log.user?.full_name ?? "User"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {log.user?.full_name ?? "Someone"}
                      </span>{" "}
                      {describeLog(log)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(log.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="animate-fade-in-up">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <div className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function describeLog(log: ActivityLog): string {
  const details = (log.details ?? {}) as Record<string, unknown>;
  const target =
    typeof details.title === "string"
      ? details.title
      : typeof details.name === "string"
        ? details.name
        : "";
  switch (log.action) {
    case "login":
      return "signed in";
    case "upload":
      return `uploaded ${target || "a file"}`;
    case "delete":
      return `deleted ${target || "an item"}`;
    case "edit":
      return `edited ${target || "content"}`;
    case "comment":
      return "added a comment";
    case "approve":
      return `approved ${target || "an item"}`;
    case "restore_version":
      return `restored a version of ${target || "a section"}`;
    case "create_task":
      return `created a task${target ? `: ${target}` : ""}`;
    case "move_task":
      return `moved a task to ${String(details.status ?? "a new status")}`;
    case "complete_task":
      return `completed a task${target ? `: ${target}` : ""}`;
    case "create_meeting":
      return `scheduled a meeting${target ? `: ${target}` : ""}`;
    case "announce":
      return `published an announcement${target ? `: ${target}` : ""}`;
    case "create_event":
      return "added a calendar event";
    case "create_user":
      return `created a user account for ${target}`;
    case "reset_password":
      return "reset a member's password";
    case "save_version":
      return `saved a version of ${target || "a section"}`;
    default:
      return log.action.replace(/_/g, " ");
  }
}
