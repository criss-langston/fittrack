"use client";

import { ArrowLeft, Database, Info } from "lucide-react";
import Link from "next/link";
import DataBackup from "@/components/DataBackup";

export default function SettingsPage() {
  return (
    <div className="px-4 pt-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors touch-active"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Data Backup Section */}
      <div className="card mb-4">
        <DataBackup />
      </div>

      {/* App Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Info size={16} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">About</h2>
            <p className="text-xs text-gray-500">App information</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Version</span>
            <span className="text-gray-300">0.1.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Storage</span>
            <span className="text-gray-300">IndexedDB (local)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Data</span>
            <span className="text-gray-300">Stored on device only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
