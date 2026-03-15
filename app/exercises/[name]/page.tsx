"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getExerciseHistory,
  getPersonalRecords,
  getCustomExercises,
} from "@/lib/db";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ArrowLeft, Trophy, TrendingUp, Calendar, Dumbbell } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

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

// Epley 1RM formula
function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
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
  const [activeTab, setActiveTab] = useState<'chart' | 'history'>('chart');

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
    } finally {
      setLoading(false);
    }
  }, [exerciseName]);

  useEffect(() => { load(); }, [load]);

  // Max weight per session (oldest first for chart)
  const chartEntries = [...history].reverse();
  const chartLabels = chartEntries.map((h) => formatDate(h.date));
  const chartWeights = chartEntries.map((h) =>
    h.sets.length > 0 ? Math.max(...h.sets.map((s) => s.weight)) : 0
  );

  // Estimated 1RM per session
  const chart1RMs = chartEntries.map((h) => {
    if (h.sets.length === 0) return 0;
    return Math.max(...h.sets.map((s) => epley1RM(s.weight, s.reps)));
  });

  // Stats
  const best1RM = history.length > 0
    ? Math.max(...history.flatMap((h) => h.sets.map((s) => epley1RM(s.weight, s.reps))))
    : 0;
  const totalSets = history.reduce((acc, h) => acc + h.sets.length, 0);
  const bestWeight = prs.length > 0 ? Math.max(...prs.map((p) => p.weight)) : 0;
  const lastSession = history[0] ?? null;

  const lineData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Max Weight (lbs)",
        data: chartWeights,
        borderColor: "rgba(139, 92, 246, 0.9)",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: "#8b5cf6",
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      },
      {
        label: "Est. 1RM (lbs)",
        data: chart1RMs,
        borderColor: "rgba(6, 182, 212, 0.7)",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#06b6d4",
        fill: false,
        tension: 0.35,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#d1d5db",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: "rgba(75, 85, 99, 0.2)" },
        ticks: { color: "#6b7280", font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(75, 85, 99, 0.2)" },
        ticks: { color: "#6b7280", font: { size: 10 } },
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors mb-4 text-sm"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">{exerciseName}</h1>
        {customInfo && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full capitalize">
              {customInfo.category}
            </span>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {customInfo.muscleGroup}
            </span>
            {customInfo.specificMuscles?.map((m) => (
              <span key={m} className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                {m}
              </span>
            ))}
          </div>
        )}
        {customInfo?.notes && (
          <p className="text-sm text-gray-500 mt-1 italic">{customInfo.notes}</p>
        )}
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
          {/* Stat cards */}
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

          {/* Last session summary */}
          {lastSession && (
            <div className="card mb-5 flex items-start gap-3">
              <Calendar size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Session &#x2014; {formatDateFull(lastSession.date)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {lastSession.sets.map((s, i) => (
                    <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                      {s.weight}lbs &#x00d7; {s.reps} <span className="text-gray-500">(&#x7e;{epley1RM(s.weight, s.reps)})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'chart' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <TrendingUp size={14} />Progress
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'history' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              <Calendar size={14} />History
            </button>
          </div>

          {/* Chart tab */}
          {activeTab === 'chart' && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Weight Progression</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-violet-500 inline-block rounded" />Max Weight
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-cyan-500 inline-block rounded" />Est. 1RM
                  </span>
                </div>
              </div>
              {chartWeights.length >= 2 ? (
                <div style={{ height: '200px' }}>
                  <Line data={lineData} options={lineOptions} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">Log at least 2 sessions to see a trend.</p>
              )}
            </div>
          )}

          {/* History tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {prs.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Trophy size={14} className="text-amber-400" />Personal Records
                  </h3>
                  <div className="space-y-2">
                    {prs
                      .sort((a, b) => b.weight - a.weight)
                      .map((pr) => (
                        <div key={pr.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{pr.weight} lbs &#x00d7; {pr.reps} rep{pr.reps !== 1 ? 's' : ''}</span>
                          <div className="text-right">
                            <span className="text-gray-500 text-xs">{formatDateFull(pr.date)}</span>
                            <p className="text-xs text-cyan-400">&#x7e;{epley1RM(pr.weight, pr.reps)} lbs 1RM</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {history.map((entry, i) => (
                <div key={i} className="card">
                  <p className="text-xs text-gray-500 mb-2 font-medium">{formatDateFull(entry.date)}</p>
                  {entry.sets.length === 0 ? (
                    <p className="text-xs text-gray-600">No completed sets recorded</p>
                  ) : (
                    <div className="space-y-1">
                      {entry.sets.map((s, si) => (
                        <div key={si} className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Set {si + 1} &#x2014; {s.weight} lbs &#x00d7; {s.reps} reps</span>
                          <span className="text-xs text-gray-600">&#x7e;{epley1RM(s.weight, s.reps)} 1RM</span>
                        </div>
                      ))}
                      <div className="pt-1 mt-1 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                        <span>Volume: {entry.sets.reduce((a, s) => a + s.weight * s.reps, 0).toLocaleString()} lbs</span>
                        <span>Best: {Math.max(...entry.sets.map((s) => s.weight))} lbs</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
