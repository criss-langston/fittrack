"use client";

import { useState, useEffect } from "react";
import { getWorkouts, getWeightEntries, getPersonalRecords, getCustomExercises, getDailyNutritionSummary, addReadinessLog, getLatestReadinessLog, getReadinessScore, getWeeklyReadinessSummary, generateId, type ReadinessLevel, type SleepLevel, type TrainingLevel } from "@/lib/db";
import { Dumbbell, Scale, Trophy, Flame, Settings, Utensils, AlertCircle, BatteryCharging, HeartPulse, Moon, ActivitySquare, NotebookPen } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useToast } from "@/app/providers";

const WorkoutHeatmap = dynamic(() => import("@/components/WorkoutHeatmap"), {
  loading: () => <div className="h-24 bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false,
});

const MuscleGroupChart = dynamic(() => import("@/components/MuscleGroupChart"), {
  loading: () => <div className="h-40 bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false,
});

interface WorkoutData {
  id: string;
  date: string;
  exercises: {
    name: string;
    sets: { reps: number; weight: number; completed: boolean }[];
  }[];
}

interface CustomExercise {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
}

interface Stats {
  latestWeight: number | null;
  totalWorkouts: number;
  streak: number;
  latestPR: { exercise: string; weight: number; reps: number } | null;
  todayCalories: number;
  todayProtein: number;
}

