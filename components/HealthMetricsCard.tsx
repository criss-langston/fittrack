"use client";

import { useState, useEffect } from "react";
import { Activity, Heart, Footprints } from "lucide-react";
import { healthSync } from "@/lib/health";
import { getHealthSettings } from "@/lib/db";

export default function HealthMetricsCard() {
  const [steps, setSteps] = useState<number | null>(null);
  const [restingHR, setRestingHR] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const settings = await getHealthSettings();
      if (settings.enabled && settings.connectedSources.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const stepData = await healthSync.getDailySteps(today);
        setSteps(stepData);
        setRestingHR(null);
      }
    } catch (error) {
      console.error("Failed to load health metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="card mb-4 bg-gradient-to-br from-gray-800 to-gray-900 border border-emerald-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <Activity size={16} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Health Overview</h3>
            <p className="text-xs text-gray-400">Synced from your wearable</p>
          </div>
        </div>
        <a href="/settings" className="text-xs text-violet-400 hover:text-violet-300">
          Settings
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Footprints size={14} className="text-emerald-400" />
            <span className="text-xs text-gray-400">Steps Today</span>
          </div>
          {isLoading ? (
            <div className="h-8 w-20 bg-gray-700 rounded animate-pulse" />
          ) : steps !== null ? (
            <>
              <p className="text-2xl font-bold text-emerald-400">{steps.toLocaleString()}</p>
              <p className="text-xs text-gray-500">steps</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-400">--</p>
              <p className="text-xs text-gray-500">Connect to start</p>
            </>
          )}
        </div>

        <div className="p-3 bg-gray-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Heart size={14} className="text-red-400" />
            <span className="text-xs text-gray-400">Resting HR</span>
          </div>
          {restingHR ? (
            <>
              <p className="text-2xl font-bold text-red-400">{restingHR}</p>
              <p className="text-xs text-gray-500">BPM</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-400">--</p>
              <p className="text-xs text-gray-500">No data</p>
            </>
          )}
        </div>
      </div>

      {!isLoading && steps === null && (
        <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-xs text-emerald-200">
            Enable Health Sync in Settings to automatically import steps, workouts, and heart rate from your Apple Watch or Google Fit.
          </p>
        </div>
      )}
    </div>
  );
}
