"use client";

import * as React from "react";
import { toast } from "sonner";
import { Calendar, ListChecks, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  ChecklistItem,
  Committee,
  Profile,
  Task,
  TaskAttachment,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";
import { PRIORITY_STYLES, TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_STYLES } from "@/lib/constants";
import { useApp } from "@/components/layout/app-provider";
import { logActivity, notifyUser } from "@/lib/activity";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, isUploadTooLarge, MAX_UPLOAD_BYTES } from "@/lib/utils";

const COLUMN_STYLES: Record<TaskStatus, string> = {
  "To Do": "border-t-slate-400",
  "In Progress": "border-t-blue-500",
  "For Review": "border-t-amber-500",
  Completed: "border-t-emerald-500",
};

export default function TasksPage() {
  const { profile, isAdmin } = useApp();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [committees, setCommittees] = React.useState<Committee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Task | null>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<TaskStatus | null>(null);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*), committee:committees(*)")
      .order("created_at", { ascending: false });
    const { data } = await query;
    setTasks((data ?? []) as unknown as Task[]);
    setLoading(false);
  }, [isAdmin]);

  React.useEffect(() => {
    load();
    const supabase = createClient();
    supabase.from("profiles").select("*, committee:committees(*)").eq("status", "Active")
      .order("full_name").then(({ data }) => setMembers((data ?? []) as unknown as Profile[]));
    supabase.from("committees").select("*").order("name").then(({ data }) => setCommittees((data ?? []) as Committee[]));

    const channel = supabase
      .channel("tasks-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const moveTask = async (taskId: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status, progress: status === "Completed" ? 100 : t.progress }
          : t
      )
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({
        status,
        progress: status === "Completed" ? 100 : task.progress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    if (error) {
      toast.error("Could not move the task.");
      load();
      return;
    }
    await logActivity({
      action: status === "Completed" ? "complete_task" : "move_task",
      entityType: "task",
      entityId: taskId,
      details: { title: task.title, status },
    });
  };

  return (
    <div>
      <PageHeader
        title="Task Board"
        description={
          isAdmin
            ? "Create, assign and track the team's tasks."
            : "Tasks assigned to you."
        }
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Task
            </Button>
          )
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((status) => {
            const columnTasks = tasks.filter((t) => t.status === status);
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(status);
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={() => {
                  if (dragging) moveTask(dragging, status);
                  setDragging(null);
                  setDropTarget(null);
                }}
                className={cn(
                  "rounded-xl border border-t-4 bg-muted/30 p-3 transition-colors",
                  COLUMN_STYLES[status],
                  dropTarget === status && "bg-primary/5 ring-2 ring-primary/30"
                )}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold">{status}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {columnTasks.length === 0 ? (
                    <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                      Drop tasks here
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDragging(task.id)}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => setDetail(task)}
                        className={cn(
                          "cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                          dragging === task.id && "opacity-40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">
                            {task.title}
                          </p>
                          <Badge className={cn("shrink-0 border-0", PRIORITY_STYLES[task.priority])}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.assignee && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {task.assignee.full_name}
                          </p>
                        )}
                        {task.due_date && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" /> {formatDate(task.due_date)}
                          </p>
                        )}
                        {task.progress > 0 && (
                          <Progress value={task.progress} className="mt-2 h-1" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
        members={members}
        committees={committees}
      />

      <TaskDetailDialog
        task={detail}
        members={members}
        onClose={() => setDetail(null)}
        onChanged={load}
        isAdmin={isAdmin}
        currentUserId={profile?.id ?? ""}
      />
    </div>
  );
}

// ============================================================
// Create Task dialog
// ============================================================
function CreateTaskDialog({
  open,
  onClose,
  onCreated,
  members,
  committees,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  members: Profile[];
  committees: Committee[];
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [committeeId, setCommitteeId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("Medium");
  const [attachments, setAttachments] = React.useState<TaskAttachment[]>([]);
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);
  const [checklistDraft, setChecklistDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const uploadAttachment = async (file: File) => {
    if (isUploadTooLarge(file)) {
      toast.error(`File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
      return;
    }
    const supabase = createClient();
    const path = `task-attachments/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("files").upload(path, file);
    if (error) {
      toast.error("Attachment upload failed.");
      return;
    }
    const { data } = supabase.storage.from("files").getPublicUrl(path);
    setAttachments((prev) => [...prev, { name: file.name, url: data.publicUrl }]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { data: me } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userData.user?.id ?? "")
      .single();

    const { data: created, error } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description,
        assignee_id: assigneeId || null,
        committee_id: committeeId || null,
        created_by: me?.id ?? null,
        due_date: dueDate || null,
        priority,
        status: "To Do",
        progress: 0,
        checklist,
        attachments,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      toast.error("Could not create the task.");
      return;
    }
    await logActivity({
      action: "create_task",
      entityType: "task",
      entityId: created.id,
      details: { title: title.trim() },
    });
    if (assigneeId) {
      await notifyUser(assigneeId, {
        type: "task",
        title: "New task assigned to you",
        body: title.trim(),
        link: "/dashboard/tasks",
      });
    }
    toast.success("Task created.");
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setCommitteeId("");
    setDueDate("");
    setPriority("Medium");
    setAttachments([]);
    setChecklist([]);
    setChecklistDraft("");
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Task" description="Assign work to a teammate or committee.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-title">Title</Label>
          <Input id="task-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Encode Week 3 observation sheets" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-desc">Description</Label>
          <Textarea id="task-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-assignee">Assignee</Label>
            <Select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-committee">Committee</Label>
            <Select id="task-committee" value={committeeId} onChange={(e) => setCommitteeId(e.target.value)}>
              <option value="">None</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Checklist</Label>
          <div className="space-y-1">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border px-2 py-1 text-sm">
                <span>{item.text}</span>
                <button type="button" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={checklistDraft}
              onChange={(e) => setChecklistDraft(e.target.value)}
              placeholder="Add a checklist item…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && checklistDraft.trim()) {
                  e.preventDefault();
                  setChecklist([...checklist, { text: checklistDraft.trim(), done: false }]);
                  setChecklistDraft("");
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (checklistDraft.trim()) {
                  setChecklist([...checklist, { text: checklistDraft.trim(), done: false }]);
                  setChecklistDraft("");
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Attachments</Label>
          <input
            type="file"
            multiple
            className="w-full text-sm"
            onChange={(e) => {
              Array.from(e.target.files ?? []).forEach(uploadAttachment);
              e.target.value = "";
            }}
          />
          {attachments.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {attachments.map((a, i) => (
                <li key={i}>📎 {a.name}</li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" className="w-full" loading={saving}>
          Create Task
        </Button>
      </form>
    </Dialog>
  );
}

// ============================================================
// Task detail dialog (checklist + progress)
// ============================================================
function TaskDetailDialog({
  task,
  onClose,
  onChanged,
  isAdmin,
  currentUserId,
  members,
}: {
  task: Task | null;
  onClose: () => void;
  onChanged: () => void;
  isAdmin: boolean;
  currentUserId: string;
  members: Profile[];
}) {
  const [progress, setProgress] = React.useState(task?.progress ?? 0);
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);

  React.useEffect(() => {
    setProgress(task?.progress ?? 0);
    setChecklist(task?.checklist ?? []);
  }, [task]);

  const save = async (updates: Partial<Task>) => {
    if (!task) return;
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", task.id);
    await logActivity({
      action: "update_task",
      entityType: "task",
      entityId: task.id,
      details: { title: task.title },
    });
    onChanged();
  };

  const toggleChecklistItem = async (index: number) => {
    const next = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    setChecklist(next);
    const doneCount = next.filter((i) => i.done).length;
    const autoProgress = next.length > 0 ? Math.round((doneCount / next.length) * 100) : progress;
    setProgress(autoProgress);
    await save({ checklist: next, progress: autoProgress });
  };

  const canEdit = isAdmin || task?.assignee_id === currentUserId;

  if (!task) return null;
  const assignee = members.find((m) => m.id === task.assignee_id);

  return (
    <Dialog open={!!task} onClose={onClose} title={task.title} className="max-w-xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("border-0", PRIORITY_STYLES[task.priority])}>{task.priority}</Badge>
          <Badge className={cn("border-0", TASK_STATUS_STYLES[task.status])}>{task.status}</Badge>
          {task.committee && <Badge className="border-border">{task.committee.name}</Badge>}
          {task.due_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" /> Due {formatDate(task.due_date)}
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}

        {assignee && (
          <p className="text-sm">
            <span className="text-muted-foreground">Assigned to</span>{" "}
            <span className="font-medium">{assignee.full_name}</span>
          </p>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <Label>Progress</Label>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
          {canEdit && (
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={() => save({ progress })}
              onTouchEnd={() => save({ progress })}
              className="mt-2 w-full accent-primary"
              aria-label="Progress"
            />
          )}
        </div>

        {checklist.length > 0 && (
          <div>
            <Label className="mb-2 flex items-center gap-1.5">
              <ListChecks className="h-4 w-4" /> Checklist
            </Label>
            <div className="space-y-1.5">
              {checklist.map((item, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!canEdit}
                    onChange={() => toggleChecklistItem(i)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className={cn(item.done && "text-muted-foreground line-through")}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {task.attachments.length > 0 && (
          <div>
            <Label className="mb-2">Attachments</Label>
            <ul className="space-y-1">
              {task.attachments.map((a, i) => (
                <li key={i}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    📎 {a.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
