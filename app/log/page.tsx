"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addWeightEntry,
  getWeightEntries,
  deleteWeightEntry,
  generateId,
} from "@/lib/db";
import { Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Chart.js component to keep it out of the initial bundle
const WeightLineChart = dynamic(() => import("@/components/WeightLineChart"), {
  loading: () => <div className="h-48 bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false,
});

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  calories?: number;
  notes?: string;
}

export default function LogPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");

  const loadEntries = useCallback(async () => {
    try {
      const data = await getWeightEntries();
      setEntries(data as WeightEntry[]);
    } catch (err) {
      console.error("Failed to load weight entries:", err);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleLog = async () => {
    const w = parseFloat(weight);
    if (!w || isNaN(w)) return;
    const entry: WeightEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      weight: w,
      calories: calories ? parseInt(calories) : undefined,
      notes: notes.trim() || undefined,
    };
    try {
      await addWeightEntry(entry);
      setWeight("");
      setCalories("");
      setNotes("");
      await loadEntries();
    } catch (err) {
      console.error("Failed to save weight entry:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWeightEntry(id);
      await loadEntries();
    } catch (err) {
      console.error("Failed to delete weight entry:", err);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Chart data — last 30 entries in chronological order
  const chartEntries = [...entries].reverse().slice(-30);

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Log</h1>
        <p className="text-sm text-gray-400 mt-0.5">{today}</p>
      </div>

      {/* Quick Entry Form */}
      <div className="card mb-6 space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Weight (lbs)</label>
          <input
            type="number"
            className="input-field text-2xl font-bold text-center !py-4"
            placeholder="0.0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            step="0.1"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Calories</label>
          <input
            type="number"
            className="input-field text-center"
            placeholder="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
          <input
            type="text"
            className="input-field"
            placeholder="How are you feeling?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button onClick={handleLog} className="btn-primary w-full">
          Log Entry
        </button>
      </div>

      {/* Weight Chart */}
      {chartEntries.length >= 2 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Weight Trend</h2>
          <div className="h-48">
            <WeightLineChart entries={chartEntries} />
          </div>
        </div>
      )}

      {/* Entry History */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400 mb-2">History</h2>
        {entries.length === 0 && (
          <p className="text-center py-10 text-gray-500 text-sm">No entries yet. Log your first weight above.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="card flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-lg">{entry.weight}</span>
                <span className="text-xs text-gray-500">lbs</span>
                {entry.calories && (
                  <span className="text-xs text-gray-400 ml-2">{entry.calories} cal</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(entry.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {entry.notes && <p className="text-xs text-gray-400 mt-0.5">{entry.notes}</p>}
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              className="text-gray-600 hover:text-red-400 p-2 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
