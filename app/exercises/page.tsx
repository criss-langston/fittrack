"use client";

import { Dumbbell } from "lucide-react";
import CustomExerciseManager from "@/components/CustomExerciseManager";

export default function ExercisesPage() {
  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-2 mb-6">
        <Dumbbell size={24} className="text-violet-400" />
        <h1 className="text-2xl font-bold">My Exercises</h1>
      </div>
      <CustomExerciseManager />
    </div>
  );
}
