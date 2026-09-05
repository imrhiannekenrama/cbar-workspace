"use client";

import * as React from "react";
import { toast } from "sonner";
import { KeyRound, Mail, Shield, Upload, User2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLog, Profile } from "@/lib/types";
import { useApp } from "@/components/layout/app-provider";
import { logActivity } from "@/lib/activity";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, isUploadTooLarge, MAX_UPLOAD_BYTES, timeAgo } from "@/lib/utils";

export default function ProfilePage() {
  const { profile, committee, refresh } = useApp();
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(true);

  React.useEffect(() => {
    const supabase = createClient();
    supabase
      .from("activity_logs")
      .select("*, user:profiles!activity_logs_user_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        setLogs((data ?? []) as unknown as ActivityLog[]);
        setLoadingLogs(false);
      });
  }, []);

  const uploadAvatar = async (file: File) => {
    if (!profile) return;
    if (isUploadTooLarge(file)) {
      toast.error(`Image too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
      return;
    }
    setUploadingAvatar(true);
    const supabase = createClient();
    const path = `${profile.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) {
      setUploadingAvatar(false);
      toast.error("Avatar upload failed.");
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", profile.id);
    await logActivity({ action: "edit", entityType: "profile", details: { section: "avatar" } });
    setUploadingAvatar(false);
    toast.success("Profile picture updated.");
    refresh();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logActivity({ action: "edit", entityType: "profile", details: { section: "password" } });
    toast.success("Password changed.");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!profile) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const me: Profile = profile;

  return (
    <div>
      <PageHeader title="Profile" description="Your account details and recent activity." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar src={me.avatar_url} name={me.full_name} size="lg" className="mx-auto" />
            <CardTitle className="mt-3">{me.full_name}</CardTitle>
            <CardDescription>{me.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap justify-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-primary">
                {me.role}
              </Badge>
              <Badge variant="secondary">{committee?.name ?? "No committee"}</Badge>
              <Badge variant="outline">{me.status}</Badge>
            </div>

            <div className="space-y-2 border-t pt-4 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {me.email}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <User2 className="h-4 w-4" />
                {me.student_number ? `Student No. ${me.student_number}` : "No student number on file"}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" /> Member since {formatDateTime(me.created_at)}
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              <Upload className="h-4 w-4" />
              {uploadingAvatar ? "Uploading…" : "Change profile picture"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                  e.target.value = "";
                }}
              />
            </label>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-primary" /> Change Password
              </CardTitle>
              <CardDescription>Use at least 6 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pass">New password</Label>
                  <Input
                    id="new-pass"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pass">Confirm new password</Label>
                  <Input
                    id="confirm-pass"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" loading={savingPassword}>
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingLogs ? (
                <Skeleton className="h-32 w-full" />
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{log.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(log.created_at)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
