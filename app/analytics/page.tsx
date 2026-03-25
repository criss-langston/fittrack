"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getWorkouts,
  getCustomExercises,
  getPersonalRecords,
  getHealthSettings,
} from "@/lib/db";
import WorkoutHeatmap from "@/components/WorkoutHeatmap";
import MuscleGroupChart from "@/components/MuscleGroupChart";
import HealthMetricsCard from "@/components/HealthMetricsCard";
import { Trophy, Activity, Dumbbell, Calendar, AlertCircle } from "lucide-react";

interface Workout {
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
  specificMuscles?: string[];
}

interface PR {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

export default function AnalyticsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [healthEnabled, setHealthEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workoutData, customExData, prData, healthSettings] = await Promise.all([
        getWorkouts(),
        getCustomExercises(),
        getPersonalRecords(),
        getHealthSettings(),
      ]);
      setWorkouts(workoutData as Workout[]);
      setCustomExercises(customExData as CustomExercise[]);
      setPrs(prData as PR[]);
      setHealthEnabled(healthSettings.enabled && healthSettings.connectedSources.length > 0);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
      setError("Failed to load analytics. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((sum, w) => {
    const vol = w.exercises.reduce((exSum, ex) => {
      return exSum + ex.sets
        .filter(s => s.completed)
        .reduce((setSum, s) => setSum + s.reps * s.weight, 0);
    }, 0);
    return sum + vol;
  }, 0);

  const exercisesWithPRs = new Set(prs.map(p => p.exercise)).size;

  const lastWeek = workouts.filter(w => {
    const date = new Date(w.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  });

  if (loading) {
    return (
      <div className="px-4 pt-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
              <div className="h-20 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-300 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => { setError(null); loadData(); }}
            className="ml-auto text-red-400 hover:text-red-200 text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-violet-400" />
            <span className="text-xs text-gray-500">Total Workouts</span>
          </div>
          <p className="text-3xl font-bold">{totalWorkouts}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-amber-400" />
            <span className="text-xs text-gray-500">Total Volume</span>
          </div>
          <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
          <p className="text-xs text-gray-500">lbs &times; reps</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-emerald-400" />
            <span className="text-xs text-gray-500">Recent (7d)</span>
          </div>
          <p className="text-3xl font-bold">{lastWeek.length}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-yellow-400" />
            <span className="text-xs text-gray-500">Personal Records</span>
          </div>
          <p className="text-3xl font-bold">{exercisesWithPRs}</p>
          <p className="text-xs text-gray-500">different exercises</p>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="text-sm font-semibold mb-3">Activity Heatmap</h3>
        <WorkoutHeatmap workouts={workouts} />
      </div>

      <div className="card mb-4">
        <h3 className="text-sm font-semibold mb-3">Muscle Engagement</h3>
        {workouts.length > 0 ? (
          <MuscleGroupChart workouts={workouts} customExercises={customExercises} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Dumbbell size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No workout data yet</p>
          </div>
        )}
      </div>

      {healthEnabled && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-3">Health Overview</h3>
          <HealthMetricsCard />
        </div>
      )}

      {prs.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-3">Personal Records</h3>
          <div className="space-y-2">
            {prs.slice(0, 5).map(pr => (
              <div key={pr.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{pr.exercise}</p>
                  <p className="text-xs text-gray-500">{new Date(pr.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-400">{pr.weight} lbs</p>
                  <p className="text-xs text-gray-500">{pr.reps} reps</p>
                </div>
              </div>
            ))}
          </div>
          {prs.length > 5 && (
            <p className="text-xs text-gray-500 mt-2 text-center">And {prs.length - 5} more...</p>
          )}
        </div>
      )}
    </div>
  );
}
