"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { getGeneralGroupForSpecific } from "@/lib/db";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

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
  specificMuscles?: string[];
}

interface MuscleGroupChartProps {
  workouts: WorkoutData[];
  customExercises: CustomExercise[];
}

const GENERAL_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const;
type GeneralGroup = typeof GENERAL_GROUPS[number];

const EXERCISE_MUSCLE_MAP: Record<string, GeneralGroup> = {
  "Bench Press": "Chest",
  "Incline Bench Press": "Chest",
  "Cable Fly": "Chest",
  "Dips": "Chest",
  "Barbell Row": "Back",
  "Pull Up": "Back",
  "Lat Pulldown": "Back",
  "Face Pull": "Back",
  "Overhead Press": "Shoulders",
  "Lateral Raise": "Shoulders",
  "Dumbbell Curl": "Arms",
  "Tricep Pushdown": "Arms",
  "Squat": "Legs",
  "Deadlift": "Legs",
  "Romanian Deadlift": "Legs",
  "Leg Press": "Legs",
  "Leg Curl": "Legs",
  "Leg Extension": "Legs",
  "Calf Raise": "Legs",
  "Lunges": "Legs",
};

function categorizeMuscleGroup(muscleGroup: string): GeneralGroup | null {
  const lower = muscleGroup.toLowerCase();
  if (lower.includes("chest") || lower.includes("pec")) return "Chest";
  if (lower.includes("back") || lower.includes("lat") || lower.includes("trap") || lower.includes("rhomboid")) return "Back";
  if (lower.includes("shoulder") || lower.includes("delt")) return "Shoulders";
  if (lower.includes("arm") || lower.includes("bicep") || lower.includes("tricep") || lower.includes("forearm")) return "Arms";
  if (lower.includes("leg") || lower.includes("quad") || lower.includes("hamstring") || lower.includes("glute") || lower.includes("calf") || lower.includes("thigh")) return "Legs";
  if (lower.includes("core") || lower.includes("ab") || lower.includes("oblique")) return "Core";
  return null;
}

export default function MuscleGroupChart({ workouts, customExercises }: MuscleGroupChartProps) {
  const [view, setView] = useState<'general' | 'specific'>('general');

  // Build maps from custom exercises
  const { customGeneralMap, customSpecificMap } = useMemo(() => {
    const generalMap: Record<string, GeneralGroup> = {};
    const specificMap: Record<string, string[]> = {};
    for (const ce of customExercises) {
      if (ce.muscleGroup) {
        const group = categorizeMuscleGroup(ce.muscleGroup);
        if (group) generalMap[ce.name] = group;
      }
      if (ce.specificMuscles && ce.specificMuscles.length > 0) {
        specificMap[ce.name] = ce.specificMuscles;
      }
    }
    return { customGeneralMap: generalMap, customSpecificMap: specificMap };
  }, [customExercises]);

  // General group volumes
  const generalVolumes = useMemo(() => {
    const volumes: Record<string, number> = {};
    for (const g of GENERAL_GROUPS) volumes[g] = 0;

    for (const workout of workouts) {
      for (const ex of workout.exercises) {
        let group: GeneralGroup | undefined = EXERCISE_MUSCLE_MAP[ex.name];
        if (!group) group = customGeneralMap[ex.name];
        if (!group) {
          const lower = ex.name.toLowerCase();
          if (lower.includes("core") || lower.includes("ab") || lower.includes("plank")) group = "Core";
        }
        if (group) {
          const completedSets = ex.sets.filter((s) => s.completed).length;
          volumes[group] += completedSets;
        }
      }
    }
    return volumes;
  }, [workouts, customGeneralMap]);

  // Specific muscle volumes
  const specificVolumes = useMemo(() => {
    const volumes: Record<string, number> = {};

    for (const workout of workouts) {
      for (const ex of workout.exercises) {
        const specificMuscles = customSpecificMap[ex.name];
        if (specificMuscles && specificMuscles.length > 0) {
          const completedSets = ex.sets.filter((s) => s.completed).length;
          for (const muscle of specificMuscles) {
            volumes[muscle] = (volumes[muscle] ?? 0) + completedSets;
          }
        }
      }
    }
    return volumes;
  }, [workouts, customSpecificMap]);

  const hasSpecificData = Object.keys(specificVolumes).length > 0;

  // Top 8 specific muscles by volume
  const specificLabels = useMemo(() => {
    return Object.entries(specificVolumes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([muscle]) => muscle);
  }, [specificVolumes]);

  const generalData = {
    labels: [...GENERAL_GROUPS],
    datasets: [{
      label: "Sets (7 days)",
      data: GENERAL_GROUPS.map((g) => generalVolumes[g]),
      backgroundColor: "rgba(139, 92, 246, 0.2)",
      borderColor: "rgba(139, 92, 246, 0.8)",
      borderWidth: 2,
      pointBackgroundColor: "#8b5cf6",
      pointBorderColor: "#8b5cf6",
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const specificData = {
    labels: specificLabels.map((l) => l.length > 20 ? l.slice(0, 18) + "\u2026" : l),
    datasets: [{
      label: "Sets (7 days)",
      data: specificLabels.map((m) => specificVolumes[m] ?? 0),
      backgroundColor: "rgba(6, 182, 212, 0.2)",
      borderColor: "rgba(6, 182, 212, 0.8)",
      borderWidth: 2,
      pointBackgroundColor: "#06b6d4",
      pointBorderColor: "#06b6d4",
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#d1d5db",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: (ctx: { parsed: { r: number | null } }) => `${ctx.parsed.r ?? 0} sets`,
        },
      },
    },
    scales: {
      r: {
        angleLines: { color: "rgba(75, 85, 99, 0.3)" },
        grid: { color: "rgba(75, 85, 99, 0.3)" },
        pointLabels: {
          color: "#9ca3af",
          font: { size: 10, weight: 500 as const },
        },
        ticks: {
          color: "#6b7280",
          backdropColor: "transparent",
          font: { size: 9 },
          stepSize: 1,
        },
        suggestedMin: 0,
      },
    },
  } as const;

  return (
    <div>
      {/* View toggle -- only show if specific data exists */}
      {hasSpecificData && (
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setView('general')}
            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
              view === 'general'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setView('specific')}
            className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
              view === 'specific'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            Specific
          </button>
        </div>
      )}

      <div style={{ height: "220px" }}>
        {view === 'general' || !hasSpecificData ? (
          <Radar data={generalData} options={options} />
        ) : (
          specificLabels.length >= 3 ? (
            <Radar data={specificData} options={options} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-gray-500 text-sm">Not enough specific muscle data yet.</p>
              <p className="text-gray-600 text-xs mt-1">Log more exercises with specific muscles assigned.</p>
            </div>
          )
        )}
      </div>

      {/* Specific muscle breakdown list */}
      {view === 'specific' && hasSpecificData && specificLabels.length >= 3 && (
        <div className="mt-3 space-y-1">
          {specificLabels.map((muscle) => {
            const sets = specificVolumes[muscle] ?? 0;
            const max = Math.max(...Object.values(specificVolumes));
            const pct = max > 0 ? (sets / max) * 100 : 0;
            const generalGroup = getGeneralGroupForSpecific(muscle);
            return (
              <div key={muscle} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-44 truncate">{muscle}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{sets}s</span>
                {generalGroup && (
                  <span className="text-[10px] text-gray-600 w-16 truncate">{generalGroup}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
