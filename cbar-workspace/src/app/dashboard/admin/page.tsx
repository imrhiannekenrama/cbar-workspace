"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Database,
  KeyRound,
  ListChecks,
  ScrollText,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLog,
  Committee,
  FileRecord,
  Profile,
  Task,
} from "@/lib/types";
import { useApp } from "@/components/layout/app-provider";
import { logActivity, notifyUser } from "@/lib/activity";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDateTime, toInputDate } from "@/lib/utils";

export default function AdminPage() {
  const searchParams = useSearchParams();
  const { isAdmin, profile } = useApp();
  const [tab, setTab] = React.useState(searchParams.get("tab") ?? "users");
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [committees, setCommittees] = React.useState<Committee[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [files, setFiles] = React.useState<FileRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [resetTarget, setResetTarget] = React.useState<Profile | null>(null);
  const [logFilter, setLogFilter] = React.useState("");
  const [backingUp, setBackingUp] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const [
      { data: memberData },
      { data: committeeData },
      { data: taskData },
      { data: logData },
      { data: fileData },
    ] = await Promise.all([
      supabase.from("profiles").select("*, committee:committees(*)").order("full_name"),
      supabase.from("committees").select("*").order("name"),
      supabase.from("tasks").select("*, assignee:profiles!tasks_assignee_id_fkey(*)").order("created_at", { ascending: false }).limit(20),
      supabase.from("activity_logs").select("*, user:profiles!activity_logs_user_id_fkey(*)").order("created_at", { ascending: false }).limit(100),
      supabase.from("files").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setMembers((memberData ?? []) as unknown as Profile[]);
    setCommittees((committeeData ?? []) as Committee[]);
    setTasks((taskData ?? []) as unknown as Task[]);
    setLogs((logData ?? []) as unknown as ActivityLog[]);
    setFiles((fileData ?? []) as FileRecord[]);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const setUserStatus = async (target: Profile, status: "Active" | "Inactive") => {
    if (!target.user_id) {
      toast.error("This member has no login account yet.");
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "set-status", authUserId: target.user_id, status },
    });
    if (error || (data as { error?: string })?.error) {
      toast.error("Could not update the user status.");
      return;
    }
    await logActivity({
      action: status === "Inactive" ? "deactivate_user" : "activate_user",
      entityType: "user",
      entityId: target.id,
      details: { email: target.email },
    });
    toast.success(`${target.full_name} is now ${status}.`);
    load();
  };

  const assignCommittee = async (target: Profile, committeeId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ committee_id: committeeId || null })
      .eq("id", target.id);
    if (error) {
      toast.error("Could not assign the committee.");
      return;
    }
    await logActivity({
      action: "edit",
      entityType: "user",
      entityId: target.id,
      details: { email: target.email, committeeId },
    });
    toast.success("Committee assigned.");
    load();
  };

  const deleteFile = async (file: FileRecord) => {
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("files").delete().eq("id", file.id);
    await logActivity({
      action: "delete",
      entityType: "file",
      entityId: file.id,
      details: { name: file.name },
    });
    toast.success("File deleted.");
    load();
  };

  const backupDatabase = async () => {
    setBackingUp(true);
    try {
      const supabase = createClient();
      const tables = [
        "committees",
        "profiles",
        "project",
        "research_sections",
        "section_versions",
        "comments",
        "tasks",
        "meetings",
        "meeting_attendance",
        "folders",
        "files",
        "file_versions",
        "notifications",
        "activity_logs",
        "calendar_events",
        "announcements",
        "messages",
      ];
      const backup: Record<string, unknown[]> = {};
      for (const table of tables) {
        const { data } = await supabase.from(table).select("*").limit(10000);
        backup[table] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cbar-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await logActivity({ action: "backup_database", entityType: "system" });
      toast.success("Backup downloaded.");
    } finally {
      setBackingUp(false);
    }
  };

  if (!isAdmin) {
    return (
      <EmptyState
        icon={<Users />}
        title="Administrator access only"
        description="This page is restricted to the workspace administrator."
      />
    );
  }

  const filteredLogs = logFilter
    ? logs.filter((l) => l.action.toLowerCase().includes(logFilter.toLowerCase()))
    : logs;

  return (
    <div>
      <PageHeader
        title="Admin Panel"
        description="Manage users, tasks, files, logs and backups."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> Create User
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="users">
            <Users className="h-3.5 w-3.5" /> Users
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListChecks className="h-3.5 w-3.5" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="h-3.5 w-3.5" /> Backup
          </TabsTrigger>
        </TabsList>

        {/* USERS */}
        <TabsContent value="users">
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Student No.</th>
                  <th className="px-4 py-3">Committee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="px-4 py-3">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  : members.map((m) => (
                      <tr key={m.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                            <div>
                              <p className="font-medium">{m.full_name}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                            {m.role === "Administrator" && (
                              <Badge className="border-primary/20 bg-primary/10 text-primary">
                                Admin
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                          {m.student_number || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            className="h-8 w-44 text-xs"
                            value={m.committee_id ?? ""}
                            onChange={(e) => assignCommittee(m, e.target.value)}
                          >
                            <option value="">No committee</option>
                            {committees.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              "border-0",
                              m.status === "Active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            )}
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => setResetTarget(m)}>
                              <KeyRound className="h-3.5 w-3.5" /> Reset Password
                            </Button>
                            {m.user_id && m.role !== "Administrator" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setUserStatus(m, m.status === "Active" ? "Inactive" : "Active")
                                }
                              >
                                {m.status === "Active" ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Members without a login yet have placeholder emails — create their
            account with “Create User” using the same email to activate them.
          </p>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks">
          {tasks.length === 0 ? (
            <EmptyState icon={<ListChecks />} title="No tasks yet" description="Create tasks from the Task Board." />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Assignee</th>
                    <th className="hidden px-4 py-3 md:table-cell">Due</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{t.title}</td>
                      <td className="hidden px-4 py-3 text-xs sm:table-cell">
                        {t.assignee?.full_name ?? "Unassigned"}
                      </td>
                      <td className="hidden px-4 py-3 text-xs md:table-cell">
                        {t.due_date ? toInputDate(t.due_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files">
          {files.length === 0 ? (
            <EmptyState title="No files" description="Files uploaded by the team appear here." />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="hidden px-4 py-3 md:table-cell">Uploaded</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{f.name}</td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                        {formatDateTime(f.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteFile(f)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs">
          <div className="mb-3 flex items-center gap-2">
            <Input
              placeholder="Filter by action (e.g. upload, login)…"
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : filteredLogs.length === 0 ? (
            <EmptyState title="No log entries" description="Actions will appear here as the team works." />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Entity</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-4 py-3 capitalize">{l.action.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-xs">{l.user?.full_name ?? "System"}</td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                        {l.entity_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(l.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* BACKUP */}
        <TabsContent value="backup">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Download a database backup</h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Exports every table (profiles, research sections, tasks, meetings,
              files, logs and more) as a JSON file you can store safely. Storage
              binaries are not included — download important files separately
              from the Files page.
            </p>
            <Button className="mt-4" loading={backingUp} onClick={backupDatabase}>
              <Database className="h-4 w-4" /> Download Backup
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        committees={committees}
        onCreated={load}
      />
      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
    </div>
  );
}

// ============================================================
// Create User dialog (calls the admin-users Edge Function)
// ============================================================
function CreateUserDialog({
  open,
  onClose,
  committees,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  committees: Committee[];
  onCreated: () => void;
}) {
  const { profile } = useApp();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"Administrator" | "Researcher">("Researcher");
  const [committeeId, setCommitteeId] = React.useState("");
  const [studentNumber, setStudentNumber] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || password.length < 6) {
      toast.error("Fill all fields; password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: {
        action: "create-user",
        email,
        password,
        fullName,
        role,
        committeeId: committeeId || null,
        studentNumber,
      },
    });
    setSaving(false);
    const errMessage =
      error?.message ?? (data as { error?: string } | null)?.error;
    if (errMessage) {
      toast.error(`Could not create user: ${errMessage}`);
      return;
    }
    await logActivity({
      action: "create_user",
      entityType: "user",
      details: { title: fullName, email },
    });
    const { data: createdProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (createdProfile && profile && createdProfile.id !== profile.id) {
      await notifyUser(createdProfile.id, {
        type: "info",
        title: "Welcome to CBAR Workspace!",
        body: "Your account has been created. Please change your password after logging in.",
        link: "/dashboard/profile",
      });
    }
    toast.success(`Account created for ${fullName}.`);
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("Researcher");
    setCommitteeId("");
    setStudentNumber("");
    onCreated();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create User"
      description="Only the administrator can create accounts. There is no public sign-up."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cu-name">Full name</Label>
          <Input id="cu-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-email">Email</Label>
          <Input id="cu-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-pass">Password</Label>
          <Input
            id="cu-pass"
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          <p className="text-xs text-muted-foreground">
            Share this password with the member; they can change it later.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role</Label>
            <Select id="cu-role" value={role} onChange={(e) => setRole(e.target.value as "Administrator" | "Researcher")}>
              <option value="Researcher">Researcher</option>
              <option value="Administrator">Administrator</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-committee">Committee</Label>
            <Select id="cu-committee" value={committeeId} onChange={(e) => setCommitteeId(e.target.value)}>
              <option value="">No committee</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-sn">Student number (optional)</Label>
          <Input id="cu-sn" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={saving}>
          Create Account
        </Button>
      </form>
    </Dialog>
  );
}

// ============================================================
// Reset Password dialog
// ============================================================
function ResetPasswordDialog({
  target,
  onClose,
}: {
  target: Profile | null;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setNewPassword(""), [target]);

  if (!target) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.user_id) {
      toast.error("This member has no login account yet.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "reset-password", authUserId: target.user_id, newPassword },
    });
    setSaving(false);
    const errMessage =
      error?.message ?? (data as { error?: string } | null)?.error;
    if (errMessage) {
      toast.error(`Could not reset password: ${errMessage}`);
      return;
    }
    await logActivity({
      action: "reset_password",
      entityType: "user",
      entityId: target.id,
      details: { email: target.email },
    });
    toast.success(`Password reset for ${target.full_name}.`);
    onClose();
  };

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={`Reset password — ${target.full_name}`}
      description="Set a new temporary password for this member."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rp-pass">New password</Label>
          <Input
            id="rp-pass"
            type="text"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" loading={saving}>
          Reset Password
        </Button>
      </form>
    </Dialog>
  );
}
