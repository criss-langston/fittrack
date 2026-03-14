"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a 3 second delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-gray-900 border border-violet-500/30 rounded-2xl p-4 shadow-lg shadow-violet-500/10 flex items-center gap-3">
        <div className="bg-violet-600 rounded-xl p-2.5 shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install FitTrack</p>
          <p className="text-xs text-gray-400">Add to home screen for the best experience</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl shrink-0 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-300 shrink-0 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
