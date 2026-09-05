"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, ShieldCheck, Users, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function ResetPasswordForm() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated. Redirecting…");
      router.replace("/dashboard");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Update password
      </Button>
    </form>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const isResetMode = searchParams.get("reset") === "1";
  const next = searchParams.get("next");

  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      toast.error(
        error.message === "Invalid login credentials"
          ? "Invalid email or password."
          : error.message
      );
      return;
    }
    await logActivity({ action: "login", entityType: "auth" });
    toast.success("Welcome back!");
    router.replace(next && next.startsWith("/") ? next : "/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Aurora backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="absolute inset-0 -z-10 bg-dots opacity-60" />
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -z-10 h-96 w-[36rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-20 -z-10 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-primary-foreground shadow-lg shadow-primary/30"
          >
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            CBAR <span className="text-gradient">Workspace</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private workspace of the Classroom-Based Action Research team
          </p>
        </div>

        <div className="glass rounded-2xl border p-6 shadow-pop sm:p-8">
          {isResetMode ? (
            <>
              <h2 className="mb-1 text-lg font-semibold">Set a new password</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Choose a new password for your account.
              </p>
              <ResetPasswordForm />
            </>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-semibold">Welcome back</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                This workspace is invite-only — sign in with the account your
                administrator created for you.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/login/forgot"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="remember"
                    checked={remember}
                    onCheckedChange={setRemember}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    Remember me on this device
                  </Label>
                </div>
                <Button type="submit" className="h-11 w-full" loading={loading}>
                  Sign in
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Trust strip */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/70" /> Invite-only
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary/70" /> Team access
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary/70" /> Research-first
          </span>
        </div>
      </div>
    </div>
  );
}

