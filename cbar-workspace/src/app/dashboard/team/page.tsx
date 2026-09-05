"use client";

import * as React from "react";
import { Crown, Shield, Users2 } from "lucide-react";
import { COMMITTEE_ROSTER, LEADER } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="The organizational structure of our CBAR team."
      />

      {/* Leader */}
      <div className="flex justify-center">
        <Card className="w-full max-w-sm border-primary/30 shadow-md">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{LEADER.name}</CardTitle>
            <CardDescription>Group Leader</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-1.5">
            {LEADER.roles.map((role) => (
              <Badge key={role} className="border-primary/20 bg-primary/10 text-primary">
                {role}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Connector */}
      <div className="mx-auto hidden h-10 w-px bg-border md:block" />
      <div className="mx-auto mb-2 hidden justify-center md:flex">
        <Users2 className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Committees */}
      <div className="grid gap-6 md:grid-cols-3">
        {COMMITTEE_ROSTER.map((committee) => (
          <div key={committee.name} className="relative animate-fade-in-up">
            <div className="mx-auto mb-3 hidden h-8 w-px bg-border md:block" />
            <Card className="h-full transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" />
                  {committee.name}
                </CardTitle>
                <CardDescription>{committee.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Members
                  </p>
                  <ul className="space-y-1">
                    {committee.members.map((member) => (
                      <li key={member} className="text-sm">
                        {member}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Responsibilities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {committee.responsibilities.map((r) => (
                      <Badge key={r} variant="secondary" className="font-normal">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
