"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement, Message, Profile } from "@/lib/types";
import { useApp } from "@/components/layout/app-provider";
import { dmChannel, cn, formatDateTime, timeAgo } from "@/lib/utils";
import { logActivity, notifyAll } from "@/lib/activity";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
  const { profile, isAdmin } = useApp();
  const [tab, setTab] = React.useState<"general" | "announcements" | "dm">("general");
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [dmTarget, setDmTarget] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*, committee:committees(*)")
      .eq("status", "Active")
      .neq("id", profile?.id ?? "")
      .order("full_name")
      .then(({ data }) => {
        setMembers((data ?? []) as unknown as Profile[]);
        setLoading(false);
      });
  }, [profile]);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col md:h-[calc(100vh-8.5rem)]">
      <PageHeader
        title="Team Chat"
        description="General channel, announcements and private direct messages — all in realtime."
      />

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto rounded-xl border bg-card p-2 thin-scroll md:flex">
          <ChatTabButton active={tab === "general"} onClick={() => setTab("general")}>
            # general
          </ChatTabButton>
          <ChatTabButton active={tab === "announcements"} onClick={() => setTab("announcements")}>
            <Megaphone className="h-3.5 w-3.5" /> announcements
          </ChatTabButton>
          <div className="mt-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Direct messages
          </div>
          {loading ? (
            <div className="space-y-2 px-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            members.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setDmTarget(m);
                  setTab("dm");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  tab === "dm" && dmTarget?.id === m.id && "bg-primary/10 text-primary"
                )}
              >
                <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                <span className="truncate">{m.full_name.split(" ")[0]}</span>
              </button>
            ))
          )}
        </aside>

        <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card">
          {tab === "general" && (
            <ChatChannel
              channel="general"
              title="# general"
              subtitle="Everyone in the workspace"
            />
          )}
          {tab === "announcements" && <Announcements isAdmin={isAdmin} />}
          {tab === "dm" && dmTarget && profile && (
            <ChatChannel
              channel={dmChannel(profile.id, dmTarget.id)}
              title={dmTarget.full_name}
              subtitle="Direct message · private"
            />
          )}
          {tab === "dm" && !dmTarget && (
            <EmptyState
              icon={<Send />}
              title="Pick a teammate"
              description="Choose someone from the list to start a private conversation."
              className="border-0"
            />
          )}
        </div>

        {/* mobile tab switcher */}
        <div className="fixed bottom-14 left-0 right-0 z-10 flex justify-center gap-2 md:hidden">
          <div className="flex gap-1 rounded-full border bg-card p-1 shadow-lg">
            <MobileTab active={tab === "general"} onClick={() => setTab("general")}>General</MobileTab>
            <MobileTab active={tab === "announcements"} onClick={() => setTab("announcements")}>Announcements</MobileTab>
            <MobileTab active={tab === "dm"} onClick={() => setTab("dm")}>DMs</MobileTab>
          </div>
        </div>
      </div>

      {/* mobile member picker */}
      {tab === "dm" && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 md:hidden">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setDmTarget(m)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
                dmTarget?.id === m.id ? "border-primary bg-primary/10 text-primary" : "bg-card"
              )}
            >
              <Avatar src={m.avatar_url} name={m.full_name} size="sm" className="h-5 w-5" />
              {m.full_name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-accent",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function MobileTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// Realtime message channel (general + DMs)
// ============================================================
function ChatChannel({
  channel,
  title,
  subtitle,
}: {
  channel: string;
  title: string;
  subtitle: string;
}) {
  const { profile } = useApp();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [body, setBody] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*, author:profiles!messages_author_id_fkey(*)")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data ?? []) as unknown as Message[]);
    setLoading(false);
  }, [channel]);

  React.useEffect(() => {
    load();
    const supabase = createClient();
    const sub = supabase
      .channel(`chat-${channel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel=eq.${channel}`,
        },
        (payload) => {
          const message = payload.new as Message;
          if (!messages.some((m) => m.id === message.id)) {
            supabase
              .from("profiles")
              .select("*")
              .eq("id", message.author_id)
              .single()
              .then(({ data: author }) => {
                setMessages((prev) => [
                  ...prev,
                  { ...message, author: (author ?? null) as Profile | null },
                ]);
              });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !profile) return;
    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      author_id: profile.id,
      channel,
      body: body.trim(),
    });
    if (error) {
      toast.error("Message could not be sent.");
      return;
    }
    setBody("");
  };

  return (
    <>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 thin-scroll">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<Send />}
            title="No messages yet"
            description="Say hello to the team!"
            className="border-0 py-10"
          />
        ) : (
          messages.map((m) => {
            const mine = m.author_id === profile?.id;
            return (
              <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                <Avatar src={m.author?.avatar_url} name={m.author?.full_name ?? "?"} size="sm" />
                <div className={cn("max-w-[75%]", mine && "text-right")}>
                  <p className="text-[11px] text-muted-foreground">
                    {mine ? "You" : m.author?.full_name} · {timeAgo(m.created_at)}
                  </p>
                  <div
                    className={cn(
                      "mt-0.5 inline-block whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
        />
        <Button type="submit" size="icon" aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}

// ============================================================
// Announcements
// ============================================================
function Announcements({ isAdmin }: { isAdmin: boolean }) {
  const { profile } = useApp();
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*, author:profiles!announcements_author_id_fkey(*)")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as Announcement[]);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
    const supabase = createClient();
    const sub = supabase
      .channel("announcements-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
  }, [load]);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("announcements").insert({
      author_id: profile?.id ?? null,
      title: title.trim(),
      body: body.trim(),
    });
    if (error) {
      setSaving(false);
      toast.error("Could not publish the announcement.");
      return;
    }
    const { data: members } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "Active");
    if (members) {
      await notifyAll(members, profile?.id ?? null, {
        type: "announcement",
        title: `📢 ${title.trim()}`,
        body: body.trim().slice(0, 120),
        link: "/dashboard/chat",
      });
    }
    await logActivity({
      action: "announce",
      entityType: "announcement",
      details: { title: title.trim() },
    });
    setSaving(false);
    toast.success("Announcement published.");
    setTitle("");
    setBody("");
    setOpen(false);
    load();
  };

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">📢 announcements</p>
          <p className="text-xs text-muted-foreground">Official team announcements</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setOpen(true)}>
            New Announcement
          </Button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 thin-scroll">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Megaphone />}
            title="No announcements yet"
            description="Official updates from the administrator appear here."
            className="border-0 py-10"
          />
        ) : (
          items.map((a) => (
            <div key={a.id} className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <Avatar src={a.author?.avatar_url} name={a.author?.full_name ?? "?"} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.author?.full_name} · {formatDateTime(a.created_at)}
                  </p>
                  {a.body && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {a.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="New Announcement">
        <form onSubmit={publish} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="a-title">Title</Label>
            <Input id="a-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-body">Message</Label>
            <Textarea id="a-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" loading={saving}>
            Publish
          </Button>
        </form>
      </Dialog>
    </>
  );
}
