"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, FileText, Files, ListChecks, Presentation, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FileRecord, Meeting, Profile, ResearchSection, Task } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState("");

  React.useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(q);

    const search = async (query: string): Promise<SearchResult[]> => {
      const supabase = createClient();
      const like = `%${query}%`;
      const out: SearchResult[] = [];

      const [
        { data: sections },
        { data: tasks },
        { data: files },
        { data: meetings },
        { data: members },
      ] = await Promise.all([
        supabase
          .from("research_sections")
          .select("*")
          .or(`title.ilike.${like},content_html.ilike.${like}`)
          .limit(10),
        supabase.from("tasks").select("*").ilike("title", `%${query}%`).limit(10),
        supabase.from("files").select("*").ilike("name", `%${query}%`).limit(10),
        supabase.from("meetings").select("*").ilike("title", `%${query}%`).limit(10),
        supabase
          .from("profiles")
          .select("*")
          .or(`full_name.ilike.${like},email.ilike.${like},student_number.ilike.${like}`)
          .limit(10),
      ]);

      (sections as ResearchSection[] | null)?.forEach((s) =>
        out.push({
          id: `s-${s.id}`,
          title: s.title,
          subtitle: `Research · ${s.group_name}`,
          href: `/dashboard/research/${s.slug}`,
          icon: <FileText className="h-4 w-4 text-primary" />,
        })
      );
      (tasks as Task[] | null)?.forEach((t) =>
        out.push({
          id: `t-${t.id}`,
          title: t.title,
          subtitle: `Task · ${t.status}${t.due_date ? ` · due ${formatDate(t.due_date)}` : ""}`,
          href: "/dashboard/tasks",
          icon: <ListChecks className="h-4 w-4 text-primary" />,
        })
      );
      (files as FileRecord[] | null)?.forEach((f) =>
        out.push({
          id: `f-${f.id}`,
          title: f.name,
          subtitle: "File",
          href: "/dashboard/files",
          icon: <Files className="h-4 w-4 text-primary" />,
        })
      );
      (meetings as Meeting[] | null)?.forEach((m) =>
        out.push({
          id: `m-${m.id}`,
          title: m.title,
          subtitle: `Meeting · ${formatDate(m.scheduled_at)}`,
          href: `/dashboard/meetings/${m.id}`,
          icon: <Presentation className="h-4 w-4 text-primary" />,
        })
      );
      (members as Profile[] | null)?.forEach((p) =>
        out.push({
          id: `p-${p.id}`,
          title: p.full_name,
          subtitle: `Member · ${p.role}${p.committee_id ? "" : ""}`,
          href: p.user_id ? "/dashboard/team" : "/dashboard/team",
          icon: <Users className="h-4 w-4 text-primary" />,
        })
      );
      return out;
    };

    search(q).then((r) => {
      setResults(r);
      setLoading(false);
    });
  }, [q]);

  return (
    <div>
      <PageHeader
        title="Search"
        description={searched ? `Results for “${searched}”` : "Search across the workspace"}
      />

      {!q.trim() ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Search the workspace"
          description="Type in the search bar above (or press Ctrl+K) to find research sections, tasks, files, meetings and members."
        />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          title={`No results for “${searched}”`}
          description="Try a different keyword or check the spelling."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          {results.map((r) => (
            <Link key={r.id} href={r.href}>
              <Card className="mb-2 transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    {r.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
