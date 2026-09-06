import * as React from "react";
import type { Profile } from "@/lib/types";

/** Returns the profile ids of teammates mentioned via @FullName in `text`. */
export function parseMentions(
  text: string,
  members: Profile[],
  excludeId?: string
): string[] {
  const ids: string[] = [];
  members.forEach((m) => {
    if (m.id !== excludeId && text.includes(`@${m.full_name}`)) {
      ids.push(m.id);
    }
  });
  return ids;
}

/** Renders `text` with @Name mentions highlighted in the primary color. */
export function renderWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[A-Za-z .]+(?:[A-Za-z]+))/g);
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
