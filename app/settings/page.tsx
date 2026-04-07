"use client";

import { ArrowLeft, Info, Palette, Shield } from "lucide-react";
import Link from "next/link";
import DataBackup from "@/components/DataBackup";
import { ThemeToggleWithLabel } from "@/components/ThemeToggle";
import { useTheme } from "@/app/providers";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors touch-active"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-xs text-gray-500">Private, local, and optimized for your device</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
            <Palette size={16} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Appearance</h2>
            <p className="text-xs text-gray-500">Theme controls for mobile-friendly use</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Quick toggle</span>
            <ThemeToggleWithLabel />
          </div>
          <div className="border-t border-gray-800 pt-3">
            <span className="text-xs text-gray-400 block mb-2">Mode</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                  className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${
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

      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <Shield size={16} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Local-first privacy</h2>
            <p className="text-xs text-gray-500">No backend account required</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>• Your workouts, meals, and measurements stay on this device.</li>
          <li>• Use backup/export to keep copies or move data manually.</li>
          <li>• FitTrack stays focused on fast, offline-friendly tracking.</li>
        </ul>
      </div>

      <div className="mb-4">
        <DataBackup />
      </div>

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
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Version</span>
            <span className="text-gray-300">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Storage</span>
            <span className="text-gray-300">IndexedDB (local)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Sync model</span>
            <span className="text-gray-300">Manual export/import</span>
          </div>
        </div>
      </div>
    </div>
  );
}
