"use client";

import { useMemo, useState } from "react";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from "chart.js";
import { Radar } from "react-chartjs-2";
import { getGeneralGroupForSpecific } from "@/lib/db";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface WorkoutData { id: string; date: string; exercises: { name: string; sets: { reps: number; weight: number; completed: boolean }[] }[] }
interface CustomExercise { id: string; name: string; category: string; muscleGroup: string; specificMuscles?: string[] }
interface MuscleGroupChartProps { workouts: WorkoutData[]; customExercises: CustomExercise[] }

const GENERAL_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const;
type GeneralGroup = typeof GENERAL_GROUPS[number];

const EXERCISE_MUSCLE_MAP: Record<string, GeneralGroup> = {
  "Bench Press": "Chest", "Incline Bench Press": "Chest", "Cable Fly": "Chest", "Dips": "Chest",
  "Barbell Row": "Back", "Pull Up": "Back", "Lat Pulldown": "Back", "Face Pull": "Back",
  "Overhead Press": "Shoulders", "Lateral Raise": "Shoulders",
  "Dumbbell Curl": "Arms", "Tricep Pushdown": "Arms",
  "Squat": "Legs", "Deadlift": "Legs", "Romanian Deadlift": "Legs", "Leg Press": "Legs",
  "Leg Curl": "Legs", "Leg Extension": "Legs", "Calf Raise": "Legs", "Lunges": "Legs",
};

function categorizeMuscleGroup(muscleGroup: string): GeneralGroup | null {
  const lower = muscleGroup.toLowerCase();
  if (lower.includes("chest") || lower.includes("pec")) return "Chest";
  if (lower.includes("back") || lower.includes("lat") || lower.includes("trap")) return "Back";
  if (lower.includes("shoulder") || lower.includes("delt")) return "Shoulders";
  if (lower.includes("arm") || lower.includes("bicep") || lower.includes("tricep")) return "Arms";
  if (lower.includes("leg") || lower.includes("quad") || lower.includes("hamstring") || lower.includes("glute")) return "Legs";
  if (lower.includes("core") || lower.includes("ab") || lower.includes("oblique")) return "Core";
  return null;
}

export default function MuscleGroupChart({ workouts, customExercises }: MuscleGroupChartProps) {
  const [view, setView] = useState<'general' | 'specific'>('general');

  const { customGeneralMap } = useMemo(() => {
    const generalMap: Record<string, GeneralGroup> = {};
    for (const ce of customExercises) {
      if (ce.muscleGroup) { const group = categorizeMuscleGroup(ce.muscleGroup); if (group) generalMap[ce.name] = group; }
    }
    return { customGeneralMap: generalMap };
  }, [customExercises]);

  const generalVolumes = useMemo(() => {
    const volumes: Record<string, number> = {};
    for (const g of GENERAL_GROUPS) volumes[g] = 0;
    for (const workout of workouts) {
      for (const ex of workout.exercises) {
        let group: GeneralGroup | undefined = EXERCISE_MUSCLE_MAP[ex.name] || customGeneralMap[ex.name];
        if (group) { const completedSets = ex.sets.filter((s) => s.completed).length; volumes[group] += completedSets; }
      }
    }
    return volumes;
  }, [workouts, customGeneralMap]);

  const chartData = {
    labels: [...GENERAL_GROUPS],
    datasets: [{ label: "Sets (7 days)", data: GENERAL_GROUPS.map((g) => generalVolumes[g]),
      backgroundColor: "rgba(139, 92, 246, 0.2)", borderColor: "rgba(139, 92, 246, 0.8)",
      borderWidth: 2, pointBackgroundColor: "#8b5cf6", pointRadius: 4 }],
  };

  const options = { responsive: true, maintainAspectRatio: false,
    plugins: { tooltip: { backgroundColor: "#1f2937", titleColor: "#fff", bodyColor: "#d1d5db" } },
    scales: { r: { angleLines: { color: "rgba(75, 85, 99, 0.3)" }, grid: { color: "rgba(75, 85, 99, 0.3)" },
      pointLabels: { color: "#9ca3af", font: { size: 10 } }, ticks: { color: "#6b7280", backdropColor: "transparent", font: { size: 9 } }, suggestedMin: 0 } },
  } as const;

  return <div style={{ height: "220px" }}><Radar data={chartData} options={options} /></div>;
}
