"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLog,
  Committee,
  FileRecord,
  ResearchSection,
  Task,
} from "@/lib/types";
import { SECTION_GROUPS, TASK_STATUSES } from "@/lib/constants";
import { useApp } from "@/components/layout/app-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS = ["#94a3b8", "#3b82f6", "#f59e0b", "#10b981"];

function useChartTheme() {
  const [theme, setTheme] = React.useState({ axis: "#94a3b8", grid: "#e2e8f0" });
  React.useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme({
        axis: isDark ? "#64748b" : "#94a3b8",
        grid: isDark ? "#1e293b" : "#e2e8f0",
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export default function StatisticsPage() {
  const { isAdmin } = useApp();
  const [sections, setSections] = React.useState<ResearchSection[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [files, setFiles] = React.useState<FileRecord[]>([]);
  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [committees, setCommittees] = React.useState<Committee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { axis, grid } = useChartTheme();

  React.useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: sectionData },
        { data: taskData },
        { data: fileData },
        { data: logData },
        { data: committeeData },
      ] = await Promise.all([
        supabase.from("research_sections").select("*"),
        supabase.from("tasks").select("*, committee:committees(*)"),
        supabase.from("files").select("*").order("created_at"),
        supabase
          .from("activity_logs")
          .select("created_at")
          .order("created_at", { ascending: true })
          .limit(500),
        supabase.from("committees").select("*"),
      ]);
      setSections((sectionData ?? []) as ResearchSection[]);
      setTasks((taskData ?? []) as unknown as Task[]);
      setFiles((fileData ?? []) as FileRecord[]);
      setLogs((logData ?? []) as ActivityLog[]);
      setCommittees((committeeData ?? []) as Committee[]);
      setLoading(false);
    }
    load();
  }, []);

  const completionData = SECTION_GROUPS.map((group) => {
    const groupSections = sections.filter((s) => s.group_name === group);
    return {
      name: group,
      completion:
        groupSections.length > 0
          ? Math.round(
              groupSections.reduce((acc, s) => acc + s.progress, 0) /
                groupSections.length
            )
          : 0,
    };
  });

  const taskStatusData = TASK_STATUSES.map((status) => ({
    name: status,
    value: tasks.filter((t) => t.status === status).length,
  })).filter((d) => d.value > 0);

  const committeeWorkload = committees.map((c) => ({
    name: c.name.replace(" Committee", "").replace("Data and Documentation", "Data & Docs"),
    tasks: tasks.filter((t) => t.committee_id === c.id).length,
  }));

  // uploads per week (last 8 weeks)
  const uploadsData = React.useMemo(() => {
    const weeks: { name: string; uploads: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7 - 6);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const uploads = files.filter((f) => {
        const d = new Date(f.created_at);
        return d >= start && d <= end;
      }).length;
      weeks.push({ name: `W${8 - i}`, uploads });
    }
    return weeks;
  }, [files]);

  // activity per week
  const activityData = React.useMemo(() => {
    const weeks: { name: string; activity: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7 - 6);
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const count = logs.filter((l) => {
        const d = new Date(l.created_at);
        return d >= start && d <= end;
      }).length;
      weeks.push({ name: `W${8 - i}`, activity: count });
    }
    return weeks;
  }, [logs]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Statistics"
        description={
          isAdmin
            ? "Completion, workload, uploads and activity across the workspace."
            : "Your view of workspace statistics."
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Research Completion</CardTitle>
            <CardDescription>Average progress per chapter group (%)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid",
                    background: "var(--tooltip-bg, #fff)",
                  }}
                />
                <Bar dataKey="completion" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Status</CardTitle>
            <CardDescription>Distribution of tasks by status</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {taskStatusData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No tasks yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {taskStatusData.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Committee Workload</CardTitle>
            <CardDescription>Number of tasks per committee</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={committeeWorkload} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#1d4ed8" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Uploads</CardTitle>
            <CardDescription>Files uploaded per week (last 8 weeks)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={uploadsData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="uploads" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team Activity</CardTitle>
            <CardDescription>
              Logged actions per week{isAdmin ? " (all members)" : " (your actions)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="activity" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
