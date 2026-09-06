import * as React from "react";
import type { Profile } from "@/lib/types";

/** Returns the profile ids of teammates mentioned via @Name in `text`.
 *  Matching is case-insensitive: either the full name ("@Shayne Campo")
 *  or just the first name ("@Shayne") notifies that teammate. */
export function parseMentions(
  text: string,
  members: Profile[],
  excludeId?: string
): string[] {
  const ids: string[] = [];
  const tokens = (text.match(/@[A-Za-z][A-Za-z.]*/g) ?? []).map((t) =>
    t.slice(1).toLowerCase()
  );
  members.forEach((m) => {
    if (m.id === excludeId) return;
    const firstName = m.full_name.split(" ")[0].toLowerCase();
    const fullName = m.full_name.toLowerCase();
    if (tokens.includes(firstName) || tokens.includes(fullName)) {
      ids.push(m.id);
    }
  });
  return ids;
}

/** Renders `text` with @Name mentions highlighted in the primary color. */
export function renderWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[A-Za-z][A-Za-z.]*)/g);
  return parts.map((part, i) =>
    part.startsWith("@") && part.length > 1 ? (
      <span
        key={i}
        className="rounded bg-primary/10 px-1 font-medium text-primary"
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}
