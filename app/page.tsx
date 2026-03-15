"use client";

import { useState, useEffect } from "react";
import { getWorkouts, getWeightEntries, getPersonalRecords } from "@/lib/db";
import { Dumbbell, Scale, Trophy, Flame, Settings } from "lucide-react";
import Link from "next/link";

interface Stats {
  latestWeight: number | null;
  totalWorkouts: number;
  streak: number;
  latestPR: { exercise: string; weight: number; reps: number } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    latestWeight: null,
    totalWorkouts: 0,
    streak: 0,
    latestPR: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [workouts, weightEntries, prs] = await Promise.all([
        getWorkouts(),
        getWeightEntries(1),
        getPersonalRecords(),
      ]);

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
      });
      setLoading(false);
    }
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-400">{greeting()}</p>
        <h1 className="text-2xl font-bold">FitTrack</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 stagger-children">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Scale size={16} className="text-violet-400" />
            </div>
            <span className="text-xs text-gray-400">Weight</span>
          </div>
          <p className="text-xl font-bold">
            {stats.latestWeight ? `${stats.latestWeight} lbs` : "--"}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Dumbbell size={16} className="text-blue-400" />
            </div>
            <span className="text-xs text-gray-400">Workouts</span>
          </div>
          <p className="text-xl font-bold">{stats.totalWorkouts}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600/20 flex items-center justify-center">
              <Flame size={16} className="text-orange-400" />
            </div>
            <span className="text-xs text-gray-400">Streak</span>
          </div>
          <p className="text-xl font-bold">
            {stats.streak} day{stats.streak !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <Trophy size={16} className="text-yellow-400" />
            </div>
            <span className="text-xs text-gray-400">Latest PR</span>
          </div>
          {stats.latestPR ? (
            <div>
              <p className="text-sm font-bold">{stats.latestPR.weight} lbs</p>
              <p className="text-xs text-gray-500">
                {stats.latestPR.exercise} x{stats.latestPR.reps}
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold">--</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/workouts" className="btn-secondary text-center flex items-center justify-center gap-2">
          <Dumbbell size={18} /> Log Workout
        </Link>
        <Link href="/log" className="btn-secondary text-center flex items-center justify-center gap-2">
          <Scale size={18} /> Log Weight
        </Link>
      </div>
    </div>
  );
}
