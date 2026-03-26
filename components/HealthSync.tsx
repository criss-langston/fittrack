"use client";

import { useState, useEffect } from "react";
import { Activity, Watch, Link2, Unlink, RefreshCw, CheckCircle, XCircle, AlertCircle, Settings, ChevronDown, ChevronUp, Smartphone, Heart, Footprints, Moon } from "lucide-react";
import { healthSync } from "@/lib/health";
import { HealthDataSource, SyncStatus, HealthSettings } from "@/types/health";
import { getHealthSettings, updateHealthSettings } from "@/lib/db";

export default function HealthSync() {
  const [settings, setSettings] = useState<HealthSettings | null>(null);
  const [isConnecting, setIsConnecting] = useState<HealthDataSource | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.DISCONNECTED);
  const [showDetails, setShowDetails] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ steps: number; workouts: number; heartRate: number; sleep: number; errors: string[] } | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const s = await getHealthSettings();
    setSettings(s);
    if (s.enabled && s.connectedSources.length > 0) setSyncStatus(SyncStatus.CONNECTED);
  };

  const handleConnect = async (source: HealthDataSource) => {
    setIsConnecting(source);
    try {
      let success = false;
      if (source === HealthDataSource.APPLE_HEALTH) success = await healthSync.requestAppleHealthPermission();
      else if (source === HealthDataSource.GOOGLE_FIT) success = await healthSync.requestGoogleFitPermission();
      if (success) {
        const current = await getHealthSettings();
        if (!current.connectedSources.includes(source)) { current.connectedSources.push(source); await updateHealthSettings(current); setSettings(current); setSyncStatus(SyncStatus.CONNECTED); }
      } else { setSyncStatus(SyncStatus.PERMISSION_DENIED); }
    } catch { setSyncStatus(SyncStatus.ERROR); } finally { setIsConnecting(null); }
  };

  const handleDisconnect = async (source: HealthDataSource) => {
    await healthSync.disconnectSource(source);
    const current = await getHealthSettings();
    setSettings(current);
    if (current.connectedSources.length === 0) setSyncStatus(SyncStatus.DISCONNECTED);
  };

  const handleSync = async () => {
    if (!settings?.enabled) return;
    setIsSyncing(true); setSyncStatus(SyncStatus.SYNCING);
    try {
      const result = await healthSync.syncAll();
      setLastSyncResult(result); setSyncStatus(SyncStatus.CONNECTED);
    } catch (error) {
      setSyncStatus(SyncStatus.ERROR);
      setLastSyncResult({ steps: 0, workouts: 0, heartRate: 0, sleep: 0, errors: [error instanceof Error ? error.message : "Sync failed"] });
    } finally { setIsSyncing(false); }
  };

  const handleEnableToggle = async (enabled: boolean) => {
    await updateHealthSettings({ enabled });
    setSettings((prev) => (prev ? { ...prev, enabled } : null));
    if (!enabled) setSyncStatus(SyncStatus.DISCONNECTED);
  };

  const handlePreferenceChange = async (pref: keyof HealthSettings["syncPreferences"], value: boolean) => {
    if (!settings) return;
    const newPrefs = { ...settings.syncPreferences, [pref]: value };
    await updateHealthSettings({ syncPreferences: newPrefs });
    setSettings((prev) => (prev ? { ...prev, syncPreferences: newPrefs } : null));
  };

  if (!settings) return <div className="card animate-pulse"><div className="h-32 bg-gray-800 rounded-lg" /></div>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <Activity size={16} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Health Sync</h2>
            <p className="text-xs text-gray-500">Connect wearables & track health data</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-800 rounded-lg">
        <div>
          <p className="text-sm font-medium">Enable Health Sync</p>
          <p className="text-xs text-gray-400">Sync data from connected devices</p>
        </div>
        <button onClick={() => handleEnableToggle(!settings.enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? "bg-violet-600" : "bg-gray-700"}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enabled ? "left-7" : "left-1"}`} />
        </button>
      </div>
      {!settings.enabled && (
        <div className="text-center py-4">
          <Activity size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Health Sync is disabled</p>
        </div>
      )}
    </div>
  );
}
