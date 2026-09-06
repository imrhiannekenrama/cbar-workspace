import * as React from "react";
import type { Profile } from "@/lib/types";

/** Honorific titles to skip when deriving a member's first name. */
const TITLES = new Set([
  "prof", "dr", "mr", "mrs", "ms", "miss", "sir", "maam", "mam", "engg", "rev",
]);

/** Returns the profile ids of teammates mentioned via @Name in `text`.
 *  Matching is case-insensitive and ignores honorifics: "@daniel",
 *  "@prof" and "@prof." all notify "Prof. Daniel Lao Llovia". */
export function parseMentions(
  text: string,
  members: Profile[],
  excludeId?: string
): string[] {
  const ids: string[] = [];
  const tokens = (text.match(/@[A-Za-z][A-Za-z.]*/g) ?? []).map((t) =>
    t.slice(1).toLowerCase().replace(/\./g, "")
  );
  const clean = (w: string) => w.toLowerCase().replace(/\./g, "");
  members.forEach((m) => {
    if (m.id === excludeId) return;
    const words = m.full_name.split(/\s+/).filter(Boolean);
    const firstName = clean(
      words.find((w) => !TITLES.has(clean(w))) ?? words[0] ?? ""
    );
    const title =
      words.length > 1 && TITLES.has(clean(words[0])) ? clean(words[0]) : null;
    if (tokens.includes(firstName) || (title && tokens.includes(title))) {
      ids.push(m.id);
    }
  });
  return ids;
}

/** Renders `text` with @Name mentions highlighted. Pass `mine = true`
 *  when rendering inside the sender's own (primary-colored) bubble so
 *  the highlight stays visible there too. */
export function renderWithMentions(
  text: string,
  mine = false
): React.ReactNode {
  const parts = text.split(/(@[A-Za-z][A-Za-z.]*)/g);
  return parts.map((part, i) =>
    part.startsWith("@") && part.length > 1 ? (
      <span
        key={i}
        className={
          mine
            ? "rounded bg-primary-foreground/25 px-1 font-semibold"
            : "rounded bg-primary/10 px-1 font-medium text-primary"
        }
      >
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}
