"use client";

import * as React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ResearchSection } from "@/lib/types";
import { SECTION_GROUPS } from "@/lib/constants";
import { useApp } from "@/components/layout/app-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusBadge: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Draft: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "In Review": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

export default function ResearchPage() {
  const { profile } = useApp();
  const [sections, setSections] = React.useState<ResearchSection[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const supabase = createClient();
    supabase
      .from("research_sections")
      .select("*")
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        setSections((data ?? []) as ResearchSection[]);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="Research"
        description="Every section of our research paper — write, review and comment together."
      />

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {SECTION_GROUPS.map((group) => {
            const groupSections = sections.filter((s) => s.group_name === group);
            if (groupSections.length === 0) return null;
            const groupProgress =
              groupSections.reduce((acc, s) => acc + s.progress, 0) /
              groupSections.length;
            return (
              <section key={group} className="animate-fade-in-up">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{group}</h2>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(groupProgress)}% complete
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {groupSections.map((section) => (
                    <Link
                      key={section.id}
                      href={`/dashboard/research/${section.slug}`}
                      className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <Badge
                          className={cn("border-0", statusBadge[section.status])}
                        >
                          {section.status}
                        </Badge>
                      </div>
                      <h3 className="mt-3 font-medium group-hover:text-primary">
                        {section.title}
                      </h3>
                      <Progress value={section.progress} className="mt-3 h-1.5" />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {section.progress}% ·{" "}
                        {section.updated_by_profile?.full_name ??
                          (profile ? "Not yet edited" : "")}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
