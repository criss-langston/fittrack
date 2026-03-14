"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  addProgram,
  getPrograms,
  getProgram,
  deleteProgram,
  setActiveProgram,
  addWorkout,
  generateId,
} from "@/lib/db";
import {
  Plus,
  Trash2,
  X,
  Pencil,
  Play,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Star,
} from "lucide-react";

const COMMON_EXERCISES = [
  "Bench Press","Squat","Deadlift","Overhead Press","Barbell Row",
  "Pull Up","Lat Pulldown","Leg Press","Romanian Deadlift","Incline Bench Press",
  "Dumbbell Curl","Tricep Pushdown","Lateral Raise","Cable Fly","Leg Curl",
  "Leg Extension","Calf Raise","Face Pull","Dips","Lunges",
];

interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds?: number;
}

interface ProgramDay {
  name: string;
  exercises: ProgramExercise[];
}

interface Program {
  id: string;
  name: string;
  description?: string;
  days: ProgramDay[];
  isActive: boolean;
  createdAt: string;
}

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDays, setFormDays] = useState<ProgramDay[]>([
    { name: "Day 1", exercises: [] },
  ]);

  // Exercise suggestion state
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionDay, setActiveSuggestionDay] = useState<number | null>(null);

  // Expanded program in list
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    const data = await getPrograms();
    setPrograms(data as Program[]);
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  // --- Form helpers ---
  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormDays([{ name: "Day 1", exercises: [] }]);
    setSearchTerm("");
    setShowSuggestions(false);
    setActiveSuggestionDay(null);
    setEditingId(null);
    setShowForm(false);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = async (id: string) => {
    const p = await getProgram(id);
    if (!p) return;
    setEditingId(id);
    setFormName(p.name);
    setFormDesc(p.description || "");
    setFormDays(p.days.length > 0 ? p.days : [{ name: "Day 1", exercises: [] }]);
    setShowForm(true);
  };

  // Day management
  const addDay = () => {
    setFormDays((prev) => [
      ...prev,
      { name: `Day ${prev.length + 1}`, exercises: [] },
    ]);
  };

  const removeDay = (idx: number) => {
    if (formDays.length <= 1) return;
    setFormDays((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateDayName = (idx: number, name: string) => {
    setFormDays((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], name };
      return copy;
    });
  };

  // Exercise management within a day
  const addExerciseToDay = (dayIdx: number, name: string) => {
    if (!name.trim()) return;
    setFormDays((prev) => {
      const copy = [...prev];
      copy[dayIdx] = {
        ...copy[dayIdx],
        exercises: [
          ...copy[dayIdx].exercises,
          { name: name.trim(), sets: 3, reps: "8-12" },
        ],
      };
      return copy;
    });
    setSearchTerm("");
    setShowSuggestions(false);
    setActiveSuggestionDay(null);
  };

  const removeExerciseFromDay = (dayIdx: number, exIdx: number) => {
    setFormDays((prev) => {
      const copy = [...prev];
      copy[dayIdx] = {
        ...copy[dayIdx],
        exercises: copy[dayIdx].exercises.filter((_, i) => i !== exIdx),
      };
      return copy;
    });
  };

  const updateExercise = (
    dayIdx: number,
    exIdx: number,
    field: keyof ProgramExercise,
    value: string | number
  ) => {
    setFormDays((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIdx], exercises: [...copy[dayIdx].exercises] };
      day.exercises[exIdx] = { ...day.exercises[exIdx], [field]: value };
      copy[dayIdx] = day;
      return copy;
    });
  };

  const filteredSuggestions = COMMON_EXERCISES.filter((e) => {
    if (!searchTerm) return false;
    const dayExercises =
      activeSuggestionDay !== null
        ? formDays[activeSuggestionDay]?.exercises.map((ex) => ex.name) || []
        : [];
    return (
      e.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !dayExercises.includes(e)
    );
  });

  // Save program
  const saveProgram = async () => {
    if (!formName.trim()) return;
    const validDays = formDays.filter((d) => d.name.trim());
    if (validDays.length === 0) return;

    const program: Program = {
      id: editingId || generateId(),
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      days: validDays,
      isActive: editingId
        ? programs.find((p) => p.id === editingId)?.isActive || false
        : false,
      createdAt: editingId
        ? programs.find((p) => p.id === editingId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
    };

    await addProgram(program);
    resetForm();
    await loadPrograms();
  };

  const handleDelete = async (id: string) => {
    await deleteProgram(id);
    await loadPrograms();
  };

  const handleSetActive = async (id: string) => {
    await setActiveProgram(id);
    await loadPrograms();
  };

  // --- Today's workout from active program ---
  const activeProgram = programs.find((p) => p.isActive);

  const getTodayDayIndex = (program: Program): number => {
    if (program.days.length === 0) return 0;
    const created = new Date(program.createdAt).getTime();
    const now = Date.now();
    const daysSince = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return daysSince % program.days.length;
  };

  const todayDayIndex = activeProgram ? getTodayDayIndex(activeProgram) : 0;
  const todayDay = activeProgram?.days[todayDayIndex];

  const startTodayWorkout = async () => {
    if (!activeProgram || !todayDay) return;

    const workout = {
      id: generateId(),
      date: new Date().toISOString(),
      exercises: todayDay.exercises.map((ex) => ({
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          reps: parseInt(ex.reps) || 0,
          weight: 0,
          completed: false,
        })),
      })),
      programId: activeProgram.id,
    };

    await addWorkout(workout);
    router.push("/workouts");
  };

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Programs</h1>
        {!showForm && (
          <button
            onClick={openNewForm}
            className="btn-primary flex items-center gap-1.5 text-sm !px-4 !py-2"
          >
            <Plus size={18} /> New
          </button>
        )}
      </div>

      {/* Today's Workout Card */}
      {activeProgram && todayDay && !showForm && (
        <div className="card mb-6 !border-violet-500/40 bg-violet-950/20">
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
              Today&apos;s Workout
            </span>
          </div>
          <h3 className="font-semibold text-lg">{todayDay.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">
            {activeProgram.name} &middot; Day {todayDayIndex + 1} of{" "}
            {activeProgram.days.length}
          </p>

          <div className="space-y-1.5 mb-4">
            {todayDay.exercises.map((ex, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-300">{ex.name}</span>
                <span className="text-gray-500">
                  {ex.sets} x {ex.reps}
                </span>
              </div>
            ))}
            {todayDay.exercises.length === 0 && (
              <p className="text-sm text-gray-500">Rest day</p>
            )}
          </div>

          {todayDay.exercises.length > 0 && (
            <button
              onClick={startTodayWorkout}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Play size={18} /> Start Workout
            </button>
          )}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Program" : "New Program"}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Program Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Push Pull Legs"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Description (optional)
            </label>
            <textarea
              className="input-field min-h-[60px] resize-none"
              placeholder="Program notes..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          {/* Days */}
          <div className="space-y-4">
            {formDays.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="bg-gray-800/50 rounded-xl p-3 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input-field !py-1.5 text-sm font-semibold flex-1"
                    value={day.name}
                    onChange={(e) => updateDayName(dayIdx, e.target.value)}
                    placeholder="Day name"
                  />
                  {formDays.length > 1 && (
                    <button
                      onClick={() => removeDay(dayIdx)}
                      className="text-gray-500 hover:text-red-400 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Exercises in this day */}
                {day.exercises.map((ex, exIdx) => (
                  <div
                    key={exIdx}
                    className="bg-gray-900/50 rounded-lg p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-violet-400">
                        {ex.name}
                      </span>
                      <button
                        onClick={() =>
                          removeExerciseFromDay(dayIdx, exIdx)
                        }
                        className="text-gray-600 hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">
                          Sets
                        </label>
                        <input
                          type="number"
                          className="input-field text-center !py-1 text-sm"
                          value={ex.sets}
                          min={1}
                          onChange={(e) =>
                            updateExercise(
                              dayIdx,
                              exIdx,
                              "sets",
                              Math.max(1, Number(e.target.value))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">
                          Reps
                        </label>
                        <input
                          type="text"
                          className="input-field text-center !py-1 text-sm"
                          value={ex.reps}
                          placeholder="8-12"
                          onChange={(e) =>
                            updateExercise(
                              dayIdx,
                              exIdx,
                              "reps",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block mb-0.5">
                          Rest (s)
                        </label>
                        <input
                          type="number"
                          className="input-field text-center !py-1 text-sm"
                          value={ex.restSeconds || ""}
                          placeholder="60"
                          onChange={(e) =>
                            updateExercise(
                              dayIdx,
                              exIdx,
                              "restSeconds",
                              Number(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add exercise search */}
                <div className="relative">
                  <input
                    type="text"
                    className="input-field text-sm !py-2"
                    placeholder="Add exercise..."
                    value={activeSuggestionDay === dayIdx ? searchTerm : ""}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                      setActiveSuggestionDay(dayIdx);
                    }}
                    onFocus={() => {
                      setActiveSuggestionDay(dayIdx);
                      setSearchTerm("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchTerm.trim()) {
                        addExerciseToDay(dayIdx, searchTerm);
                      }
                    }}
                  />
                  {showSuggestions &&
                    activeSuggestionDay === dayIdx &&
                    searchTerm &&
                    filteredSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 rounded-xl border border-gray-700 max-h-40 overflow-y-auto z-30">
                        {filteredSuggestions.map((name) => (
                          <button
                            key={name}
                            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addExerciseToDay(dayIdx, name)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            <button
              onClick={addDay}
              className="w-full text-sm text-gray-500 hover:text-gray-300 py-2.5 border border-dashed border-gray-700 rounded-xl transition-colors"
            >
              + Add Day
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={resetForm} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={saveProgram}
              disabled={!formName.trim()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {editingId ? "Update" : "Save"} Program
            </button>
          </div>
        </div>
      )}

      {/* Program List */}
      {!showForm && (
        <div className="space-y-3 pb-4">
          {programs.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Dumbbell size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg">No programs yet</p>
              <p className="text-sm mt-1">
                Create a workout program to get started
              </p>
            </div>
          )}

          {programs.map((program) => {
            const isExpanded = expandedId === program.id;
            return (
              <div
                key={program.id}
                className={`card ${
                  program.isActive ? "!border-violet-500/40" : ""
                }`}
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : program.id)
                  }
                  className="w-full flex items-center justify-between"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{program.name}</p>
                      {program.isActive && (
                        <span className="text-[10px] font-bold uppercase bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-md">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {program.days.length} day
                      {program.days.length !== 1 ? "s" : ""}
                      {program.description ? ` -- ${program.description}` : ""}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={18} className="text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-500 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                    {/* Day breakdown */}
                    {program.days.map((day, dIdx) => (
                      <div key={dIdx}>
                        <p className="text-sm font-medium text-violet-400">
                          {day.name}
                        </p>
                        {day.exercises.length === 0 ? (
                          <p className="text-xs text-gray-600 ml-2">Rest</p>
                        ) : (
                          day.exercises.map((ex, eIdx) => (
                            <p
                              key={eIdx}
                              className="text-xs text-gray-400 ml-2"
                            >
                              {ex.name}: {ex.sets}x{ex.reps}
                              {ex.restSeconds
                                ? ` (${ex.restSeconds}s rest)`
                                : ""}
                            </p>
                          ))
                        )}
                      </div>
                    ))}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {!program.isActive && (
                        <button
                          onClick={() => handleSetActive(program.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-600/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Play size={12} /> Start
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(program.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(program.id)}
                        className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 bg-red-900/10 px-3 py-1.5 rounded-lg transition-colors ml-auto"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
