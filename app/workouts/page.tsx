"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addWorkout,
  getWorkouts,
  deleteWorkout,
  addPersonalRecord,
  getPersonalRecords,
  generateId,
} from "@/lib/db";
import { Plus, Trash2, ChevronDown, ChevronUp, Trophy, X } from "lucide-react";

const COMMON_EXERCISES = [
  "Bench Press","Squat","Deadlift","Overhead Press","Barbell Row",
  "Pull Up","Lat Pulldown","Leg Press","Romanian Deadlift","Incline Bench Press",
  "Dumbbell Curl","Tricep Pushdown","Lateral Raise","Cable Fly","Leg Curl",
  "Leg Extension","Calf Raise","Face Pull","Dips","Lunges",
];

interface WorkoutSet {
  reps: number;
  weight: number;
  completed: boolean;
}

interface Exercise {
  name: string;
  sets: WorkoutSet[];
}

interface Workout {
  id: string;
  date: string;
  exercises: Exercise[];
  duration?: number;
  notes?: string;
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isNew, setIsNew] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeExIdx, setActiveExIdx] = useState<number | null>(null);

  const loadWorkouts = useCallback(async () => {
    const data = await getWorkouts();
    setWorkouts(data as Workout[]);
  }, []);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const startNewWorkout = () => {
    setIsNew(true);
    setExercises([]);
    setNewPRs([]);
  };

  const cancelWorkout = () => {
    setIsNew(false);
    setExercises([]);
    setSearchTerm("");
    setShowSuggestions(false);
    setActiveExIdx(null);
  };

  const addExercise = (name: string) => {
    if (!name.trim()) return;
    setExercises((prev) => [
      ...prev,
      { name: name.trim(), sets: [{ reps: 0, weight: 0, completed: false }] },
    ]);
    setSearchTerm("");
    setShowSuggestions(false);
    setActiveExIdx(null);
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIdx], sets: [...copy[exIdx].sets] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({ reps: lastSet?.reps || 0, weight: lastSet?.weight || 0, completed: false });
      copy[exIdx] = ex;
      return copy;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIdx], sets: copy[exIdx].sets.filter((_, i) => i !== setIdx) };
      copy[exIdx] = ex;
      return copy;
    });
  };

  const updateSet = (exIdx: number, setIdx: number, field: "reps" | "weight", value: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIdx], sets: [...copy[exIdx].sets] };
      ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: value };
      copy[exIdx] = ex;
      return copy;
    });
  };

  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIdx], sets: [...copy[exIdx].sets] };
      ex.sets[setIdx] = { ...ex.sets[setIdx], completed: !ex.sets[setIdx].completed };
      copy[exIdx] = ex;
      return copy;
    });
  };

  const finishWorkout = async () => {
    if (exercises.length === 0) return;
    const workout: Workout = {
      id: generateId(),
      date: new Date().toISOString(),
      exercises,
    };
    await addWorkout(workout);

    // Check for PRs
    const prs: string[] = [];
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.weight <= 0) continue;
        const existing = await getPersonalRecords(ex.name);
        const samReps = existing.filter((p) => p.reps === set.reps);
        const currentBest = samReps.length > 0 ? Math.max(...samReps.map((p) => p.weight)) : 0;
        if (set.weight > currentBest) {
          await addPersonalRecord({
            id: generateId(),
            exercise: ex.name,
            weight: set.weight,
            reps: set.reps,
            date: new Date().toISOString(),
          });
          prs.push(`${ex.name}: ${set.weight} lbs x ${set.reps}`);
        }
      }
    }
    setNewPRs(prs);
    setIsNew(false);
    setExercises([]);
    await loadWorkouts();

    if (prs.length > 0) {
      setTimeout(() => setNewPRs([]), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteWorkout(id);
    await loadWorkouts();
  };

  const calcVolume = (exs: Exercise[]) =>
    exs.reduce(
      (total, ex) =>
        total +
        ex.sets
          .filter((s) => s.completed)
          .reduce((sum, s) => sum + s.reps * s.weight, 0),
      0
    );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const filteredSuggestions = COMMON_EXERCISES.filter(
    (e) =>
      e.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !exercises.some((ex) => ex.name === e)
  );

  return (
    <div className="px-4 pt-6">
      {/* PR celebration */}
      {newPRs.length > 0 && (
        <div className="fixed inset-x-4 top-4 z-50 rounded-2xl bg-violet-600 p-4 shadow-lg shadow-violet-600/30 animate-pulse">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={20} />
            <span className="font-bold">New Personal Record{newPRs.length > 1 ? "s" : ""}!</span>
          </div>
          {newPRs.map((pr, i) => (
            <p key={i} className="text-sm text-violet-100">{pr}</p>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workouts</h1>
        {!isNew && (
          <button onClick={startNewWorkout} className="btn-primary flex items-center gap-1.5 text-sm !px-4 !py-2">
            <Plus size={18} /> New
          </button>
        )}
      </div>

      {/* New Workout Form */}
      {isNew && (
        <div className="card mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Workout</h2>
            <button onClick={cancelWorkout} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Exercise search / add */}
          <div className="relative">
            <input
              type="text"
              className="input-field"
              placeholder="Add exercise..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchTerm.trim()) {
                  addExercise(searchTerm);
                }
              }}
            />
            {showSuggestions && searchTerm && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 rounded-xl border border-gray-700 max-h-48 overflow-y-auto z-30">
                {filteredSuggestions.map((name) => (
                  <button
                    key={name}
                    className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addExercise(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exercises */}
          {exercises.map((ex, exIdx) => (
            <div key={exIdx} className="bg-gray-800/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-violet-400">{ex.name}</h3>
                <button onClick={() => removeExercise(exIdx)} className="text-gray-500 hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Set headers */}
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-xs text-gray-500 px-1">
                <span>Set</span>
                <span>Weight (lbs)</span>
                <span>Reps</span>
                <span></span>
              </div>

              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className={`grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center ${
                    set.completed ? "opacity-60" : ""
                  }`}
                >
                  <button
                    onClick={() => toggleSetComplete(exIdx, setIdx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                      set.completed
                        ? "bg-violet-600 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {setIdx + 1}
                  </button>
                  <input
                    type="number"
                    className="input-field text-center !py-1.5 text-sm"
                    placeholder="0"
                    value={set.weight || ""}
                    onChange={(e) => updateSet(exIdx, setIdx, "weight", Number(e.target.value))}
                  />
                  <input
                    type="number"
                    className="input-field text-center !py-1.5 text-sm"
                    placeholder="0"
                    value={set.reps || ""}
                    onChange={(e) => updateSet(exIdx, setIdx, "reps", Number(e.target.value))}
                  />
                  <button
                    onClick={() => removeSet(exIdx, setIdx)}
                    className="text-gray-600 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              <button
                onClick={() => addSet(exIdx)}
                className="w-full text-xs text-gray-500 hover:text-gray-300 py-1.5 border border-dashed border-gray-700 rounded-lg transition-colors"
              >
                + Add Set
              </button>
            </div>
          ))}

          {exercises.length > 0 && (
            <button onClick={finishWorkout} className="btn-primary w-full">
              Finish Workout
            </button>
          )}
        </div>
      )}

      {/* Workout History */}
      <div className="space-y-3">
        {workouts.length === 0 && !isNew && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">No workouts yet</p>
            <p className="text-sm mt-1">Start your first workout above</p>
          </div>
        )}
        {workouts.map((w) => {
          const isExpanded = expandedId === w.id;
          const volume = calcVolume(w.exercises);
          return (
            <div key={w.id} className="card">
              <button
                onClick={() => setExpandedId(isExpanded ? null : w.id)}
                className="w-full flex items-center justify-between"
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">{formatDate(w.date)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {w.exercises.map((e) => e.name).join(", ")}
                  </p>
                  <p className="text-xs text-violet-400 mt-0.5">
                    Volume: {volume.toLocaleString()} lbs
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp size={18} className="text-gray-500" />
                ) : (
                  <ChevronDown size={18} className="text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                  {w.exercises.map((ex, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-violet-400">{ex.name}</p>
                      {ex.sets.map((s, j) => (
                        <p key={j} className="text-xs text-gray-400 ml-2">
                          Set {j + 1}: {s.weight} lbs x {s.reps} reps
                          {s.completed ? " \u2713" : ""}
                        </p>
                      ))}
                    </div>
                  ))}
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 mt-2"
                  >
                    <Trash2 size={14} /> Delete Workout
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
