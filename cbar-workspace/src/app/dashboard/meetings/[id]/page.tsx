"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, MapPin, Paperclip, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  AttendanceStatus,
  Meeting,
  MeetingAttendance,
  Profile,
} from "@/lib/types";
import { useApp } from "@/components/layout/app-provider";
import { logActivity } from "@/lib/activity";
import { RichTextEditor } from "@/components/research/rich-text-editor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, isUploadTooLarge, MAX_UPLOAD_BYTES } from "@/lib/utils";

const ATTENDANCE_STATUSES: AttendanceStatus[] = ["Present", "Absent", "Late", "Excused"];

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const { isAdmin, profile } = useApp();
  const [meeting, setMeeting] = React.useState<Meeting | null>(null);
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [minutes, setMinutes] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("meetings")
      .select("*, attendance:meeting_attendance(*, profile:profiles!meeting_attendance_profile_id_fkey(*))")
      .eq("id", params.id)
      .single();
    if (data) {
      const m = data as unknown as Meeting;
      setMeeting(m);
      setMinutes(m.minutes_html ?? "");
    }
    const { data: memberData } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "Active")
      .order("full_name");
    setMembers((memberData ?? []) as Profile[]);
    setLoading(false);
  }, [params.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveMinutes = async () => {
    if (!meeting) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("meetings")
      .update({ minutes_html: minutes })
      .eq("id", meeting.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save the minutes.");
      return;
    }
    await logActivity({
      action: "edit",
      entityType: "meeting_minutes",
      entityId: meeting.id,
      details: { title: meeting.title },
    });
    toast.success("Minutes saved.");
  };

  const setAttendance = async (attendanceId: string, status: AttendanceStatus) => {
    const supabase = createClient();
    await supabase
      .from("meeting_attendance")
      .update({ status })
      .eq("id", attendanceId);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <EmptyState
        icon={<CalendarClock />}
        title="Meeting not found"
        action={
          <Link href="/dashboard/meetings">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" /> Back to Meetings
            </Button>
          </Link>
        }
      />
    );
  }

  const attendanceRows = meeting.attendance ?? [];

  return (
    <div>
      <PageHeader
        title={meeting.title}
        description={`${formatDateTime(meeting.scheduled_at)}${meeting.location ? ` · ${meeting.location}` : ""}`}
        actions={
          <Link href="/dashboard/meetings">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" /> Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meeting.agenda ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {meeting.agenda}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No agenda set.</p>
              )}
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Minutes of the Meeting</h2>
              <Button size="sm" onClick={saveMinutes} loading={saving}>
                Save Minutes
              </Button>
            </div>
            <RichTextEditor
              value={minutes}
              onChange={setMinutes}
              minHeight={280}
              placeholder="Record what was discussed and agreed…"
            />
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attendanceRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Attendance will be recorded here.
                </p>
              ) : (
                attendanceRows
                  .slice()
                  .sort((a, b) =>
                    (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "")
                  )
                  .map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          src={row.profile?.avatar_url}
                          name={row.profile?.full_name ?? "?"}
                          size="sm"
                        />
                        <span className="truncate text-sm">
                          {row.profile?.full_name ?? "Unknown"}
                        </span>
                      </div>
                      {isAdmin ? (
                        <Select
                          className="h-8 w-28 text-xs"
                          value={row.status}
                          onChange={(e) =>
                            setAttendance(row.id, e.target.value as AttendanceStatus)
                          }
                        >
                          {ATTENDANCE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {row.status}
                        </span>
                      )}
                    </div>
                  ))
              )}
              {!isAdmin && profile && (
                <p className="pt-1 text-xs text-muted-foreground">
                  Attendance is recorded by the administrator.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4 text-primary" /> Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MeetingAttachments meetingId={meeting.id} isAdmin={isAdmin} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MeetingAttachments({
  meetingId,
  isAdmin,
}: {
  meetingId: string;
  isAdmin: boolean;
}) {
  const [attachments, setAttachments] = React.useState<
    { name: string; url: string }[]
  >([]);

  const upload = async (file: File) => {
    if (isUploadTooLarge(file)) {
      toast.error(`File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
      return;
    }
    const supabase = createClient();
    const path = `meetings/${meetingId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("files").upload(path, file);
    if (error) {
      toast.error("Upload failed.");
      return;
    }
    const { data } = supabase.storage.from("files").getPublicUrl(path);
    setAttachments((prev) => [...prev, { name: file.name, url: data.publicUrl }]);
    await logActivity({
      action: "upload",
      entityType: "meeting",
      entityId: meetingId,
      details: { name: file.name },
    });
    toast.success("File uploaded.");
  };

  return (
    <div className="space-y-3">
      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <Upload className="mb-1 h-5 w-5" />
        Click to attach a file
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(upload);
            e.target.value = "";
          }}
        />
      </label>
      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((a, i) => (
            <li key={i}>
              <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                📎 {a.name}
              </a>
            </li>
          ))}
        </ul>
      )}
      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Uploaded attachments appear here for everyone in the meeting.
        </p>
      )}
    </div>
  );
}