const readinessDefaults = {
  energy: "Medium" as ReadinessLevel,
  recovery: "Medium" as ReadinessLevel,
  sleep: "OK" as SleepLevel,
  training: "OK" as TrainingLevel,
  notes: "",
};

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function calculateWorkoutStreak(workouts: WorkoutData[]) {
  if (workouts.length === 0) return 0;
  const dates = [...new Set(workouts.map((w) => new Date(w.date).toDateString()))];
  const today = new Date();
  const todayStr = today.toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  if (!dates.includes(todayStr) && !dates.includes(yesterdayStr)) return 0;
  let streak = 0;
  let checkDate = dates.includes(todayStr) ? today : new Date(Date.now() - 86400000);
  while (dates.includes(checkDate.toDateString())) {
    streak++;
    checkDate = new Date(checkDate.getTime() - 86400000);
  }
  return streak;
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<Stats>({
    latestWeight: null,
    totalWorkouts: 0,
    streak: 0,
    latestPR: null,
    todayCalories: 0,
    todayProtein: 0,
  });
  const [allWorkouts, setAllWorkouts] = useState<WorkoutData[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutData[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [chartsReady, setChartsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readinessDraft, setReadinessDraft] = useState(readinessDefaults);
  const [todayReadinessScore, setTodayReadinessScore] = useState<number | null>(null);
  const [coachSummary, setCoachSummary] = useState<{ avgReadiness: number; avgWeight: number; weightDelta: number; avgCalories: number; command: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrimary() {
      try {
        const [workouts, weightEntries, prs, nutrition, readinessLog, weeklySummary] = await Promise.all([
          getWorkouts(120),
          getWeightEntries(1),
          getPersonalRecords(),
          getDailyNutritionSummary(getTodayISO()),
          getLatestReadinessLog(),
          getWeeklyReadinessSummary(),
        ]);

        if (cancelled) return;

        const allWorkoutData = workouts as WorkoutData[];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = allWorkoutData.filter((w) => new Date(w.date) >= sevenDaysAgo);
        const sortedPRs = prs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setAllWorkouts(allWorkoutData);
        setRecentWorkouts(recent);
        setStats({
          latestWeight: weightEntries.length > 0 ? weightEntries[0].weight : null,
          totalWorkouts: workouts.length,
          streak: calculateWorkoutStreak(allWorkoutData),
          latestPR: sortedPRs.length > 0
            ? { exercise: sortedPRs[0].exercise, weight: sortedPRs[0].weight, reps: sortedPRs[0].reps }
            : null,
          todayCalories: nutrition.totalCalories,
          todayProtein: nutrition.totalProtein,
        });

        if (readinessLog && readinessLog.date === getTodayISO()) {
          setReadinessDraft({
            energy: readinessLog.energy,
            recovery: readinessLog.recovery,
            sleep: readinessLog.sleep,
            training: readinessLog.training,
            notes: readinessLog.notes || "",
          });
          setTodayReadinessScore(getReadinessScore(readinessLog));
        } else {
          setTodayReadinessScore(null);
        }

        setCoachSummary({
          avgReadiness: weeklySummary.avgReadiness,
          avgWeight: weeklySummary.avgWeight,
          weightDelta: weeklySummary.weightDelta,
          avgCalories: weeklySummary.avgCalories,
          command: weeklySummary.command,
        });
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        if (!cancelled) setError("Failed to load data. Please refresh the page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadSecondary() {
      try {
        const customs = await getCustomExercises();
        if (!cancelled) {
          setCustomExercises(customs as CustomExercise[]);
          if (typeof window !== "undefined") {
            window.requestAnimationFrame(() => setChartsReady(true));
          } else {
            setChartsReady(true);
          }
        }
      } catch (err) {
        console.error("Failed to load secondary dashboard data:", err);
      }
    }

    loadPrimary();
    loadSecondary();

    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const liveReadinessScore = Math.round((
    (readinessDraft.energy === "High" ? 10 : readinessDraft.energy === "Medium" ? 7 : 4) +
    (readinessDraft.recovery === "High" ? 10 : readinessDraft.recovery === "Medium" ? 7 : 4) +
    (readinessDraft.sleep === "Good" ? 10 : readinessDraft.sleep === "OK" ? 7 : 4) +
    (readinessDraft.training === "Great" ? 10 : readinessDraft.training === "OK" ? 7 : readinessDraft.training === "Rest day" ? 7 : 4)
  ) / 4);

  const saveReadiness = async () => {
    await addReadinessLog({
      id: generateId(),
      date: getTodayISO(),
      energy: readinessDraft.energy,
      recovery: readinessDraft.recovery,
      sleep: readinessDraft.sleep,
      training: readinessDraft.training,
      notes: readinessDraft.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setTodayReadinessScore(liveReadinessScore);
    const weeklySummary = await getWeeklyReadinessSummary();
    setCoachSummary({
      avgReadiness: weeklySummary.avgReadiness,
      avgWeight: weeklySummary.avgWeight,
      weightDelta: weeklySummary.weightDelta,
      avgCalories: weeklySummary.avgCalories,
      command: weeklySummary.command,
    });
    showToast("Readiness check-in saved.", "success");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in max-w-lg mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">{greeting()}</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">GainsVault</h1>
          <Link
            href="/settings"
            className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors touch-active"
          >
            <Settings size={18} className="text-gray-400" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-300 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={16} className="text-blue-400" />
            <span className="text-xs text-gray-500">Weight</span>
          </div>
          <p className="text-2xl font-bold">{stats.latestWeight ? `${stats.latestWeight} lbs` : "--"}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-violet-400" />
            <span className="text-xs text-gray-500">Workouts</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-orange-400" />
            <span className="text-xs text-gray-500">Streak</span>
          </div>
          <p className="text-2xl font-bold">{stats.streak} day{stats.streak !== 1 ? "s" : ""}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-yellow-400" />
            <span className="text-xs text-gray-500">Latest PR</span>
          </div>
          {stats.latestPR ? (
            <div>
              <p className="text-2xl font-bold">{stats.latestPR.weight} lbs</p>
              <p className="text-xs text-gray-500 mt-0.5">{stats.latestPR.exercise} x{stats.latestPR.reps}</p>
            </div>
          ) : (
            <p className="text-2xl font-bold">--</p>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BatteryCharging size={16} className="text-cyan-400" />
            <h2 className="text-base font-semibold">Readiness Check-In</h2>
          </div>
          <span className="text-xs text-gray-500">Today</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><HeartPulse size={12} /> Energy</label>
            <select className="input-field" value={readinessDraft.energy} onChange={(e) => setReadinessDraft((p) => ({ ...p, energy: e.target.value as ReadinessLevel }))}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><BatteryCharging size={12} /> Recovery</label>
            <select className="input-field" value={readinessDraft.recovery} onChange={(e) => setReadinessDraft((p) => ({ ...p, recovery: e.target.value as ReadinessLevel }))}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Moon size={12} /> Sleep</label>
            <select className="input-field" value={readinessDraft.sleep} onChange={(e) => setReadinessDraft((p) => ({ ...p, sleep: e.target.value as SleepLevel }))}>
              <option>Bad</option><option>OK</option><option>Good</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><ActivitySquare size={12} /> Training</label>
            <select className="input-field" value={readinessDraft.training} onChange={(e) => setReadinessDraft((p) => ({ ...p, training: e.target.value as TrainingLevel }))}>
              <option>Bad</option><option>OK</option><option>Great</option><option>Rest day</option>
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><NotebookPen size={12} /> Notes</label>
          <textarea className="input-field min-h-20 resize-none" value={readinessDraft.notes} onChange={(e) => setReadinessDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes about fatigue, stress, sleep, or training." />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Readiness score</p>
            <p className="text-2xl font-bold text-cyan-300">{liveReadinessScore}/10</p>
            {todayReadinessScore !== null && <p className="text-[11px] text-gray-500">Saved today: {todayReadinessScore}/10</p>}
          </div>
          <button onClick={saveReadiness} className="btn-primary">Save Check-In</button>
        </div>
      </div>

      {coachSummary && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Utensils size={16} className="text-green-400" />
              <h2 className="text-base font-semibold">Weekly Coach</h2>
            </div>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <div className="rounded-lg bg-gray-900/60 px-3 py-3"><p className="text-xs text-gray-500">Avg readiness</p><p className="text-xl font-bold">{coachSummary.avgReadiness || "—"}</p></div>
            <div className="rounded-lg bg-gray-900/60 px-3 py-3"><p className="text-xs text-gray-500">Avg calories</p><p className="text-xl font-bold">{coachSummary.avgCalories || "—"}</p></div>
            <div className="rounded-lg bg-gray-900/60 px-3 py-3"><p className="text-xs text-gray-500">Avg weight</p><p className="text-xl font-bold">{coachSummary.avgWeight ? coachSummary.avgWeight.toFixed(1) : "—"}</p></div>
            <div className="rounded-lg bg-gray-900/60 px-3 py-3"><p className="text-xs text-gray-500">Weight delta</p><p className="text-xl font-bold">{coachSummary.weightDelta > 0 ? '+' : ''}{coachSummary.weightDelta || 0}</p></div>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
            <p className="text-xs text-violet-200/80 mb-1">Coach command</p>
            <p className="font-semibold text-violet-100">{coachSummary.command}</p>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Utensils size={16} className="text-green-400" />
            <h2 className="text-base font-semibold">Today&apos;s Nutrition</h2>
          </div>
          <Link href="/nutrition" className="text-xs text-violet-400 hover:text-violet-300">View All</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Calories</p>
            <p className="text-xl font-bold">{stats.todayCalories}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Protein</p>
            <p className="text-xl font-bold">{stats.todayProtein}g</p>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="text-base font-semibold mb-3">Activity</h2>
        {chartsReady ? <WorkoutHeatmap workouts={allWorkouts} /> : <div className="h-24 bg-gray-800 rounded-lg animate-pulse" />}
      </div>

      {chartsReady && recentWorkouts.length > 0 && customExercises.length > 0 && (
        <div className="card mb-4">
          <h2 className="text-base font-semibold mb-3">Muscle Balance (7 Days)</h2>
          <MuscleGroupChart workouts={recentWorkouts} customExercises={customExercises} />
        </div>
      )}

      <div className="card">
        <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/workouts" className="btn-primary text-center text-sm">Log Workout</Link>
          <Link href="/nutrition" className="btn-secondary text-center text-sm">Log Macros</Link>
        </div>
      </div>
    </div>
  );
}
