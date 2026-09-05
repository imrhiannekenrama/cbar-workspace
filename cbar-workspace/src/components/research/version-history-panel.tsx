"use client";

import * as React from "react";
import { toast } from "sonner";
import { History, RotateCcw, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ResearchSection, SectionVersion } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function VersionHistoryPanel({
  section,
  currentContent,
  onRestore,
}: {
  section: ResearchSection;
  currentContent: string;
  onRestore: (html: string) => void;
}) {
  const [versions, setVersions] = React.useState<SectionVersion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("section_versions")
      .select("*, created_by_profile:profiles!section_versions_created_by_fkey(full_name)")
      .eq("section_id", section.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setVersions((data ?? []) as unknown as SectionVersion[]);
    setLoading(false);
  }, [section.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveVersion = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("section_versions").insert({
      section_id: section.id,
      content_html: currentContent,
      label: "Manual snapshot",
      created_by: section.updated_by ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save the version.");
      return;
    }
    await logActivity({
      action: "save_version",
      entityType: "research_section",
      entityId: section.id,
      details: { title: section.title },
    });
    toast.success("Version saved.");
    load();
  };

  const restore = async (version: SectionVersion) => {
    onRestore(version.content_html);
    const supabase = createClient();
    await supabase
      .from("research_sections")
      .update({
        content_html: version.content_html,
        updated_at: new Date().toISOString(),
      })
      .eq("id", section.id);
    await logActivity({
      action: "restore_version",
      entityType: "research_section",
      entityId: section.id,
      details: { title: section.title, versionId: version.id },
    });
    toast.success("Version restored.");
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        loading={saving}
        onClick={saveVersion}
      >
        <Save className="h-3.5 w-3.5" /> Save a version snapshot
      </Button>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <EmptyState
          icon={<History />}
          title="No versions yet"
          description="Snapshots appear here once you save one."
          className="py-10"
        />
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {v.label || "Autosaved snapshot"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(v.created_at)}
                  {v.created_by_profile?.full_name
                    ? ` · ${v.created_by_profile.full_name}`
                    : ""}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => restore(v)}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
