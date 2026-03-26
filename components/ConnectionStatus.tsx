"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      setShowStatus(!online);
    };

    updateStatus();

    window.addEventListener("online", () => {
      updateStatus();
      setTimeout(() => setShowStatus(false), 3000);
    });

    window.addEventListener("offline", () => {
      updateStatus();
      setShowStatus(true);
    });

    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!showStatus) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div
        className={`rounded-xl p-3 flex items-center gap-2 shadow-lg ${
          isOnline
            ? "bg-emerald-500/20 border border-emerald-500/30"
            : "bg-red-500/20 border border-red-500/30"
        }`}
      >
        {isOnline ? (
          <Wifi className="w-4 h-4 text-emerald-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
        <span
          className={`text-xs font-medium ${
            isOnline ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {isOnline ? "Back online" : "You're offline"}
        </span>
      </div>
    </div>
  );
}
