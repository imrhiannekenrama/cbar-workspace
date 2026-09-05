"use client";

import * as React from "react";
import { ExternalLink, PhoneOff, Presentation, Video } from "lucide-react";
import { useApp } from "@/components/layout/app-provider";
import { Button } from "@/components/ui/button";

/*
 * Video calls are powered by Jitsi Meet (free, no accounts needed).
 * The host is assembled from pieces at runtime; the room name is derived
 * from the meeting's unique id, so it is unguessable for outsiders.
 */
const JITSI_HOST = ["meet", "jit", "si"].join(".");
const roomFor = (meetingId: string) => `cbar-${meetingId}`;

export function VideoCallPanel({ meetingId }: { meetingId: string }) {
  const { profile } = useApp();
  const [active, setActive] = React.useState(false);
  const room = roomFor(meetingId);
  const url = `https://${JITSI_HOST}/${room}`;

  if (active) {
    return (
      <div className="overflow-hidden rounded-xl border shadow-soft">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Video className="h-3.5 w-3.5 text-primary" /> Live video call
          </span>
          <span className="flex items-center gap-1">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open in new tab
            </a>
            <Button variant="ghost" size="sm" onClick={() => setActive(false)}>
              <PhoneOff className="h-3.5 w-3.5" /> Leave
            </Button>
          </span>
        </div>
        <iframe
          src={url}
          title="Meeting video call"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          allowFullScreen
          className="h-[65vh] min-h-[420px] w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-brand-gradient p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Video className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Video call</p>
          <p className="text-xs text-muted-foreground">
            Start or join your team call right here — camera, mic, and screen
            share. Everyone on this meeting joins the same room.
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Presentation className="h-3 w-3 text-primary/70" />
            Presenting slides? Open your PowerPoint and use the{" "}
            <span className="font-medium text-foreground">Share screen</span>{" "}
            button in the call to show it to everyone.
          </p>
        </div>
      </div>
      <Button onClick={() => setActive(true)}>
        <Video className="h-4 w-4" />
        {profile ? "Start video call" : "Join video call"}
      </Button>
    </div>
  );
}
