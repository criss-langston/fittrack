"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addWorkout,
  getWorkouts,
  deleteWorkout,
  addPersonalRecord,
  getPersonalRecords,
  generateId,
  getAllExerciseNames,
  addWorkoutTemplate,
  getWorkoutTemplates,
  deleteWorkoutTemplate,
  getExerciseHistory,
  type WorkoutTemplate,
} from "@/lib/db";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Trophy,
  X,
  Save,
  FolderOpen,
  Link,
  Unlink,
  AlertTriangle,
} from "lucide-react";
import RestTimer from "@/components/RestTimer";

interface WorkoutSet {
  reps: number;
  weight: number;
  completed: boolean;
}

interface Exercise {
  name: string;
  sets: WorkoutSet[];
}

interface SupersetGroup {
  exerciseIndices: number[];
}

interface Workout {
  id: string;
  date: string;
  exercises: Exercise[];
  duration?: number;
  notes?: string;
  supersets?: SupersetGroup[];
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [isNew, setIsNew] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeExIdx, setActiveExIdx] = useState<number | null>(null);

  // Feature 1: Templates state
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Feature 2: Rest Timer state
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | undefined>(undefined);
  const [defaultRestTime] = useState(60);

  // Feature 3: Progressive Overload state
  const [overloadAlerts, setOverloadAlerts] = useState<Record<string, boolean>>({});
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Feature 4: Superset state
  const [supersets, setSupersets] = useState<SupersetGroup[]>([]);
  const [showSupersetSelect, setShowSupersetSelect] = useState(false);
  const [supersetSelection, setSupersetSelection] = useState<Set<number>>(new Set());

  const loadWorkouts = useCallback(async () => {
    const data = await getWorkouts();
    setWorkouts(data as Workout[]);
  }, []);

  const loadExerciseNames = useCallback(async () => {
    const names = await getAllExerciseNames();
    setAvailableExercises(names);
  }, []);

  const loadTemplates = useCallback(async () => {
    const data = await getWorkoutTemplates();
    setTemplates(data);
  }, []);

  useEffect(() => {
    loadWorkouts();
    loadExerciseNames();
    loadTemplates();
  }, [loadWorkouts, loadExerciseNames, loadTemplates]);

  // Feature 3: Check progressive overload when exercise is added
  const checkOverload = useCallback(async (exerciseName: string) => {
    try {
      const history = await getExerciseHistory(exerciseName, 3);
      if (history.length < 3) return;

      // Check if all 3 sessions had the same max weight and rep pattern
      const sessions = history.map((h) => {
        if (h.sets.length === 0) return null;
        const maxWeight = Math.max(...h.sets.map((s) => s.weight));
        const maxReps = Math.max(...h.sets.map((s) => s.reps));
        return { weight: maxWeight, reps: maxReps };
      }).filter(Boolean);

      if (sessions.length < 3) return;

      const allSame = sessions.every(
        (s) => s && sessions[0] && s.weight === sessions[0].weight && s.reps === sessions[0].reps
      );

      if (allSame && sessions[0] && sessions[0].weight > 0) {
        setOverloadAlerts((prev) => ({ ...prev, [exerciseName]: true }));
      }
    } catch {
      // Silently ignore errors in overload check
    }
  }, []);

  const startNewWorkout = () => {
    setIsNew(true);
    setExercises([]);
    setNewPRs([]);
    setSupersets([]);
    setOverloadAlerts({});
    setDismissedAlerts(new Set());
    setSupersetSelection(new Set());
    setShowSupersetSelect(false);
    loadExerciseNames();
    loadTemplates();
  };

  const cancelWorkout = () => {
    setIsNew(false);
    setExercises([]);
    setSearchTerm("");
    setShowSuggestions(false);
    setActiveExIdx(null);
    setSupersets([]);
    setOverloadAlerts({});
    setDismissedAlerts(new Set());
    setShowRestTimer(false);
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
    checkOverload(name.trim());
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
    // Update superset indices
    setSupersets((prev) =>
      prev
        .map((sg) => ({
          exerciseIndices: sg.exerciseIndices
            .filter((i) => i !== idx)
            .map((i) => (i > idx ? i - 1 : i)),
        }))
        .filter((sg) => sg.exerciseIndices.length >= 2)
    );
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

  // Feature 2 + 4: Toggle set complete with rest timer logic
  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIdx], sets: [...copy[exIdx].sets] };
      const wasCompleted = ex.sets[setIdx].completed;
      ex.sets[setIdx] = { ...ex.sets[setIdx], completed: !wasCompleted };
      copy[exIdx] = ex;

      // Start rest timer when marking a set as complete
      if (!wasCompleted) {
        // Check if this exercise is in a superset
        const supersetGroup = supersets.find((sg) => sg.exerciseIndices.includes(exIdx));

        if (supersetGroup) {
          // Only start timer after the last exercise in the group
          const lastIdx = Math.max(...supersetGroup.exerciseIndices);
          if (exIdx === lastIdx) {
            setRestTimerSeconds(defaultRestTime);
            setShowRestTimer(true);
          }
        } else {
          setRestTimerSeconds(defaultRestTime);
          setShowRestTimer(true);
        }
      }

      return copy;
    });
  };

  const finishWorkout = async () => {
    if (exercises.length === 0) return;
    const workout: Workout = {
      id: generateId(),
      date: new Date().toISOString(),
      exercises,
      supersets: supersets.length > 0 ? supersets : undefined,
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
    setShowRestTimer(false);

    // Show save-as-template prompt before clearing
    if (exercises.length > 0) {
      setShowSaveTemplate(true);
    } else {
      setIsNew(false);
      setExercises([]);
      setSupersets([]);
    }

    await loadWorkouts();

    if (prs.length > 0) {
      setTimeout(() => setNewPRs([]), 5000);
    }
  };

  // Feature 1: Save as Template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    const template: WorkoutTemplate = {
      id: generateId(),
      name: templateName.trim(),
      exercises: exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets.length,
        reps: ex.sets.length > 0 ? ex.sets[0].reps : 0,
      })),
      createdAt: new Date().toISOString(),
    };
    await addWorkoutTemplate(template);
    await loadTemplates();
    setTemplateName("");
    setShowSaveTemplate(false);
    setIsNew(false);
    setExercises([]);
    setSupersets([]);
  };

  const handleSkipSaveTemplate = () => {
    setShowSaveTemplate(false);
    setIsNew(false);
    setExercises([]);
    setSupersets([]);
  };

  // Feature 1: Load from Template
  const handleLoadTemplate = (template: WorkoutTemplate) => {
    const loaded: Exercise[] = template.exercises.map((te) => ({
      name: te.name,
      sets: Array.from({ length: te.sets }, () => ({
        reps: te.reps,
        weight: 0,
        completed: false,
      })),
    }));
    setExercises(loaded);
    setSupersets([]);
    setShowTemplateModal(false);
    // Check overload for each loaded exercise
    loaded.forEach((ex) => checkOverload(ex.name));
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteWorkoutTemplate(id);
    await loadTemplates();
  };

  // Feature 4: Superset grouping
  const toggleSupersetSelection = (idx: number) => {
    setSupersetSelection((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const createSuperset = () => {
    if (supersetSelection.size < 2) return;
    const indices = Array.from(supersetSelection).sort((a, b) => a - b);

    // Remove these indices from any existing superset groups
    const cleaned = supersets.filter(
      (sg) => !sg.exerciseIndices.some((i) => indices.includes(i))
    ).filter((sg) => sg.exerciseIndices.length >= 2);

    cleaned.push({ exerciseIndices: indices });
    setSupersets(cleaned);
    setSupersetSelection(new Set());
    setShowSupersetSelect(false);
  };

  const removeSuperset = (groupIdx: number) => {
    setSupersets((prev) => prev.filter((_, i) => i !== groupIdx));
  };

  const getSupersetGroup = (exIdx: number): { group: SupersetGroup; groupIdx: number } | null => {
    for (let gi = 0; gi < supersets.length; gi++) {
      if (supersets[gi].exerciseIndices.includes(exIdx)) {
        return { group: supersets[gi], groupIdx: gi };
      }
    }
    return null;
  };

  const getSupersetColor = (groupIdx: number): string => {
    const colors = ["border-violet-500", "border-cyan-500", "border-amber-500", "border-emerald-500", "border-rose-500"];
    return colors[groupIdx % colors.length];
  };

  const getSupersetBgColor = (groupIdx: number): string => {
    const colors = ["bg-violet-500/10", "bg-cyan-500/10", "bg-amber-500/10", "bg-emerald-500/10", "bg-rose-500/10"];
    return colors[groupIdx % colors.length];
  };

  const getSupersetLabel = (group: SupersetGroup): string => {
    return group.exerciseIndices.length === 2 ? "Superset" : "Circuit";
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

  const filteredSuggestions = availableExercises.filter(
    (e) =>
      e.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !exercises.some((ex) => ex.name === e)
  );

  return (
    <div className="px-4 pt-6 pb-4">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                startNewWorkout();
                setShowTemplateModal(true);
              }}
              className="btn-secondary flex items-center gap-1.5 text-sm !px-3 !py-2"
            >
              <FolderOpen size={16} /> From Template
            </button>
            <button onClick={startNewWorkout} className="btn-primary flex items-center gap-1.5 text-sm !px-4 !py-2">
              <Plus size={18} /> New
            </button>
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Load Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No templates saved yet</p>
                <p className="text-xs mt-1">Finish a workout and save it as a template</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 bg-gray-800 rounded-xl p-3">
                    <button
                      onClick={() => handleLoadTemplate(t)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.exercises.map((e) => e.name).join(", ")}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.exercises.length} exercise{t.exercises.length !== 1 ? "s" : ""}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="text-gray-600 hover:text-red-400 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
                <Save size={20} className="text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Save as Template?</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Save this workout structure for easy reuse
                </p>
              </div>
            </div>

            <input
              type="text"
              className="input-field"
              placeholder="Template name (e.g. Push Day)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTemplate();
              }}
              autoFocus
            />

            <div className="bg-gray-800/70 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1.5">Exercises to save:</p>
              {exercises.map((ex, i) => (
                <p key={i} className="text-xs text-gray-300">
                  {ex.name} - {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""}
                </p>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkipSaveTemplate}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Workout Form */}
      {isNew && !showSaveTemplate && (
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

          {/* Feature 4: Superset Controls */}
          {exercises.length >= 2 && (
            <div className="flex items-center gap-2">
              {!showSupersetSelect ? (
                <button
                  onClick={() => {
                    setShowSupersetSelect(true);
                    setSupersetSelection(new Set());
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <Link size={14} /> Link as Superset
                </button>
              ) : (
                <>
                  <span className="text-xs text-gray-400">Select exercises to group:</span>
                  <button
                    onClick={createSuperset}
                    disabled={supersetSelection.size < 2}
                    className="text-xs font-medium text-violet-400 hover:text-violet-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    Confirm ({supersetSelection.size})
                  </button>
                  <button
                    onClick={() => {
                      setShowSupersetSelect(false);
                      setSupersetSelection(new Set());
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Active Superset Groups */}
          {supersets.length > 0 && (
            <div className="space-y-1">
              {supersets.map((sg, gi) => (
                <div key={gi} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${getSupersetBgColor(gi)}`}>
                  <span className="font-medium text-gray-300">
                    {getSupersetLabel(sg)}: {sg.exerciseIndices.map((i) => exercises[i]?.name || "?").join(" + ")}
                  </span>
                  <button
                    onClick={() => removeSuperset(gi)}
                    className="text-gray-500 hover:text-red-400 ml-auto"
                  >
                    <Unlink size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Exercises */}
          {exercises.map((ex, exIdx) => {
            const sgInfo = getSupersetGroup(exIdx);
            const borderColor = sgInfo ? getSupersetColor(sgInfo.groupIdx) : "border-transparent";
            const isFirstInGroup = sgInfo ? sgInfo.group.exerciseIndices[0] === exIdx : false;
            const isLastInGroup = sgInfo ? sgInfo.group.exerciseIndices[sgInfo.group.exerciseIndices.length - 1] === exIdx : false;

            return (
              <div
                key={exIdx}
                className={`bg-gray-800/50 rounded-xl p-3 space-y-2 border-l-4 ${
                  sgInfo ? borderColor : "border-transparent"
                }`}
              >
                {/* Superset label on first exercise in group */}
                {sgInfo && isFirstInGroup && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Link size={12} className="text-gray-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {getSupersetLabel(sgInfo.group)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Superset selection checkbox */}
                    {showSupersetSelect && (
                      <button
                        onClick={() => toggleSupersetSelection(exIdx)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          supersetSelection.has(exIdx)
                            ? "border-violet-500 bg-violet-600"
                            : "border-gray-600 bg-transparent"
                        }`}
                      >
                        {supersetSelection.has(exIdx) && (
                          <span className="text-white text-[10px] font-bold">&#10003;</span>
                        )}
                      </button>
                    )}

                    <h3 className="font-semibold text-sm text-violet-400 truncate">{ex.name}</h3>

                    {/* Feature 3: Progressive Overload Alert */}
                    {overloadAlerts[ex.name] && !dismissedAlerts.has(ex.name) && (
                      <div className="flex items-center gap-1 bg-amber-900/30 border border-amber-700/40 rounded-full px-2 py-0.5 flex-shrink-0">
                        <AlertTriangle size={10} className="text-amber-400" />
                        <span className="text-[10px] font-medium text-amber-400 whitespace-nowrap">
                          &#8593; Try increasing weight
                        </span>
                        <button
                          onClick={() => setDismissedAlerts((prev) => new Set(prev).add(ex.name))}
                          className="text-amber-600 hover:text-amber-400 ml-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeExercise(exIdx)} className="text-gray-500 hover:text-red-400 flex-shrink-0 ml-2">
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

                {/* Connector line for superset */}
                {sgInfo && !isLastInGroup && (
                  <div className="flex justify-center -mb-2 pt-1">
                    <div className="w-px h-4 bg-gray-700" />
                  </div>
                )}
              </div>
            );
          })}

          {exercises.length > 0 && (
            <button onClick={finishWorkout} className="btn-primary w-full">
              Finish Workout
            </button>
          )}
        </div>
      )}

      {/* Feature 2: Rest Timer */}
      <RestTimer
        isVisible={showRestTimer}
        onDismiss={() => setShowRestTimer(false)}
        autoStartSeconds={restTimerSeconds}
      />

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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-violet-400">
                      Volume: {volume.toLocaleString()} lbs
                    </p>
                    {w.supersets && w.supersets.length > 0 && (
                      <span className="text-[10px] text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded-full">
                        {w.supersets.length} superset{w.supersets.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={18} className="text-gray-500" />
                ) : (
                  <ChevronDown size={18} className="text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                  {w.exercises.map((ex, i) => {
                    const wSg = w.supersets?.find((sg) => sg.exerciseIndices.includes(i));
                    const isFirst = wSg ? wSg.exerciseIndices[0] === i : false;

                    return (
                      <div key={i}>
                        {wSg && isFirst && (
                          <div className="flex items-center gap-1 mb-1">
                            <Link size={10} className="text-gray-600" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                              {wSg.exerciseIndices.length === 2 ? "Superset" : "Circuit"}
                            </span>
                          </div>
                        )}
                        <p className={`text-sm font-medium text-violet-400 ${wSg ? "ml-3" : ""}`}>{ex.name}</p>
                        {ex.sets.map((s, j) => (
                          <p key={j} className={`text-xs text-gray-400 ${wSg ? "ml-5" : "ml-2"}`}>
                            Set {j + 1}: {s.weight} lbs x {s.reps} reps
                            {s.completed ? " \u2713" : ""}
                          </p>
                        ))}
                      </div>
                    );
                  })}
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
