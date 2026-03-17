"use client";

import { useState, useEffect } from "react";
import { getWorkouts, getWeightEntries, getPersonalRecords, getCustomExercises, getDailyNutritionSummary } from "@/lib/db";
import { Dumbbell, Scale, Trophy, Flame, Settings, Utensils } from "lucide-react";
import Link from "next/link";
import WorkoutHeatmap from "@/components/WorkoutHeatmap";
import MuscleGroupChart from "@/components/MuscleGroupChart";

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

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function DashboardPage() {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [workouts, weightEntries, prs, customs, nutrition] = await Promise.all([
        getWorkouts(),
        getWeightEntries(1),
        getPersonalRecords(),
        getCustomExercises(),
        getDailyNutritionSummary(getTodayISO()),
      ]);

      setAllWorkouts(workouts as WorkoutData[]);

      // Filter workouts from last 7 days for muscle chart
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = (workouts as WorkoutData[]).filter(
        (w) => new Date(w.date) >= sevenDaysAgo
      );
      setRecentWorkouts(recent);
      setCustomExercises(customs as CustomExercise[]);

      // Calculate streak
      let streak = 0;
      if (workouts.length > 0) {
        const dates = [...new Set(
          workouts.map((w) => new Date(w.date).toDateString())
        )];
        const today = new Date();
        const todayStr = today.toDateString();
        const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

        // Start from today or yesterday
        if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
          let checkDate = dates.includes(todayStr) ? today : new Date(Date.now() - 86400000);
          while (dates.includes(checkDate.toDateString())) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
          }
        }
      }

      // Latest PR (sort by date desc)
      const sortedPRs = prs.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setStats({
        latestWeight: weightEntries.length > 0 ? weightEntries[0].weight : null,
        totalWorkouts: workouts.length,
        streak,
        latestPR: sortedPRs.length > 0
          ? { exercise: sortedPRs[0].exercise, weight: sortedPRs[0].weight, reps: sortedPRs[0].reps }
          : null,
        todayCalories: nutrition.totalCalories,
        todayProtein: nutrition.totalProtein,
      });
      setLoading(false);
    }
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    return "Good afternoon";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">{greeting()}</p>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">FitTrack</h1>
          <Link
            href="/settings"
            className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors touch-active"
          >
            <Settings size={18} className="text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={16} className="text-blue-400" />
            <span className="text-xs text-gray-500">Weight</span>
          </div>
          <p className="text-2xl font-bold">
            {stats.latestWeight ? `${stats.latestWeight} lbs` : "--"}
          </p>
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
          <p className="text-2xl font-bold">
            {stats.streak} day{stats.streak !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-yellow-400" />
            <span className="text-xs text-gray-500">Latest PR</span>
          </div>
          {stats.latestPR ? (
            <div>
              <p className="text-2xl font-bold">
                {stats.latestPR.weight} lbs
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {stats.latestPR.exercise} x{stats.latestPR.reps}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold">--</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Nutrition */}
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

      {/* Activity Heatmap */}
      <div className="card mb-4">
        <h2 className="text-base font-semibold mb-3">Activity</h2>
        <WorkoutHeatmap workouts={allWorkouts} />
      </div>

      {/* Muscle Balance Chart */}
      {recentWorkouts.length > 0 && (
        <>
          <div className="card mb-4">
            <h2 className="text-base font-semibold mb-3">Muscle Balance (7 Days)</h2>
            <MuscleGroupChart workouts={recentWorkouts} customExercises={customExercises} />
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/workouts" className="btn-primary text-center text-sm">
            Log Workout
          </Link>
          <Link href="/nutrition" className="btn-secondary text-center text-sm">
            Log Meal
          </Link>
        </div>
      </div>
    </div>
  );
}