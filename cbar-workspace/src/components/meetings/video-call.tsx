"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Presentation, Video } from "lucide-react";
import { useApp } from "@/components/layout/app-provider";
import { Button } from "@/components/ui/button";

/*
 * Video calls are powered by Jitsi Meet (free, no accounts needed).
 * The host is assembled from pieces at runtime; the room name is derived
 * from the meeting's unique id, so it is unguessable for outsiders.
 *
 * IMPORTANT: the call opens in a real browser tab, not an <iframe>.
 * meet.jit.si auto-disconnects EMBEDDED (iframe) calls after 5 minutes
 * to push people toward its paid "Jitsi as a Service" product -- but that
 * limit only applies to embedding. A normal tab has no such cap.
 */
const JITSI_HOST = ["meet", "jit", "si"].join(".");
const roomFor = (meetingId: string) => `cbar-${meetingId}`;

export function VideoCallPanel({ meetingId }: { meetingId: string }) {
  const { profile } = useApp();
  const room = roomFor(meetingId);
  const url = `https://${JITSI_HOST}/${room}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Call link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-brand-gradient p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Video call</p>
          <p className="text-xs text-muted-foreground">
            Opens in a new tab -- camera, mic, and screen share, with no time
            limit. Everyone on this meeting joins the same room.
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Presentation className="h-3 w-3 text-primary/70" />
            Presenting slides? Open your PowerPoint and use the{" "}
            <span className="font-medium text-foreground">Share screen</span>{" "}
            button in the call to show it to everyone.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" /> Copy link
        </Button>
        <a href={url} target="_blank" rel="noreferrer">
          <Button>
            <ExternalLink className="h-4 w-4" />
            {profile ? "Start video call" : "Join video call"}
          </Button>
        </a>
      </div>
    </div>
  );
}
