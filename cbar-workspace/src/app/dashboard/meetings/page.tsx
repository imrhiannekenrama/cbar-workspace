"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, MapPin, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Meeting, Profile } from "@/lib/types";
import { useApp } from "@/components/layout/app-provider";
import { logActivity, notifyAll } from "@/lib/activity";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export default function MeetingsPage() {
  const { isAdmin } = useApp();
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("meetings")
      .select("*, attendance:meeting_attendance(*)")
      .order("scheduled_at", { ascending: false });
    setMeetings((data ?? []) as unknown as Meeting[]);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const upcoming = meetings.filter(
    (m) => new Date(m.scheduled_at).getTime() >= Date.now()
  );
  const past = meetings.filter(
    (m) => new Date(m.scheduled_at).getTime() < Date.now()
  );

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Schedule team meetings, record attendance and minutes."
        actions={
          isAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Schedule Meeting
            </Button>
          )
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="No meetings scheduled"
          description={
            isAdmin
              ? "Schedule your first team meeting."
              : "The administrator will schedule meetings here."
          }
        />
      ) : (
        <div className="space-y-8">
          <Section title="Upcoming" meetings={upcoming} />
          <Section title="Past meetings" meetings={past} />
        </div>
      )}

      <CreateMeetingDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </div>
  );
}

function Section({ title, meetings }: { title: string; meetings: Meeting[] }) {
  if (meetings.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {meetings.map((meeting) => (
          <Link key={meeting.id} href={`/dashboard/meetings/${meeting.id}`}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{meeting.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(meeting.scheduled_at)}
                </p>
                {meeting.location && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {meeting.location}
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {meeting.attendance?.length ?? 0} attendance records
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CreateMeetingDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [agenda, setAgenda] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledAt) return;
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { data: me } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userData.user?.id ?? "")
      .single();

    const { data: created, error } = await supabase
      .from("meetings")
      .insert({
        title,
        agenda,
        scheduled_at: new Date(scheduledAt).toISOString(),
        location,
        created_by: me?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !created) {
      setSaving(false);
      toast.error("Could not schedule the meeting.");
      return;
    }

    // Seed attendance rows for every active member
    const { data: members } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "Active");
    if (members) {
      await supabase.from("meeting_attendance").insert(
        (members as { id: string }[]).map((m) => ({
          meeting_id: created.id,
          profile_id: m.id,
          status: "Present",
        }))
      );
      await notifyAll(
        members,
        me?.id ?? null,
        {
          type: "meeting",
          title: "New meeting scheduled",
          body: `${title} — ${formatDateTime(new Date(scheduledAt).toISOString())}`,
          link: `/dashboard/meetings/${created.id}`,
        }
      );
    }

    await logActivity({
      action: "create_meeting",
      entityType: "meeting",
      entityId: created.id,
      details: { title },
    });

    setSaving(false);
    toast.success("Meeting scheduled.");
    setTitle("");
    setAgenda("");
    setScheduledAt("");
    setLocation("");
    onCreated();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Schedule a Meeting">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="m-title">Title</Label>
          <Input id="m-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly progress meeting" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-agenda">Agenda</Label>
          <Textarea id="m-agenda" rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder={"1. Item\n2. Item"} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="m-when">Date &amp; time</Label>
            <Input id="m-when" type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-where">Location</Label>
            <Input id="m-where" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Research Room" />
          </div>
        </div>
        <Button type="submit" className="w-full" loading={saving}>
          Schedule Meeting
        </Button>
      </form>
    </Dialog>
  );
}
