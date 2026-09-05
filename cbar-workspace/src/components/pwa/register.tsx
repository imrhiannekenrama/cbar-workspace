"use client";

import * as React from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRegister() {
  const [deferred, setDeferred] = React.useState<InstallPromptEvent | null>(null);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        setDeferred(null);
      }}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
    >
      Install app
    </button>
  );
}
