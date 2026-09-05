"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, MessageSquare, Save, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ResearchSection } from "@/lib/types";
import { SECTION_STATUSES, STATUS_PROGRESS } from "@/lib/constants";
import { useApp } from "@/components/layout/app-provider";
import { logActivity } from "@/lib/activity";
import { RichTextEditor } from "@/components/research/rich-text-editor";
import { CommentsPanel } from "@/components/research/comments-panel";
import { VersionHistoryPanel } from "@/components/research/version-history-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SaveState = "saved" | "saving" | "unsaved";

export default function ResearchSectionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { profile } = useApp();

  const [section, setSection] = React.useState<ResearchSection | null>(null);
  const [members, setMembers] = React.useState<Profile[]>([]);
  const [content, setContent] = React.useState("");
  const [saveState, setSaveState] = React.useState<SaveState>("saved");
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("research_sections")
      .select("*, updated_by_profile:profiles!research_sections_updated_by_fkey(full_name)")
      .eq("slug", slug)
      .single();
    if (!data) {
      setNotFound(true);
    } else {
      const s = data as unknown as ResearchSection;
      setSection(s);
      setContent(s.content_html);
    }
    const { data: memberData } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "Active")
      .order("full_name");
    setMembers((memberData ?? []) as Profile[]);
    setLoading(false);
  }, [slug]);

  React.useEffect(() => {
    load();
  }, [load]);

  // ---- Autosave (debounced 1.5s) ----
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (!section || content === section.content_html) return;
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      const supabase = createClient();
      const { error } = await supabase
        .from("research_sections")
        .update({
          content_html: content,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id ?? null,
        })
        .eq("id", section.id);
      setSaveState(error ? "unsaved" : "saved");
      if (error) toast.error("Autosave failed — check your connection.");
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [content, section, profile]);

  const updateStatus = async (status: ResearchSection["status"]) => {
    if (!section) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("research_sections")
      .update({
        status,
        progress: STATUS_PROGRESS[status],
        updated_at: new Date().toISOString(),
        updated_by: profile?.id ?? null,
      })
      .eq("id", section.id);
    if (error) {
      toast.error("Could not update status.");
      return;
    }
    setSection({ ...section, status, progress: STATUS_PROGRESS[status] });
    await logActivity({
      action: status === "Completed" ? "approve" : "edit",
      entityType: "research_section",
      entityId: section.id,
      details: { title: section.title, status },
    });
    toast.success(`Status set to ${status}.`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    );
  }

  if (notFound || !section) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Section not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This research section does not exist.
        </p>
        <Link href="/dashboard/research">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4" /> Back to Research
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={section.title}
        description={`${section.group_name} · last updated ${
          section.updated_by_profile?.full_name
            ? `by ${section.updated_by_profile.full_name}`
            : "recently"
        }`}
        actions={
          <>
            <Link href="/dashboard/research">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" /> All sections
              </Button>
            </Link>
            <Badge
              className={cn(
                "border-0 px-3 py-1",
                saveState === "saved" &&
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
                saveState === "saving" &&
                  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                saveState === "unsaved" &&
                  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              )}
            >
              {saveState === "saved" && "All changes saved"}
              {saveState === "saving" && "Saving…"}
              {saveState === "unsaved" && "Unsaved changes"}
            </Badge>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
            <label className="text-sm font-medium">Status</label>
            <Select
              className="w-40"
              value={section.status}
              onChange={(e) =>
                updateStatus(e.target.value as ResearchSection["status"])
              }
            >
              {SECTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">
              Progress: <span className="font-medium text-foreground">{section.progress}%</span>
            </span>
          </div>

          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing this section…"
          />
        </div>

        <div className="space-y-3">
          <Tabs defaultValue="comments">
            <TabsList className="w-full">
              <TabsTrigger value="comments" className="flex-1">
                <MessageSquare className="h-3.5 w-3.5" /> Comments
              </TabsTrigger>
              <TabsTrigger value="versions" className="flex-1">
                <Save className="h-3.5 w-3.5" /> Versions
              </TabsTrigger>
              <TabsTrigger value="team" className="flex-1">
                <Users className="h-3.5 w-3.5" /> Team
              </TabsTrigger>
            </TabsList>
            <TabsContent value="comments">
              <div className="rounded-xl border bg-card p-3">
                {profile ? (
                  <CommentsPanel
                    sectionId={section.id}
                    members={members}
                    currentUserId={profile.id}
                  />
                ) : (
                  <Skeleton className="h-40 w-full" />
                )}
              </div>
            </TabsContent>
            <TabsContent value="versions">
              <div className="rounded-xl border bg-card p-3">
                <VersionHistoryPanel
                  section={section}
                  currentContent={content}
                  onRestore={(html) => setContent(html)}
                />
              </div>
            </TabsContent>
            <TabsContent value="team">
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-2 text-sm font-medium">Team members</p>
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span>{m.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.committee?.name ?? m.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
