"use client";

import { useState, useEffect, useRef } from "react";
import {
  exportAllData,
  exportAllDataWithCSV,
  importAllData,
  validateBackup,
  validateCSVImport,
  getStorageStats,
  clearAllData,
  type FitTrackBackup,
  type StoreStats,
} from "@/lib/db";
import { Download, Upload, AlertTriangle, Check, X, Shield, FileText, Eye, Trash2, Database, HardDrive } from "lucide-react";

const LAST_BACKUP_KEY = "fittrack-last-backup";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  message: string;
  type: ToastType;
  id: number;
}

interface ExportPreview {
  type: "json" | "csv-workouts" | "csv-measurements" | "all";
  data: string;
  rowCount?: number;
  fileName: string;
}

export default function DataBackup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<"import" | "clear" | null>(null);
  const [pendingBackup, setPendingBackup] = useState<FitTrackBackup | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ExportPreview | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exportTab, setExportTab] = useState<'json' | 'csv'>('json');
  const [csvValidation, setCsvValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [storageStats, setStorageStats] = useState<StoreStats[] | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY);
    if (stored) setLastBackup(stored);
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  function addToast(message: string, type: ToastType) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  async function handleExport(type: 'json' | 'csv') {
    setExporting(true);
    try {
      if (type === 'json') {
        const backup = await exportAllData();
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fittrack-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const now = new Date().toISOString();
        localStorage.setItem(LAST_BACKUP_KEY, now);
        setLastBackup(now);

        const total = Object.values(backup.metadata.storeCount).reduce(
          (sum, n) => sum + n,
          0
        );
        addToast(`Exported ${total} records successfully`, "success");
      } else {
        const backup = await exportAllDataWithCSV();
        setPreviewData({
          type: 'all',
          data: `Workout data (${backup.metadata.storeCount.workouts} rows)\nMeasurement data (${backup.metadata.storeCount.measurements} rows)\n\nReady for export.`,
          fileName: `fittrack-export-${new Date().toISOString().slice(0, 10)}.csv`,
        });
        setShowPreview(true);
      }
    } catch (err) {
      console.error("Export failed:", err);
      addToast("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleCSVDownload() {
    try {
      const backup = await exportAllDataWithCSV();
      const blob = new Blob([backup.csvExports.workouts + '\n\n--- MEASUREMENTS ---\n' + backup.csvExports.measurements], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fittrack-export-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("CSV export downloaded successfully", "success");
      setShowPreview(false);
    } catch (err) {
      console.error("CSV export failed:", err);
      addToast("CSV export failed. Please try again.", "error");
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        addToast("Invalid JSON file. Please select a valid backup.", "error");
        return;
      }
      if (!validateBackup(parsed)) {
        addToast("Invalid backup format. This file is not a FitTrack backup.", "error");
        return;
      }
      setPendingBackup(parsed);
      setShowConfirm("import");
    } catch (err) {
      console.error("File read failed:", err);
      addToast("Could not read file. Please try again.", "error");
    }
  }

  async function handleCSVFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const validation = validateCSVImport(text, 'workouts');
      if (!validation.valid) {
        addToast(`CSV validation error: ${validation.error}`, "error");
        return;
      }
      setPreviewData({
        type: 'csv-workouts',
        data: text,
        rowCount: validation.rowCount,
        fileName: `import-${file.name}`,
      });
      setShowPreview(true);
      setCsvValidation({ valid: true });
    } catch (err) {
      console.error("CSV file read failed:", err);
      addToast("Could not read CSV file. Please try again.", "error");
    }
  }

  async function confirmImport() {
    if (!pendingBackup) return;
    setShowConfirm(null);
    setImporting(true);
    try {
      const result = await importAllData(pendingBackup);
      const total = Object.values(result.imported).reduce((sum, n) => sum + n, 0);
      addToast(`Imported ${total} records successfully`, "success");
      await loadStats();
    } catch (err) {
      console.error("Import failed:", err);
      addToast("Import failed. Your data may be incomplete.", "error");
    } finally {
      setPendingBackup(null);
      setImporting(false);
    }
  }

  async function confirmClearData() {
    setShowClearConfirm(false);
    setClearing(true);
    try {
      await clearAllData();
      await loadStats();
      addToast("All data cleared successfully", "warning");
    } catch (err) {
      console.error("Clear data failed:", err);
      addToast("Failed to clear data. Please try again.", "error");
    } finally {
      setClearing(false);
    }
  }

  function cancelAction() {
    setShowConfirm(null);
    setPendingBackup(null);
    setShowClearConfirm(false);
  }

  function closePreview() {
    setShowPreview(false);
    setPreviewData(null);
    setCsvValidation(null);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  const totalRecords = storageStats?.reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Shield size={16} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Data Backup & Export</h2>
            <p className="text-xs text-gray-500">Manage your fitness data</p>
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={() => handleExport('json')} disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all">
            {exporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download size={18} />}
            {exporting ? 'Exporting...' : 'Export JSON Backup'}
          </button>
          <button onClick={handleImportClick} disabled={importing}
            className="w-full flex items-center justify-center gap-2 bg-transparent border border-gray-600 hover:border-gray-400 disabled:opacity-50 text-gray-300 font-medium py-3 px-4 rounded-xl transition-all">
            <Upload size={18} />
            Import Backup
          </button>
          <input ref={fileInputRef} type="file" accept=".json,.csv"
            onChange={(e) => { const file = e.target.files?.[0]; if (file?.name.endsWith('.csv')) { handleCSVFileSelect(e); } else { handleFileSelect(e); } }}
            className="hidden" />
        </div>
        {lastBackup && (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
            <Check size={14} className="text-green-400 shrink-0" />
            <span>Last backup: {formatDate(lastBackup)}</span>
          </div>
        )}
      </div>
    </>
  );
}
