"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, MessageCircle, Reply } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Comment, Profile } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { logActivity, notifyUser } from "@/lib/activity";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";

interface CommentItem extends Comment {
  replies?: CommentItem[];
}

export function CommentsPanel({
  sectionId,
  members,
  currentUserId,
}: {
  sectionId: string;
  members: Profile[];
  currentUserId: string;
}) {
  const [comments, setComments] = React.useState<CommentItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [replyBody, setReplyBody] = React.useState("");
  const [showResolved, setShowResolved] = React.useState(false);
  const [membersMap, setMembersMap] = React.useState<Record<string, Profile>>({});

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("comments")
      .select("*, author:profiles!comments_author_id_fk(*)")
      .eq("section_id", sectionId)
      .order("created_at", { ascending: true });
    if (data) {
      const all = data as unknown as Comment[];
      const topLevel = all
        .filter((c) => !c.parent_id)
        .map((c) => ({
          ...c,
          replies: all.filter((r) => r.parent_id === c.id),
        }));
      setComments(topLevel);
    }
    setLoading(false);
  }, [sectionId]);

  React.useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${sectionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `section_id=eq.${sectionId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, sectionId]);

  React.useEffect(() => {
    const map: Record<string, Profile> = {};
    members.forEach((m) => (map[m.id] = m));
    setMembersMap(map);
  }, [members]);

  const parseMentions = (text: string): string[] => {
    const ids: string[] = [];
    members.forEach((m) => {
      if (m.id !== currentUserId && text.includes(`@${m.full_name}`)) {
        ids.push(m.id);
      }
    });
    return ids;
  };

  const addComment = async (parentId: string | null, text: string) => {
    if (!text.trim()) return;
    const supabase = createClient();
    const mentions = parseMentions(text);
    const { error } = await supabase.from("comments").insert({
      section_id: sectionId,
      parent_id: parentId,
      author_id: currentUserId,
      body: text.trim(),
      mentions,
      resolved: false,
    });
    if (error) {
      toast.error("Could not add the comment.");
      return;
    }
    await logActivity({
      action: "comment",
      entityType: "research_section",
      entityId: sectionId,
    });
    // notify mentioned members
    const sectionTitle =
      typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "";
    mentions.forEach((id) =>
      notifyUser(id, {
        type: "mention",
        title: "You were mentioned in a comment",
        body: text.slice(0, 120),
        link: `/dashboard/research/${sectionTitle}`,
      })
    );
    setBody("");
    setReplyTo(null);
    setReplyBody("");
    load();
  };

  const toggleResolved = async (comment: CommentItem) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("comments")
      .update({ resolved: !comment.resolved })
      .eq("id", comment.id);
    if (error) {
      toast.error("Could not update the comment.");
      return;
    }
    await logActivity({
      action: comment.resolved ? "reopen_comment" : "approve",
      entityType: "comment",
      entityId: comment.id,
      details: { resolved: !comment.resolved },
    });
    load();
  };

  const visible = comments.filter((c) => showResolved || !c.resolved);

  const renderComment = (c: CommentItem, isReply = false) => {
    const author = c.author ?? membersMap[c.author_id];
    return (
      <div
        key={c.id}
        className={cn("rounded-lg border bg-background p-3", isReply && "ml-8")}
      >
        <div className="flex items-start gap-2">
          <Avatar src={author?.avatar_url} name={author?.full_name ?? "?"} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {author?.full_name ?? "Unknown"}
              </span>
              {c.resolved && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  Resolved
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatDateTime(c.created_at)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {highlightMentions(c.body)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {!isReply && (
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyBody("");
                  }}
                >
                  <Reply className="h-3 w-3" /> Reply
                </button>
              )}
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => toggleResolved(c)}
              >
                <Check className="h-3 w-3" />
                {c.resolved ? "Reopen" : "Resolve"}
              </button>
            </div>
            {replyTo === c.id && (
              <div className="mt-2 flex items-end gap-2">
                <Textarea
                  rows={2}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a reply… use @Name to mention"
                  className="text-sm"
                />
                <Button size="sm" onClick={() => addComment(c.id, replyBody)}>
                  Send
                </Button>
              </div>
            )}
          </div>
        </div>
        {c.replies?.map((r) => renderComment(r, true))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3">
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment… use @Name to mention a teammate"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={() => addComment(null, body)}>
            <MessageCircle className="h-3.5 w-3.5" /> Comment
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={showResolved}
          onChange={(e) => setShowResolved(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-input"
        />
        Show resolved comments
      </label>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<MessageCircle />}
          title="No comments yet"
          description="Be the first to leave feedback on this section."
          className="py-10"
        />
      ) : (
        <div className="space-y-3">{visible.map((c) => renderComment(c))}</div>
      )}
    </div>
  );
}

function highlightMentions(body: string) {
  const parts = body.split(/(@[A-Za-z .]+(?:[A-Za-z]+))/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="rounded bg-primary/10 px-1 font-medium text-primary">
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}
