"use client";

import { useState, useEffect, useRef } from "react";
import {
  exportAllData,
  importAllData,
  validateBackup,
  type FitTrackBackup,
} from "@/lib/db";
import { Download, Upload, AlertTriangle, Check, X, Shield } from "lucide-react";

const LAST_BACKUP_KEY = "fittrack-last-backup";

type ToastType = "success" | "error" | "info";

interface Toast {
  message: string;
  type: ToastType;
  id: number;
}

export default function DataBackup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<FitTrackBackup | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_BACKUP_KEY);
    if (stored) setLastBackup(stored);
  }, []);

  function addToast(message: string, type: ToastType) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  async function handleExport() {
    setExporting(true);
    try {
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
    } catch (err) {
      console.error("Export failed:", err);
      addToast("Export failed. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be selected again
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
        addToast(
          "Invalid backup format. This file is not a FitTrack backup.",
          "error"
        );
        return;
      }

      setPendingBackup(parsed);
      setShowConfirm(true);
    } catch (err) {
      console.error("File read failed:", err);
      addToast("Could not read file. Please try again.", "error");
    }
  }

  async function confirmImport() {
    if (!pendingBackup) return;
    setShowConfirm(false);
    setImporting(true);

    try {
      const result = await importAllData(pendingBackup);
      const total = Object.values(result.imported).reduce(
        (sum, n) => sum + n,
        0
      );
      addToast(`Imported ${total} records successfully`, "success");
    } catch (err) {
      console.error("Import failed:", err);
      addToast("Import failed. Your data may be incomplete.", "error");
    } finally {
      setPendingBackup(null);
      setImporting(false);
    }
  }

  function cancelImport() {
    setShowConfirm(false);
    setPendingBackup(null);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Shield size={16} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Data Backup</h2>
            <p className="text-xs text-gray-500">
              Export or import your fitness data
            </p>
          </div>
        </div>

        {/* Last Backup Info */}
        {lastBackup && (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
            <Check size={14} className="text-green-400 shrink-0" />
            <span>Last backup: {formatDate(lastBackup)}</span>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all"
        >
          {exporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={18} />
              Export Data
            </>
          )}
        </button>

        {/* Import Button */}
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 bg-transparent border border-gray-600 hover:border-gray-400 hover:bg-gray-800/50 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 font-medium py-3 px-4 rounded-xl transition-all"
        >
          {importing ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload size={18} />
              Import Data
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Warning */}
        <div className="flex gap-2 text-xs text-amber-400/80 bg-amber-900/15 border border-amber-800/30 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Importing a backup will <strong>replace all existing data</strong>.
            We recommend exporting a backup first.
          </span>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && pendingBackup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Replace All Data?</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  This will replace all existing data and cannot be undone.
                </p>
              </div>
            </div>

            {/* Backup Summary */}
            <div className="bg-gray-800/70 rounded-lg p-3 space-y-1">
              <p className="text-xs text-gray-400 mb-1.5">Backup contents:</p>
              {Object.entries(pendingBackup.metadata.storeCount).map(
                ([store, count]) => (
                  <div
                    key={store}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-300 capitalize">
                      {store.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="text-gray-500">
                      {count as number} record{(count as number) !== 1 ? "s" : ""}
                    </span>
                  </div>
                )
              )}
              <div className="border-t border-gray-700 mt-2 pt-1.5">
                <p className="text-[10px] text-gray-500">
                  Exported:{" "}
                  {formatDate(pendingBackup.metadata.exportDate)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelImport}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors"
              >
                Replace Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-up ${
              toast.type === "success"
                ? "bg-green-900/90 text-green-200 border border-green-700/50"
                : toast.type === "error"
                  ? "bg-red-900/90 text-red-200 border border-red-700/50"
                  : "bg-gray-800/90 text-gray-200 border border-gray-600/50"
            }`}
          >
            {toast.type === "success" ? (
              <Check size={16} className="text-green-400 shrink-0" />
            ) : toast.type === "error" ? (
              <X size={16} className="text-red-400 shrink-0" />
            ) : null}
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
