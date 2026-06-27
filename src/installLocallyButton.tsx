import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handler as EventListener
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener
      );
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    return choice.outcome === "accepted";
  };

  return {
    canInstall: !!deferredPrompt,
    install,
  };
}