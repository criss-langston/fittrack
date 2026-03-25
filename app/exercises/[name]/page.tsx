"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getExerciseHistory,
  getPersonalRecords,
  getCustomExercises,
  getProgressiveOverloadSuggestion,
  epley1RM,
} from "@/lib/db";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Calendar,
  Dumbbell,
  Lightbulb,
  ArrowUpRight,
  Minus,
  ArrowDownRight,
} from "lucide-react";

const ExerciseProgressChart = dynamic(
  () => import("@/components/ExerciseProgressChart"),
  {
    loading: () => <div className="h-[200px] bg-gray-800 rounded-lg animate-pulse" />,
    ssr: false,
  }
);

interface HistoryEntry {
  date: string;
  workoutId: string;
  sets: { reps: number; weight: number }[];
}

interface PR {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

interface CustomExercise {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  specificMuscles?: string[];
  notes?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

export default function ExerciseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const exerciseName = decodeURIComponent(params.name as string);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [customInfo, setCustomInfo] = useState<CustomExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chart" | "history" | "suggestions">("suggestions");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hist, prList, customs] = await Promise.all([
        getExerciseHistory(exerciseName, 50),
        getPersonalRecords(exerciseName),
        getCustomExercises(),
      ]);
      setHistory(hist);
      setPrs(prList as PR[]);
      const match = (customs as CustomExercise[]).find(
        (c) => c.name.toLowerCase() === exerciseName.toLowerCase()
      );
      setCustomInfo(match ?? null);
    } catch (err) {
      console.error("Failed to load exercise data:", err);
    } finally {
      setLoading(false);
    }
  }, [exerciseName]);

  useEffect(() => { load(); }, [load]);

  const chartEntries = [...history].reverse();
  const chartLabels = chartEntries.map((h) => formatDate(h.date));
  const chartWeights = chartEntries.map((h) =>
    h.sets.length > 0 ? Math.max(...h.sets.map((s) => s.weight)) : 0
  );
  const chart1RMs = chartEntries.map((h) => {
    if (h.sets.length === 0) return 0;
    return Math.max(...h.sets.map((s) => epley1RM(s.weight, s.reps)));
  });

  const best1RM = history.length > 0
    ? Math.max(...history.flatMap((h) => h.sets.map((s) => epley1RM(s.weight, s.reps))))
    : 0;
  const totalSets = history.reduce((acc, h) => acc + h.sets.length, 0);
  const bestWeight = prs.length > 0 ? Math.max(...prs.map((p) => p.weight)) : 0;
  const lastSession = history[0] ?? null;
  const overloadSuggestion = getProgressiveOverloadSuggestion(history);

  const TrendIcon = overloadSuggestion?.trend === "up" ? ArrowUpRight
    : overloadSuggestion?.trend === "down" ? ArrowDownRight : Minus;
  const TrendColor = overloadSuggestion?.trend === "up" ? "text-emerald-400"
    : overloadSuggestion?.trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div className="px-4 pt-6 pb-24">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <ArrowLeft size={16} />Back
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold">{exerciseName}</h1>
        {customInfo && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full capitalize">{customInfo.category}</span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{customInfo.muscleGroup}</span>
            {customInfo.specificMuscles?.map((m) => (
              <span key={m} className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">{m}</span>
            ))}
          </div>
        )}
        {customInfo?.notes && <p className="text-sm text-gray-500 mt-1 italic">{customInfo.notes}</p>}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : history.length === 0 ? (
        <div className="card text-center py-12">
          <Dumbbell size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No history yet</p>
          <p className="text-gray-600 text-sm mt-1">Log a workout with {exerciseName} to see stats here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Best Weight</p>
              <p className="text-xl font-bold text-violet-400">{bestWeight} <span className="text-sm font-normal text-gray-400">lbs</span></p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Est. 1RM</p>
              <p className="text-xl font-bold text-cyan-400">{best1RM} <span className="text-sm font-normal text-gray-400">lbs</span></p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Sessions</p>
              <p className="text-xl font-bold">{history.length}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Total Sets</p>
              <p className="text-xl font-bold">{totalSets}</p>
            </div>
          </div>

          {overloadSuggestion && (
            <div className="card mb-5 border-violet-500/30 bg-violet-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-amber-400" />
                <h3 className="font-semibold text-sm">Next Session Suggestion</h3>
                <div className={`ml-auto flex items-center gap-1 text-xs ${TrendColor}`}>
                  <TrendIcon size={12} />
                  <span className="capitalize">{overloadSuggestion.trend}</span>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-3">{overloadSuggestion.suggestion}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Target</p>
                  <p className="text-sm font-bold text-violet-400">{overloadSuggestion.targetWeight}lbs</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Reps</p>
                  <p className="text-sm font-bold text-violet-400">{overloadSuggestion.targetReps}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Best 1RM</p>
                  <p className="text-sm font-bold text-cyan-400">{overloadSuggestion.best1RM}lbs</p>
                </div>
              </div>
            </div>
          )}

          {lastSession && (
            <div className="card mb-5 flex items-start gap-3">
              <Calendar size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Session &mdash; {formatDateFull(lastSession.date)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {lastSession.sets.map((s, i) => (
                    <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                      {s.weight}lbs &times; {s.reps} <span className="text-gray-500">(~{epley1RM(s.weight, s.reps)})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-1 mb-4">
            {(["suggestions", "chart", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab === "suggestions" && <><Lightbulb size={14} />Advice</>}
                {tab === "chart" && <><TrendingUp size={14} />Progress</>}
                {tab === "history" && <><Calendar size={14} />History</>}
              </button>
            ))}
          </div>

          {activeTab === "chart" && (
            <div className="card">
              <h3 className="font-semibold text-sm mb-3">Weight Progression</h3>
              {chartWeights.length >= 2 ? (
                <div style={{ height: "200px" }}>
                  <ExerciseProgressChart labels={chartLabels} weights={chartWeights} oneRMs={chart1RMs} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">Log at least 2 sessions to see a trend.</p>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {history.map((entry, i) => (
                <div key={i} className="card">
                  <p className="text-xs text-gray-500 mb-2 font-medium">{formatDateFull(entry.date)}</p>
                  <div className="space-y-1">
                    {entry.sets.map((s, si) => (
                      <div key={si} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Set {si + 1} &mdash; {s.weight} lbs &times; {s.reps} reps</span>
                        <span className="text-xs text-gray-600">~{epley1RM(s.weight, s.reps)} 1RM</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
