import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the Supabase email links (password recovery, email confirmation).
 * Exchanges the auth code for a session, then redirects:
 *  - recovery links → /login?reset=1 (set a new password)
 *  - everything else → /dashboard
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const isRecovery = nextParam.includes("reset") || nextParam === "/dashboard";
      return NextResponse.redirect(
        isRecovery ? `${origin}/login?reset=1` : `${origin}${nextParam}`
      );
    }
  }

  // Missing or invalid code — send the user to login with an error hint.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
