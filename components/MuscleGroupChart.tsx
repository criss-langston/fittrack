"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Radar } from "react-chartjs-2";

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
}

interface MuscleGroupChartProps {
  workouts: WorkoutData[];
  customExercises: CustomExercise[];
}

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const;

const EXERCISE_MUSCLE_MAP: Record<string, typeof MUSCLE_GROUPS[number]> = {
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

function categorizeMuscleGroup(muscleGroup: string): typeof MUSCLE_GROUPS[number] | null {
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
  const volumeByGroup = useMemo(() => {
    const volumes: Record<string, number> = {};
    for (const g of MUSCLE_GROUPS) {
      volumes[g] = 0;
    }

    // Build custom exercise muscle group map
    const customMap: Record<string, typeof MUSCLE_GROUPS[number]> = {};
    for (const ce of customExercises) {
      if (ce.muscleGroup) {
        const group = categorizeMuscleGroup(ce.muscleGroup);
        if (group) {
          customMap[ce.name] = group;
        }
      }
    }

    for (const workout of workouts) {
      for (const ex of workout.exercises) {
        // Check built-in mapping first
        let group = EXERCISE_MUSCLE_MAP[ex.name];

        // Then check custom exercises mapping
        if (!group) {
          group = customMap[ex.name];
        }

        // Check for core keywords in name
        if (!group) {
          const lower = ex.name.toLowerCase();
          if (lower.includes("core") || lower.includes("ab") || lower.includes("plank")) {
            group = "Core";
          }
        }

        if (group) {
          // Count completed sets
          const completedSets = ex.sets.filter((s) => s.completed).length;
          volumes[group] += completedSets;
        }
      }
    }

    return volumes;
  }, [workouts, customExercises]);

  const data = {
    labels: [...MUSCLE_GROUPS],
    datasets: [
      {
        label: "Sets (7 days)",
        data: MUSCLE_GROUPS.map((g) => volumeByGroup[g]),
        backgroundColor: "rgba(139, 92, 246, 0.2)",
        borderColor: "rgba(139, 92, 246, 0.8)",
        borderWidth: 2,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#8b5cf6",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
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
        angleLines: {
          color: "rgba(75, 85, 99, 0.3)",
        },
        grid: {
          color: "rgba(75, 85, 99, 0.3)",
        },
        pointLabels: {
          color: "#9ca3af",
          font: { size: 11, weight: 500 as const },
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
    <div className="h-64">
      <Radar data={data} options={options} />
    </div>
  );
}
