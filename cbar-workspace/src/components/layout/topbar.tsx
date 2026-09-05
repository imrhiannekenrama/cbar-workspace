"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, LogOut, Menu, Search, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { useApp } from "./app-provider";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, logout } = useApp();
  const [query, setQuery] = React.useState("");
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const router = useRouter();
  const searchRef = React.useRef<HTMLInputElement>(null);

  // ---- global search shortcut (Ctrl/Cmd + K) ----
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const loadNotifications = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ---- realtime notifications ----
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("topbar-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const notification = payload.new as Notification;
          setNotifications((prev) => [notification, ...prev].slice(0, 20));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = async () => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/80 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <form onSubmit={submitSearch} className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files, tasks, research, members…  (Ctrl+K)"
          className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <Dropdown
          width="w-80"
          trigger={
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          }
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto thin-scroll">
            {notifications.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.link) router.push(n.link);
                    if (!n.read) {
                      const supabase = createClient();
                      supabase
                        .from("notifications")
                        .update({ read: true })
                        .eq("id", n.id);
                      setNotifications((prev) =>
                        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                      );
                      setUnreadCount((c) => Math.max(0, c - 1));
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-sm px-2 py-2 text-sm transition-colors hover:bg-accent",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Dropdown>

        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-accent">
              <Avatar src={profile?.avatar_url} name={profile?.full_name ?? "User"} size="sm" />
              <span className="hidden max-w-28 truncate text-sm font-medium lg:block">
                {profile?.full_name?.split(" ")[0]}
              </span>
            </button>
          }
        >
          <DropdownItem onClick={() => router.push("/dashboard/profile")}>
            <User className="h-4 w-4" /> Profile
          </DropdownItem>
          <DropdownItem onClick={logout} className="text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
