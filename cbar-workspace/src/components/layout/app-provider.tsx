"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Committee, Profile } from "@/lib/types";

interface AppContextValue {
  profile: Profile | null;
  committee: Committee | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  const load = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*, committee:committees(*)")
        .eq("user_id", userData.user.id)
        .single();
      setProfile((data as Profile) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const logout = React.useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  const value: AppContextValue = {
    profile,
    committee: profile?.committee ?? null,
    loading,
    isAdmin: profile?.role === "Administrator",
    refresh: async () => {
      await load();
    },
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
