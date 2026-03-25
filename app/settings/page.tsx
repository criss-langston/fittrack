"use client";

import { ArrowLeft, Database, Info, Palette, Activity } from "lucide-react";
import Link from "next/link";
import DataBackup from "@/components/DataBackup";
import { ThemeToggleWithLabel } from "@/components/ThemeToggle";
import { useTheme } from "@/app/providers";
import HealthSync from "@/components/HealthSync";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

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

      {/* Appearance Settings */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Palette size={16} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Appearance</h2>
            <p className="text-xs text-gray-500">Theme and accent color</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Theme</span>
            <ThemeToggleWithLabel />
          </div>
          <div className="border-t border-gray-800 pt-3">
            <span className="text-xs text-gray-400 block mb-2">Mode</span>
            <div className="flex gap-2">
              {[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    theme === option.value
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Health Sync Section */}
      <div className="mb-4">
        <HealthSync />
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
