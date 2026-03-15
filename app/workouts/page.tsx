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
  FileText,
  Activity,
} from "lucide-react";
import RestTimer from "@/components/RestTimer";
import Confetti from "@/components/Confetti";

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
  rpe?: number;
  supersets?: SupersetGroup[];
}

const RPE_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Somewhat Hard',
  5: 'Hard',
  6: 'Hard+',
  7: 'Very Hard',
  8: 'Very Hard+',
  9: 'Max Effort',
  10: 'Absolute Max',
};

function getRpeColor(rpe: number): string {
  if (rpe <= 3) return 'text-emerald-400';
  if (rpe <= 5) return 'text-yellow-400';
  if (rpe <= 7) return 'text-orange-400';
  return 'text-red-400';
}

function getRpeBarColor(rpe: number): string {
  if (rpe <= 3) return 'bg-emerald-500';
  if (rpe <= 5) return 'bg-yellow-500';
  if (rpe <= 7) return 'bg-orange-500';
  return 'bg-red-500';
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

  // Workout-level notes + RPE
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutRpe, setWorkoutRpe] = useState<number>(5);
  const [showNotesRpe, setShowNotesRpe] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Rest Timer
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | undefined>(undefined);
  const [defaultRestTime] = useState(60);

  // Progressive Overload
  const [overloadAlerts, setOverloadAlerts] = useState<Record<string, boolean>>({});
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Supersets
  const [supersets, setSupersets] = useState<SupersetGroup[]>([]);
  const [showSupersetSelect, setShowSupersetSelect] = useState(false);
  const [supersetSelection, setSupersetSelection] = useState<Set<number>>(new Set());

  // PR Confetti
  const [confettiTrigger, setConfettiTrigger] = useState(false);

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

  const checkOverload = useCallback(async (exerciseName: string) => {
    try {
      const history = await getExerciseHistory(exerciseName, 3);
      if (history.length < 3) return;
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
    } catch { /* silent */ }
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
    setConfettiTrigger(false);
    setWorkoutNotes("");
    setWorkoutRpe(5);
    setShowNotesRpe(false);
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
    setConfettiTrigger(false);
    setWorkoutNotes("");
    setWorkoutRpe(5);
    setShowNotesRpe(false);
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

  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIdx], sets: [...copy[exIdx].sets] };
      const wasCompleted = ex.sets[setIdx].completed;
      ex.sets[setIdx] = { ...ex.sets[setIdx], completed: !wasCompleted };
      copy[exIdx] = ex;
      if (!wasCompleted) {
        const supersetGroup = supersets.find((sg) => sg.exerciseIndices.includes(exIdx));
        if (supersetGroup) {
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
      notes: workoutNotes.trim() || undefined,
      rpe: workoutRpe,
    };
    await addWorkout(workout);

    const prs: string[] = [];
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.weight <= 0) continue;
        const existing = await getPersonalRecords(ex.name);
        const sameReps = existing.filter((p) => p.reps === set.reps);
        const currentBest = sameReps.length > 0 ? Math.max(...sameReps.map((p) => p.weight)) : 0;
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

    if (prs.length > 0) {
      setConfettiTrigger(false);
      requestAnimationFrame(() => setConfettiTrigger(true));
    }

    if (exercises.length > 0) {
      setShowSaveTemplate(true);
    } else {
      setIsNew(false);
      setExercises([]);
      setSupersets([]);
    }

    await loadWorkouts();
    if (prs.length > 0) setTimeout(() => setNewPRs([]), 5000);
  };

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

  const handleLoadTemplate = (template: WorkoutTemplate) => {
    const loaded: Exercise[] = template.exercises.map((te) => ({
      name: te.name,
      sets: Array.from({ length: te.sets }, () => ({ reps: te.reps, weight: 0, completed: false })),
    }));
    setExercises(loaded);
    setSupersets([]);
    setShowTemplateModal(false);
    loaded.forEach((ex) => checkOverload(ex.name));
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteWorkoutTemplate(id);
    await loadTemplates();
  };

  const toggleSupersetSelection = (idx: number) => {
    setSupersetSelection((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const createSuperset = () => {
    if (supersetSelection.size < 2) return;
    const indices = Array.from(supersetSelection).sort((a, b) => a - b);
    const cleaned = supersets
      .filter((sg) => !sg.exerciseIndices.some((i) => indices.includes(i)))
      .filter((sg) => sg.exerciseIndices.length >= 2);
    cleaned.push({ exerciseIndices: indices });
    setSupersets(cleaned);
    setSupersetSelection(new Set());
    setShowSupersetSelect(false);
  };

  const removeSuperset = (groupIdx: number) => setSupersets((prev) => prev.filter((_, i) => i !== groupIdx));

  const getSupersetGroup = (exIdx: number) => {
    for (let gi = 0; gi < supersets.length; gi++) {
      if (supersets[gi].exerciseIndices.includes(exIdx)) return { group: supersets[gi], groupIdx: gi };
    }
    return null;
  };

  const supersetColors = ["border-violet-500", "border-cyan-500", "border-amber-500", "border-emerald-500", "border-rose-500"];
  const supersetBgColors = ["bg-violet-500/10", "bg-cyan-500/10", "bg-amber-500/10", "bg-emerald-500/10", "bg-rose-500/10"];
  const getSupersetColor = (gi: number) => supersetColors[gi % supersetColors.length];
  const getSupersetBgColor = (gi: number) => supersetBgColors[gi % supersetBgColors.length];
  const getSupersetLabel = (group: SupersetGroup) => group.exerciseIndices.length === 2 ? "Superset" : "Circuit";

  const handleDelete = async (id: string) => {
    await deleteWorkout(id);
    await loadWorkouts();
  };

  const calcVolume = (exs: Exercise[]) =>
    exs.reduce((total, ex) =>
      total + ex.sets.filter((s) => s.completed).reduce((sum, s) => sum + s.reps * s.weight, 0), 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const filteredSuggestions = availableExercises.filter(
    (e) => e.toLowerCase().includes(searchTerm.toLowerCase()) && !exercises.some((ex) => ex.name === e)
  );

  return (
    <div className="px-4 pt-6 pb-24">
      <Confetti trigger={confettiTrigger} />

      {/* PR toast */}
      {newPRs.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-4 py-3 rounded-xl shadow-lg max-w-xs w-full">
          <p className="font-bold flex items-center gap-2"><Trophy size={18} />New Personal Record{newPRs.length > 1 ? "s" : ""}!</p>
          {newPRs.map((pr, i) => <p key={i} className="text-sm mt-1">{pr}</p>)}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Workouts</h1>
        {!isNew && (
          <div className="flex gap-2">
            <button
              onClick={() => { startNewWorkout(); setShowTemplateModal(true); }}
              className="btn-secondary flex items-center gap-1.5 text-sm !px-3 !py-2"
            >
              <FolderOpen size={16} />From Template
            </button>
            <button onClick={startNewWorkout} className="btn-primary flex items-center gap-1.5 text-sm !px-3 !py-2">
              <Plus size={16} />New
            </button>
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Load Template</h3>
            <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
          {templates.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">No templates saved yet</p>
              <p className="text-gray-600 text-xs mt-1">Finish a workout and save it as a template</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                  <button onClick={() => handleLoadTemplate(t)} className="flex-1 text-left">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.exercises.map((e) => e.name).join(", ")}</p>
                  </button>
                  <span className="text-xs text-gray-600">{t.exercises.length} exercise{t.exercises.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-1">Save as Template?</h3>
          <p className="text-xs text-gray-500 mb-3">Save this workout structure for easy reuse</p>
          <input
            className="input-field mb-3"
            placeholder="Template name (e.g. Push Day)"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveTemplate(); }}
            autoFocus
          />
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Exercises to save:</p>
            {exercises.map((ex, i) => (
              <p key={i} className="text-xs text-gray-400">• {ex.name} - {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""}</p>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSkipSaveTemplate} className="btn-secondary flex-1 text-sm">Skip</button>
            <button onClick={handleSaveTemplate} className="btn-primary flex-1 text-sm">Save Template</button>
          </div>
        </div>
      )}

      {/* New Workout Form */}
      {isNew && !showSaveTemplate && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">New Workout</h2>
            <button onClick={cancelWorkout} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>

          {/* Exercise search */}
          <div className="relative mb-4">
            <input
              className="input-field pr-10"
              placeholder="Search or type exercise name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => { if (e.key === "Enter" && searchTerm.trim()) addExercise(searchTerm); }}
            />
            {showSuggestions && searchTerm && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto">
                {filteredSuggestions.map((name) => (
                  <button
                    key={name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addExercise(name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Superset controls */}
          {exercises.length >= 2 && (
            <div className="flex items-center gap-3 mb-3 text-sm">
              {!showSupersetSelect ? (
                <button
                  onClick={() => { setShowSupersetSelect(true); setSupersetSelection(new Set()); }}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <Link size={14} />Link as Superset
                </button>
              ) : (
                <>
                  <span className="text-xs text-gray-400">Select exercises to group:</span>
                  <button onClick={createSuperset} className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">
                    Confirm ({supersetSelection.size})
                  </button>
                  <button onClick={() => { setShowSupersetSelect(false); setSupersetSelection(new Set()); }} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Active superset groups */}
          {supersets.length > 0 && (
            <div className="space-y-1 mb-3">
              {supersets.map((sg, gi) => (
                <div key={gi} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 rounded-lg px-3 py-1.5">
                  <Unlink size={12} className="text-violet-400" />
                  <span>{getSupersetLabel(sg)}: {sg.exerciseIndices.map((i) => exercises[i]?.name || "?").join(" + ")}</span>
                  <button onClick={() => removeSuperset(gi)} className="text-gray-500 hover:text-red-400 ml-auto"><X size={12} /></button>
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
              <div key={exIdx} className="relative">
                {sgInfo && isFirstInGroup && (
                  <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${getSupersetBgColor(sgInfo.groupIdx)} px-2 py-1 rounded-t-lg`}>
                    <Link size={12} className="text-violet-400" />
                    <span className="text-violet-300">{getSupersetLabel(sgInfo.group)}</span>
                  </div>
                )}

                <div className={`card mb-2 border-l-4 ${borderColor} ${sgInfo ? getSupersetBgColor(sgInfo.groupIdx) : ""}`}>
                  {showSupersetSelect && (
                    <button
                      onClick={() => toggleSupersetSelection(exIdx)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mb-2 transition-colors ${
                        supersetSelection.has(exIdx) ? "border-violet-500 bg-violet-600" : "border-gray-600 bg-transparent"
                      }`}
                    >
                      {supersetSelection.has(exIdx) && <span className="text-white text-xs">&#x2713;</span>}
                    </button>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{ex.name}</h3>
                    {overloadAlerts[ex.name] && !dismissedAlerts.has(ex.name) && (
                      <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={12} />
                        <span>&#x2191; Try increasing weight</span>
                        <button onClick={() => setDismissedAlerts((prev) => new Set(prev).add(ex.name))} className="text-amber-600 hover:text-amber-400 ml-0.5"><X size={10} /></button>
                      </div>
                    )}
                    <button onClick={() => removeExercise(exIdx)} className="text-gray-500 hover:text-red-400 flex-shrink-0 ml-2"><X size={18} /></button>
                  </div>

                  <div className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 mb-2 text-xs text-gray-500 px-1">
                    <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span></span>
                  </div>

                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 mb-2 items-center">
                      <button
                        onClick={() => toggleSetComplete(exIdx, setIdx)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                          set.completed ? "bg-violet-600 text-white" : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {setIdx + 1}
                      </button>
                      <input
                        type="number"
                        className="input-field text-center !py-1.5"
                        value={set.weight || ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "weight", Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="input-field text-center !py-1.5"
                        value={set.reps || ""}
                        onChange={(e) => updateSet(exIdx, setIdx, "reps", Number(e.target.value))}
                      />
                      <button onClick={() => removeSet(exIdx, setIdx)} className="text-gray-600 hover:text-red-400"><X size={14} /></button>
                    </div>
                  ))}

                  <button
                    onClick={() => addSet(exIdx)}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 py-1.5 border border-dashed border-gray-700 rounded-lg transition-colors"
                  >
                    + Add Set
                  </button>
                </div>

                {sgInfo && !isLastInGroup && (
                  <div className="flex justify-center -my-1 relative z-10">
                    <div className={`w-0.5 h-4 ${getSupersetBgColor(sgInfo.groupIdx).replace('bg-', 'bg-').replace('/10', '/40')}`} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes & RPE section */}
          <div className="mt-2 border-t border-gray-800 pt-3">
            <button
              onClick={() => setShowNotesRpe((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-full"
            >
              <FileText size={15} />
              <span>Notes &amp; RPE</span>
              {workoutRpe > 0 && (
                <span className={`ml-auto text-xs font-semibold ${getRpeColor(workoutRpe)}`}>
                  RPE {workoutRpe}
                </span>
              )}
              {showNotesRpe ? <ChevronUp size={15} className="ml-1" /> : <ChevronDown size={15} className="ml-1" />}
            </button>

            {showNotesRpe && (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Workout Notes</label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder="How did it go? Any cues, observations, or goals for next time..."
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400">Rate of Perceived Exertion (RPE)</label>
                    <span className={`text-sm font-bold ${getRpeColor(workoutRpe)}`}>
                      {workoutRpe} &#x2014; {RPE_LABELS[workoutRpe]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={workoutRpe}
                    onChange={(e) => setWorkoutRpe(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700"
                  />
                  <div className="flex justify-between mt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setWorkoutRpe(n)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          workoutRpe === n
                            ? `${getRpeBarColor(n)} text-white`
                            : 'text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Finish button */}
          <div className="flex gap-2 mt-4">
            <button onClick={cancelWorkout} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={finishWorkout}
              disabled={exercises.length === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={16} />Finish Workout
            </button>
          </div>
        </div>
      )}

      <RestTimer
        show={showRestTimer}
        onClose={() => setShowRestTimer(false)}
        autoStartSeconds={restTimerSeconds}
      />

      {/* Past workouts */}
      <div className="space-y-3">
        {workouts.length === 0 && !isNew && (
          <div className="card text-center py-10">
            <Activity size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No workouts yet</p>
            <p className="text-gray-600 text-sm mt-1">Tap &quot;New&quot; to log your first workout</p>
          </div>
        )}

        {workouts.map((w) => (
          <div key={w.id} className="card">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
            >
              <div>
                <p className="font-semibold">{formatDate(w.date)}</p>
                <p className="text-sm text-gray-400">
                  {w.exercises.length} exercise{w.exercises.length !== 1 ? "s" : ""}
                  {calcVolume(w.exercises) > 0 && ` \u00b7 ${calcVolume(w.exercises).toLocaleString()} lbs`}
                  {w.rpe !== undefined && (
                    <span className={`ml-2 font-medium ${getRpeColor(w.rpe)}`}>
                      RPE {w.rpe}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
                  className="text-gray-600 hover:text-red-400 p-1"
                >
                  <Trash2 size={16} />
                </button>
                {expandedId === w.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </div>
            </div>

            {expandedId === w.id && (
              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                {w.notes && (
                  <div className="flex gap-2 text-sm text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2">
                    <FileText size={14} className="flex-shrink-0 mt-0.5" />
                    <p className="italic">{w.notes}</p>
                  </div>
                )}
                {w.exercises.map((ex, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-gray-300">{ex.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {ex.sets.filter((s) => s.completed).map((s, si) => (
                        <span key={si} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                          {s.weight}lbs \u00d7 {s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
