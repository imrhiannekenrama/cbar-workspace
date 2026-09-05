"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">CBAR Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private workspace of the Classroom-Based Action Research team
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {isResetMode ? (
            <>
              <h2 className="mb-1 text-lg font-semibold">Set a new password</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose a new password for your account.
              </p>
              <ResetPasswordForm />
            </>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-semibold">Sign in</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                This workspace is invite-only — accounts are created by the
                administrator.
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
                    placeholder="you@example.com"
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
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="remember"
                    checked={remember}
                    onCheckedChange={setRemember}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                    Remember me on this device
                  </Label>
                </div>
                <Button type="submit" className="w-full" loading={loading}>
                  Sign in
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Having trouble signing in? Contact your workspace administrator.
        </p>
      </div>
    </div>
  );
}
