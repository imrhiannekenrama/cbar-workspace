"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent, EventType, Meeting, Task } from "@/lib/types";
import { useApp } from "@/components/layout/app-provider";
import { logActivity } from "@/lib/activity";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { cn, formatDateTime } from "@/lib/utils";

const EVENT_STYLES: Record<EventType, string> = {
  Deadline: "bg-red-500",
  Meeting: "bg-blue-500",
  Consultation: "bg-amber-500",
};

interface DayEvent {
  id: string;
  title: string;
  type: EventType;
  date: Date;
  detail: string;
  link?: string;
}

export default function CalendarPage() {
  const { isAdmin } = useApp();
  const [month, setMonth] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const [{ data: eventData }, { data: meetingData }, { data: taskData }] =
      await Promise.all([
        supabase.from("calendar_events").select("*").order("event_date"),
        supabase.from("meetings").select("*").order("scheduled_at"),
        supabase.from("tasks").select("*").order("due_date"),
      ]);
    setEvents((eventData ?? []) as CalendarEvent[]);
    setMeetings((meetingData ?? []) as Meeting[]);
    setTasks((taskData ?? []) as Task[]);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const dayEvents = React.useMemo(() => {
    const all: DayEvent[] = [];
    events.forEach((e) =>
      all.push({
        id: `event-${e.id}`,
        title: e.title,
        type: e.event_type,
        date: new Date(`${e.event_date}T${e.event_time ?? "00:00:00"}`),
        detail: e.description ?? "",
      })
    );
    meetings.forEach((m) =>
      all.push({
        id: `meeting-${m.id}`,
        title: m.title,
        type: "Meeting",
        date: new Date(m.scheduled_at),
        detail: m.location ?? "",
        link: `/dashboard/meetings/${m.id}`,
      })
    );
    tasks.forEach((t) => {
      if (!t.due_date) return;
      all.push({
        id: `task-${t.id}`,
        title: `Due: ${t.title}`,
        type: "Deadline",
        date: new Date(`${t.due_date}T23:59:00`),
        detail: t.description ?? "",
      });
    });
    return all;
  }, [events, meetings, tasks]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  const eventsForDay = (day: Date) =>
    dayEvents.filter((e) => isSameDay(e.date, day));

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Deadlines, meetings and consultations in one place."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Event
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {format(month, "MMMM yyyy")}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth(subMonths(month, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dayList = eventsForDay(day);
                  const inMonth = isSameMonth(day, month);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "min-h-20 rounded-md border p-1 text-left transition-colors hover:border-primary/50 hover:bg-accent/50",
                        !inMonth && "opacity-40",
                        isToday(day) && "border-primary bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isToday(day) && "text-primary"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayList.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-1 truncate text-[10px] text-muted-foreground"
                          >
                            <span
                              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", EVENT_STYLES[e.type])}
                            />
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}
                        {dayList.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayList.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {selectedDay
              ? format(selectedDay, "EEEE, MMMM d")
              : "Select a day"}
          </h3>
          {!selectedDay ? (
            <p className="text-sm text-muted-foreground">
              Click any day to see its deadlines, meetings and consultations.
            </p>
          ) : eventsForDay(selectedDay).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled for this day.
            </p>
          ) : (
            <div className="space-y-2">
              {eventsForDay(selectedDay).map((e) => (
                <a
                  key={e.id}
                  href={e.link ?? "#"}
                  className={cn(
                    "block rounded-lg border p-3 transition-colors",
                    e.link ? "hover:border-primary/40" : "pointer-events-none"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", EVENT_STYLES[e.type])} />
                    <span className="text-sm font-medium">{e.title}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(e.date.toISOString())}
                    {e.detail ? ` · ${e.detail}` : ""}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateEventDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </div>
  );
}

function CreateEventDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { profile } = useApp();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<EventType>("Deadline");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("calendar_events").insert({
      title,
      description,
      event_type: type,
      event_date: date,
      event_time: time || null,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not create the event.");
      return;
    }
    await logActivity({
      action: "create_event",
      entityType: "calendar_event",
      details: { title, type, date },
    });
    toast.success("Event created.");
    setTitle("");
    setDescription("");
    setType("Deadline");
    setDate("");
    setTime("");
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="New Calendar Event">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="e-title">Title</Label>
          <Input id="e-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-type">Type</Label>
            <Select id="e-type" value={type} onChange={(e) => setType(e.target.value as EventType)}>
              <option>Deadline</option>
              <option>Meeting</option>
              <option>Consultation</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-date">Date</Label>
            <Input id="e-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-time">Time (optional)</Label>
          <Input id="e-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-desc">Description</Label>
          <Textarea id="e-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" loading={saving}>
          Create Event
        </Button>
      </form>
    </Dialog>
  );
}
