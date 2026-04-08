"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  getProgressiveOverloadSuggestion,
  exportWorkoutsToCSV,
  exportAllData,
  addRecurringWorkoutPlan,
  getRecurringWorkoutPlans,
  updateRecurringWorkoutPlan,
  deleteRecurringWorkoutPlan,
  materializeRecurringWorkoutsForDate,
  type WorkoutTemplate,
  type RecurringWorkoutPlan,
  getPrograms,
} from "@/lib/db";
import { Plus, Trash2, ChevronDown, ChevronUp, Trophy, X, Save, FolderOpen, Link, Unlink, Lightbulb, FileText, Activity, Download, Filter, LayoutTemplate, Dumbbell, CalendarDays, Repeat } from "lucide-react";
import RestTimer from "@/components/RestTimer";
import Confetti from "@/components/Confetti";
import FilterPanel from "@/components/FilterPanel";
import CustomExerciseManager from "@/components/CustomExerciseManager";
import { useToast } from "@/app/providers";

interface WorkoutSet { reps: number; weight: number; completed: boolean; }
interface Exercise { name: string; sets: WorkoutSet[]; }
interface SupersetGroup { exerciseIndices: number[]; }
interface Workout { programId?: string; recurringPlanId?: string; scheduledFor?: string; id: string; date: string; exercises: Exercise[]; duration?: number; notes?: string; rpe?: number; supersets?: SupersetGroup[]; }
interface OverloadSuggestion { suggestion: string; targetWeight: number; targetReps: number; }
interface FilterState { searchText: string; dateRange: { start: string; end: string }; exercises: string[]; sortBy: 'newest' | 'oldest' | 'duration' | 'weight'; }
interface Program { id: string; name: string; }

const RPE_LABELS: Record<number, string> = { 1: 'Very Easy', 2: 'Easy', 3: 'Moderate', 4: 'Somewhat Hard', 5: 'Hard', 6: 'Hard+', 7: 'Very Hard', 8: 'Very Hard+', 9: 'Max Effort', 10: 'Absolute Max' };
const TAB_OPTIONS = ['today', 'history', 'plans', 'templates'] as const;
type WorkoutsTab = typeof TAB_OPTIONS[number];

function getRpeColor(rpe: number): string { if (rpe <= 3) return 'text-emerald-400'; if (rpe <= 5) return 'text-yellow-400'; if (rpe <= 7) return 'text-orange-400'; return 'text-red-400'; }
function getRpeBarColor(rpe: number): string { if (rpe <= 3) return 'bg-emerald-500'; if (rpe <= 5) return 'bg-yellow-500'; if (rpe <= 7) return 'bg-orange-500'; return 'bg-red-500'; }
function downloadFile(content: string, filename: string, mimeType: string) { const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
function getSupersetColor(idx: number) { const colors = ['border-violet-500', 'border-cyan-500', 'border-emerald-500', 'border-amber-500']; return colors[idx % colors.length]; }
function getSupersetBgColor(idx: number) { const colors = ['bg-violet-500/10', 'bg-cyan-500/10', 'bg-emerald-500/10', 'bg-amber-500/10']; return colors[idx % colors.length]; }
function getSupersetLabel(groupIndex: number, itemIndex: number) { return `${String.fromCharCode(65 + groupIndex)}${itemIndex + 1}`; }

export default function WorkoutsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<WorkoutsTab>('today');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [isNew, setIsNew] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutRpe, setWorkoutRpe] = useState<number>(5);
  const [showNotesRpe, setShowNotesRpe] = useState(false);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [recurringPlans, setRecurringPlans] = useState<RecurringWorkoutPlan[]>([]);
  const [editingRecurringPlanId, setEditingRecurringPlanId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [recurringName, setRecurringName] = useState("");
  const [recurringTemplateId, setRecurringTemplateId] = useState("");
  const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([1,3,5]);
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().slice(0,10));
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringNotes, setRecurringNotes] = useState("");
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | undefined>(undefined);
  const [overloadSuggestions, setOverloadSuggestions] = useState<Record<string, OverloadSuggestion>>({});
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [supersets, setSupersets] = useState<SupersetGroup[]>([]);
  const [showSupersetSelect, setShowSupersetSelect] = useState(false);
  const [supersetSelection, setSupersetSelection] = useState<Set<number>>(new Set());
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ searchText: '', dateRange: { start: '', end: '' }, exercises: [], sortBy: 'newest' });
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const loadWorkouts = useCallback(async () => { const data = await getWorkouts(); setWorkouts(data as Workout[]); }, []);
  const loadExerciseNames = useCallback(async () => { const names = await getAllExerciseNames(); setAvailableExercises(names); }, []);
  const loadTemplates = useCallback(async () => { const data = await getWorkoutTemplates(); setTemplates(data); }, []);
  const loadRecurringPlans = useCallback(async () => { const today = new Date().toISOString().slice(0,10); await materializeRecurringWorkoutsForDate(today); const data = await getRecurringWorkoutPlans(); setRecurringPlans(data); }, []);
  const loadProgramsData = useCallback(async () => { const data = await getPrograms(); setPrograms((data as Program[]).map((p) => ({ id: p.id, name: p.name }))); }, []);

  useEffect(() => { loadWorkouts(); loadExerciseNames(); loadTemplates(); loadRecurringPlans(); loadProgramsData(); }, [loadWorkouts, loadExerciseNames, loadTemplates, loadRecurringPlans, loadProgramsData]);
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) setShowExportDropdown(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);

  const checkOverload = useCallback(async (exerciseName: string) => { try { const history = await getExerciseHistory(exerciseName, 10); const result = getProgressiveOverloadSuggestion(history); if (result && history.length >= 3) setOverloadSuggestions((prev) => ({ ...prev, [exerciseName]: { suggestion: result.suggestion, targetWeight: result.targetWeight, targetReps: result.targetReps } })); } catch {} }, []);
  const filteredExercises = useMemo(() => availableExercises.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10), [availableExercises, searchTerm]);

  const filteredWorkouts = useMemo(() => {
    let result = [...workouts];
    if (filters.searchText) { const searchLower = filters.searchText.toLowerCase(); result = result.filter((workout) => workout.exercises.some((ex) => ex.name.toLowerCase().includes(searchLower)) || workout.notes?.toLowerCase().includes(searchLower) || workout.programId?.toLowerCase().includes(searchLower)); }
    if (filters.dateRange.start) result = result.filter((w) => w.date >= filters.dateRange.start);
    if (filters.dateRange.end) result = result.filter((w) => w.date <= filters.dateRange.end + 'T23:59:59');
    if (filters.exercises.length > 0) result = result.filter((workout) => filters.exercises.some((filterEx) => workout.exercises.some((ex) => ex.name === filterEx)));
    switch (filters.sortBy) { case 'oldest': result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break; case 'duration': result.sort((a, b) => (b.duration || 0) - (a.duration || 0)); break; case 'weight': result.sort((a, b) => calcVolume(b.exercises) - calcVolume(a.exercises)); break; default: result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); }
    return result;
  }, [workouts, filters]);

  const calcVolume = (list: Exercise[]) => list.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).reduce((setSum, s) => setSum + s.reps * s.weight, 0), 0);
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const addExercise = (name?: string) => { const exerciseName = name?.trim() || searchTerm.trim(); if (!exerciseName) { showToast('Enter an exercise name.', 'error'); return; } setExercises((prev) => [...prev, { name: exerciseName, sets: [{ reps: 10, weight: 0, completed: true }] }]); checkOverload(exerciseName); setSearchTerm(''); setShowSuggestions(false); showToast('Exercise added.', 'success'); };
  const removeExercise = (idx: number) => setExercises((prev) => prev.filter((_, i) => i !== idx));
  const addSet = (exerciseIdx: number) => setExercises((prev) => prev.map((ex, i) => i === exerciseIdx ? { ...ex, sets: [...ex.sets, { reps: 10, weight: 0, completed: true }] } : ex));
  const removeSet = (exerciseIdx: number, setIdx: number) => setExercises((prev) => prev.map((ex, i) => i === exerciseIdx ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) } : ex));
  const updateSet = (exerciseIdx: number, setIdx: number, field: keyof WorkoutSet, value: number | boolean) => setExercises((prev) => prev.map((ex, i) => i === exerciseIdx ? { ...ex, sets: ex.sets.map((set, si) => si === setIdx ? { ...set, [field]: value } : set) } : ex));
  const toggleSetComplete = (exerciseIdx: number, setIdx: number) => setExercises((prev) => prev.map((ex, i) => i === exerciseIdx ? { ...ex, sets: ex.sets.map((set, si) => si === setIdx ? { ...set, completed: !set.completed } : set) } : ex));
  const cancelWorkout = () => { setIsNew(false); setExercises([]); setWorkoutNotes(''); setWorkoutRpe(5); setSupersets([]); setSelectedProgramId(''); };

  const finishWorkout = async () => {
    if (exercises.length === 0) { showToast('Add at least one exercise before saving.', 'error'); return; }
    const workout: Workout = { id: generateId(), date: new Date().toISOString(), exercises, notes: workoutNotes.trim() || undefined, rpe: workoutRpe, programId: selectedProgramId || undefined, supersets: supersets.length > 0 ? supersets : undefined };
    await addWorkout(workout);
    const existingPRs = await getPersonalRecords();
    const newPRExercises: string[] = [];
    exercises.forEach(async (ex) => {
      const completedSets = ex.sets.filter((s) => s.completed);
      if (completedSets.length === 0) return;
      const bestSet = completedSets.reduce((best, s) => (s.weight > best.weight ? s : best), completedSets[0]);
      const currentPR = (existingPRs as { exercise: string; weight: number; reps: number }[]).find((pr) => pr.exercise === ex.name);
      if (!currentPR || bestSet.weight > currentPR.weight) { await addPersonalRecord({ id: generateId(), exercise: ex.name, weight: bestSet.weight, reps: bestSet.reps, date: workout.date }); newPRExercises.push(ex.name); }
    });
    setNewPRs(newPRExercises); if (newPRExercises.length > 0) setConfettiTrigger(true);
    cancelWorkout(); await loadWorkouts();
    showToast(newPRExercises.length > 0 ? 'Workout saved. New PR recorded!' : 'Workout saved.', 'success');
  };

  const handleDelete = async (id: string) => { await deleteWorkout(id); await loadWorkouts(); showToast('Workout deleted.', 'success'); };
  const saveTemplate = async () => { if (!templateName.trim()) { showToast('Template name is required.', 'error'); return; } if (exercises.length === 0) { showToast('Add exercises before saving a template.', 'error'); return; } await addWorkoutTemplate({ id: generateId(), name: templateName.trim(), exercises: exercises.map((e) => ({ name: e.name, sets: e.sets.length, reps: e.sets[0]?.reps || 10 })), createdAt: new Date().toISOString() }); setTemplateName(''); setShowSaveTemplate(false); await loadTemplates(); showToast('Template saved.', 'success'); };
  const toggleRecurringWeekday = (day: number) => setRecurringWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b));
  const resetRecurringForm = () => {
    setEditingRecurringPlanId(null);
    setRecurringName('');
    setRecurringTemplateId('');
    setRecurringWeekdays([1,3,5]);
    setRecurringStartDate(new Date().toISOString().slice(0,10));
    setRecurringEndDate('');
    setRecurringNotes('');
  };
  const saveRecurringPlan = async () => {
    if (!recurringName.trim()) { showToast('Recurring workout name is required.', 'error'); return; }
    if (!recurringTemplateId) { showToast('Choose a template for the recurring workout.', 'error'); return; }
    if (recurringWeekdays.length === 0) { showToast('Pick at least one weekday.', 'error'); return; }
    if (editingRecurringPlanId) {
      await updateRecurringWorkoutPlan(editingRecurringPlanId, {
        name: recurringName.trim(),
        templateId: recurringTemplateId,
        weekdays: recurringWeekdays,
        startDate: recurringStartDate,
        endDate: recurringEndDate || undefined,
        notes: recurringNotes.trim() || undefined,
      });
      showToast('Recurring workout updated.', 'success');
    } else {
      await addRecurringWorkoutPlan({
        id: generateId(),
        name: recurringName.trim(),
        templateId: recurringTemplateId,
        exerciseNames: [],
        weekdays: recurringWeekdays,
        startDate: recurringStartDate,
        endDate: recurringEndDate || undefined,
        notes: recurringNotes.trim() || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showToast('Recurring workout saved.', 'success');
    }
    resetRecurringForm();
    await loadRecurringPlans();
    await loadWorkouts();
  };
  const toggleRecurringPlan = async (plan: RecurringWorkoutPlan) => { await updateRecurringWorkoutPlan(plan.id, { isActive: !plan.isActive }); await loadRecurringPlans(); showToast(plan.isActive ? 'Recurring workout paused.' : 'Recurring workout activated.', 'success'); };
  const editRecurringPlan = (plan: RecurringWorkoutPlan) => {
    setEditingRecurringPlanId(plan.id);
    setRecurringName(plan.name);
    setRecurringTemplateId(plan.templateId || '');
    setRecurringWeekdays(plan.weekdays);
    setRecurringStartDate(plan.startDate);
    setRecurringEndDate(plan.endDate || '');
    setRecurringNotes(plan.notes || '');
    setActiveTab('plans');
  };
  const removeRecurringPlan = async (id: string) => { await deleteRecurringWorkoutPlan(id); await loadRecurringPlans(); showToast('Recurring workout deleted.', 'success'); };
  const loadTemplateIntoWorkout = (template: WorkoutTemplate) => { setExercises(template.exercises.map((exercise) => ({ name: exercise.name, sets: Array.from({ length: exercise.sets }, () => ({ reps: exercise.reps, weight: 0, completed: true })) }))); setIsNew(true); setActiveTab('today'); setShowTemplateModal(false); showToast('Template loaded.', 'success'); };
  const removeTemplate = async (id: string) => { await deleteWorkoutTemplate(id); await loadTemplates(); showToast('Template deleted.', 'success'); };

  const exportCsv = async () => { setIsExportingCsv(true); try { downloadFile(exportWorkoutsToCSV(workouts), `fittrack-workouts-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv'); showToast('Workout CSV exported.', 'success'); } finally { setIsExportingCsv(false); setShowExportDropdown(false); } };
  const exportJson = async () => { setIsExportingJson(true); try { const data = await exportAllData(); downloadFile(JSON.stringify(data, null, 2), `fittrack-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); showToast('Backup exported.', 'success'); } finally { setIsExportingJson(false); setShowExportDropdown(false); } };

  const toggleSupersetSelection = (exerciseIdx: number) => setSupersetSelection((prev) => { const next = new Set(prev); if (next.has(exerciseIdx)) next.delete(exerciseIdx); else next.add(exerciseIdx); return next; });
  const createSuperset = () => { const indices = Array.from(supersetSelection).sort((a, b) => a - b); if (indices.length < 2) { showToast('Select at least two exercises for a superset.', 'error'); return; } setSupersets((prev) => [...prev, { exerciseIndices: indices }]); setSupersetSelection(new Set()); setShowSupersetSelect(false); showToast('Superset created.', 'success'); };
  const removeSuperset = (groupIdx: number) => setSupersets((prev) => prev.filter((_, i) => i !== groupIdx));
  const getSupersetGroup = (exerciseIdx: number) => { for (let i = 0; i < supersets.length; i++) { if (supersets[i].exerciseIndices.includes(exerciseIdx)) return { groupIdx: i, group: supersets[i], itemIndex: supersets[i].exerciseIndices.indexOf(exerciseIdx) }; } return null; };

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in max-w-lg mx-auto">
      <Confetti trigger={confettiTrigger} />
      <div className="flex items-center justify-between mb-4"><div><h1 className="text-2xl font-bold">Training</h1><p className="text-sm text-gray-500">Plan sessions, start today’s lift, and review your history.</p></div><div className="relative" ref={exportDropdownRef}><button onClick={() => setShowExportDropdown((v) => !v)} className="btn-secondary !px-3 !py-2 flex items-center gap-2 text-sm"><Download size={16} /> Export</button>{showExportDropdown && <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-800 bg-gray-950 p-2 shadow-xl"><button onClick={exportCsv} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-800 disabled:opacity-50" disabled={isExportingCsv}>{isExportingCsv ? 'Exporting CSV...' : 'Export CSV'}</button><button onClick={exportJson} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-800 disabled:opacity-50" disabled={isExportingJson}>{isExportingJson ? 'Exporting JSON...' : 'Export JSON'}</button></div>}</div></div>

      <div className="grid grid-cols-4 gap-2 mb-4">{TAB_OPTIONS.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>{tab}</button>)}</div>

      {activeTab === 'templates' && <div className="space-y-4"><div className="card"><div className="flex items-center gap-2 mb-2"><LayoutTemplate size={16} className="text-violet-400" /><h2 className="text-sm font-semibold">Templates</h2></div><p className="text-sm text-gray-500 mb-3">Build reusable training sessions and load them in one tap.</p><button onClick={() => setShowTemplateModal(true)} className="btn-secondary w-full">Browse Templates</button></div>{templates.length === 0 ? <div className="card text-center py-10 text-gray-500">No templates yet. Start a workout and save one.</div> : <div className="space-y-3">{templates.map((template) => <div key={template.id} className="card"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{template.name}</p><p className="text-xs text-gray-500">{template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}</p></div><button onClick={() => removeTemplate(template.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button></div><div className="mt-3 flex flex-wrap gap-2">{template.exercises.map((exercise, idx) => <span key={idx} className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300">{exercise.name} · {exercise.sets}×{exercise.reps}</span>)}</div><button onClick={() => loadTemplateIntoWorkout(template)} className="btn-primary w-full mt-3 flex items-center justify-center gap-2"><FolderOpen size={16} /> Load Template</button></div>)}</div>}</div>}

      {activeTab === 'plans' && <div className="space-y-4"><div className="card"><div className="flex items-center gap-2 mb-2"><Repeat size={16} className="text-violet-400" /><h2 className="text-sm font-semibold">Recurring Plans</h2></div><p className="text-sm text-gray-500 mb-3">Create repeating training plans and edit them anytime.</p><div className="space-y-3"><input className="input-field" placeholder="Plan name" value={recurringName} onChange={(e) => setRecurringName(e.target.value)} /><div><label className="text-xs text-gray-400 mb-1 block">Template</label><select className="input-field" value={recurringTemplateId} onChange={(e) => setRecurringTemplateId(e.target.value)}><option value="">Choose template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div><div><label className="text-xs text-gray-400 mb-1 block">Weekdays</label><div className="grid grid-cols-7 gap-2">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, idx) => <button key={label} onClick={() => toggleRecurringWeekday(idx)} className={`rounded-lg px-2 py-2 text-xs font-medium ${recurringWeekdays.includes(idx) ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300'}`}>{label}</button>)}</div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-400 mb-1 block">Start date</label><input type="date" className="input-field" value={recurringStartDate} onChange={(e) => setRecurringStartDate(e.target.value)} /></div><div><label className="text-xs text-gray-400 mb-1 block">End date (optional)</label><input type="date" className="input-field" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} /></div></div><textarea className="input-field min-h-20 resize-none" placeholder="Notes (optional)" value={recurringNotes} onChange={(e) => setRecurringNotes(e.target.value)} /><div className="flex gap-2">{editingRecurringPlanId && <button onClick={resetRecurringForm} className="btn-secondary flex-1">Cancel Edit</button>}<button onClick={saveRecurringPlan} className="btn-primary flex-1">{editingRecurringPlanId ? 'Update Plan' : 'Save Plan'}</button></div></div></div>{recurringPlans.length === 0 ? <div className="card text-center py-10 text-gray-500">No recurring plans yet.</div> : <div className="space-y-3">{recurringPlans.map((plan) => <div key={plan.id} className="card"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{plan.name}</p><p className="text-xs text-gray-500">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_, idx) => plan.weekdays.includes(idx)).join(' • ')}</p><p className="text-xs text-gray-500 mt-1">{plan.startDate}{plan.endDate ? ` → ${plan.endDate}` : ' onwards'}</p></div><div className="flex items-center gap-2"><button onClick={() => editRecurringPlan(plan)} className="text-gray-400 hover:text-white"><CalendarDays size={16} /></button><button onClick={() => toggleRecurringPlan(plan)} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${plan.isActive ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{plan.isActive ? 'Active' : 'Paused'}</button><button onClick={() => removeRecurringPlan(plan.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button></div></div></div>)}</div>}</div>}

      {activeTab === 'today' && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4"><button onClick={() => setIsNew(true)} className="btn-primary flex items-center justify-center gap-2"><Plus size={16} /> Start Session</button><button onClick={() => setShowTemplateModal(true)} className="btn-secondary flex items-center justify-center gap-2"><FolderOpen size={16} /> Templates</button><button onClick={() => setActiveTab('plans')} className="btn-secondary flex items-center justify-center gap-2"><Repeat size={16} /> Plans</button><button onClick={() => setActiveTab('history')} className="btn-secondary flex items-center justify-center gap-2"><CalendarDays size={16} /> History</button></div>
          <FilterPanel availableExercises={availableExercises} initialFilters={filters} onFilterChange={setFilters} />

          {isNew && <div className="card mb-4"><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">Log Workout</h2>{showSaveTemplate ? <button onClick={saveTemplate} className="text-violet-400 hover:text-violet-300 text-sm">Save Template</button> : <button onClick={() => setShowSaveTemplate(true)} className="text-violet-400 hover:text-violet-300 text-sm">Save as Template</button>}</div>{showSaveTemplate && <div className="mb-3 flex gap-2"><input className="input-field flex-1" placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} /><button onClick={() => setShowSaveTemplate(false)} className="btn-secondary !px-3">Cancel</button></div>}<div className="mb-3"><label className="text-xs text-gray-400 mb-1 block">Program (optional)</label><select className="input-field" value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)}><option value="">None</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></div><div className="mb-3"><label className="text-xs text-gray-400 mb-1 block">Add Exercise</label><div className="relative"><input className="input-field" placeholder="Search or type an exercise" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExercise(); } }} />{showSuggestions && filteredExercises.length > 0 && <div className="absolute z-20 mt-2 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 p-2 shadow-xl">{filteredExercises.map((exercise) => <button key={exercise} onClick={() => addExercise(exercise)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-800">{exercise}</button>)}</div>}</div></div>

            {exercises.length >= 2 && <div className="flex items-center gap-3 mb-3 text-sm">{!showSupersetSelect ? <button onClick={() => { setShowSupersetSelect(true); setSupersetSelection(new Set()); }} className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"><Link size={14} />Link as Superset</button> : <><span className="text-xs text-gray-400">Select exercises to group:</span><button onClick={createSuperset} className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors">Confirm ({supersetSelection.size})</button><button onClick={() => { setShowSupersetSelect(false); setSupersetSelection(new Set()); }} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button></>}</div>}
            {supersets.length > 0 && <div className="space-y-1 mb-3">{supersets.map((sg, gi) => <div key={gi} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 rounded-lg px-3 py-1.5"><Unlink size={12} className="text-violet-400" /><span>{sg.exerciseIndices.map((i, idx) => `${getSupersetLabel(gi, idx)} ${exercises[i]?.name || '?'}`).join(' · ')}</span><button onClick={() => removeSuperset(gi)} className="text-gray-500 hover:text-red-400 ml-auto"><X size={12} /></button></div>)}</div>}

            {exercises.map((ex, exIdx) => { const sgInfo = getSupersetGroup(exIdx); const borderColor = sgInfo ? getSupersetColor(sgInfo.groupIdx) : 'border-transparent'; const suggestion = overloadSuggestions[ex.name]; return <div key={exIdx} className="relative">{sgInfo && <div className={`mb-1 inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${getSupersetBgColor(sgInfo.groupIdx)} text-violet-300`}>{getSupersetLabel(sgInfo.groupIdx, sgInfo.itemIndex)}</div>}<div className={`card mb-2 border-l-4 ${borderColor}`}>{showSupersetSelect && <button onClick={() => toggleSupersetSelection(exIdx)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mb-2 transition-colors ${supersetSelection.has(exIdx) ? 'border-violet-500 bg-violet-600' : 'border-gray-600 bg-transparent'}`}>{supersetSelection.has(exIdx) && <span className="text-white text-xs">✓</span>}</button>}<div className="flex items-center justify-between mb-2"><h3 className="font-semibold">{ex.name}</h3><button onClick={() => removeExercise(exIdx)} className="text-gray-500 hover:text-red-400 flex-shrink-0 ml-2"><X size={18} /></button></div>{suggestion && !dismissedAlerts.has(ex.name) && <div className="flex items-start gap-2 text-xs bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2 mb-3"><Lightbulb size={14} className="text-amber-400 flex-shrink-0 mt-0.5" /><div className="flex-1"><p className="text-violet-200">{suggestion.suggestion}</p><div className="flex gap-3 mt-1"><span className="text-gray-400">Target: <span className="text-violet-300 font-medium">{suggestion.targetWeight}lbs x {suggestion.targetReps}</span></span></div></div><button onClick={() => setDismissedAlerts((prev) => new Set(prev).add(ex.name))} className="text-gray-500 hover:text-gray-300 flex-shrink-0"><X size={12} /></button></div>}<div className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 mb-2 text-xs text-gray-500 px-1"><span>Set</span><span>Weight</span><span>Reps</span><span></span></div>{ex.sets.map((set, setIdx) => <div key={setIdx} className="grid grid-cols-[28px_1fr_1fr_28px] gap-2 mb-2 items-center"><button onClick={() => toggleSetComplete(exIdx, setIdx)} className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${set.completed ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400'}`}>{sgInfo ? getSupersetLabel(sgInfo.groupIdx, sgInfo.itemIndex) : setIdx + 1}</button><input type="number" className="input-field text-center !py-1.5" value={set.weight || ''} onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))} /><input type="number" className="input-field text-center !py-1.5" value={set.reps || ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))} /><button onClick={() => removeSet(exIdx, setIdx)} className="text-gray-600 hover:text-red-400"><X size={14} /></button></div>)}<button onClick={() => addSet(exIdx)} className="w-full text-xs text-gray-500 hover:text-gray-300 py-1.5 border border-dashed border-gray-700 rounded-lg transition-colors">+ Add Set</button></div></div>; })}

            <div className="mt-2 border-t border-gray-800 pt-3"><button onClick={() => setShowNotesRpe((v) => !v)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-full"><FileText size={15} /><span>Notes & RPE</span>{workoutRpe > 0 && <span className={`ml-auto text-xs font-semibold ${getRpeColor(workoutRpe)}`}>RPE {workoutRpe}</span>}{showNotesRpe ? <ChevronUp size={15} className="ml-1" /> : <ChevronDown size={15} className="ml-1" />}</button>{showNotesRpe && <div className="mt-3 space-y-4"><textarea className="input-field resize-none" rows={3} placeholder="How did it go?" value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)} maxLength={500} /><div><div className="flex items-center justify-between mb-2"><label className="text-xs text-gray-400">RPE</label><span className={`text-sm font-bold ${getRpeColor(workoutRpe)}`}>{workoutRpe} — {RPE_LABELS[workoutRpe]}</span></div><input type="range" min={1} max={10} value={workoutRpe} onChange={(e) => setWorkoutRpe(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700" step={1} /><div className="flex justify-between mt-1">{[1,2,3,4,5,6,7,8,9,10].map((n) => <button key={n} onClick={() => setWorkoutRpe(n)} className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${workoutRpe === n ? `${getRpeBarColor(n)} text-white` : 'text-gray-600 hover:text-gray-400'}`}>{n}</button>)}</div></div></div>}</div>
            <div className="flex gap-2 mt-4"><button onClick={cancelWorkout} className="btn-secondary flex-1">Cancel</button><button onClick={finishWorkout} disabled={exercises.length === 0} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"><Save size={16} />Finish Workout</button></div>
          </div>}

          <RestTimer show={showRestTimer} onClose={() => setShowRestTimer(false)} autoStartSeconds={restTimerSeconds} />
          <div className="space-y-3">{workouts.filter((w) => w.scheduledFor === new Date().toISOString().slice(0,10)).length === 0 && !isNew && <div className="card text-center py-10"><Activity size={36} className="text-gray-600 mx-auto mb-3" /><p className="text-gray-400 font-medium">No session planned for today</p><p className="text-gray-600 text-sm mt-1">Use Plans to create a repeating schedule or start a fresh session now.</p></div>}{workouts.filter((w) => w.scheduledFor === new Date().toISOString().slice(0,10)).map((w) => <div key={w.id} className="card"><div className="flex items-center justify-between"><div><p className="font-semibold">Today&apos;s Session</p><p className="text-sm text-gray-400">{w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}{w.recurringPlanId ? ' · recurring' : ''}</p></div><button onClick={() => { setExercises(w.exercises); setWorkoutNotes(w.notes || ''); setIsNew(true); }} className="btn-primary !px-3 !py-2 text-sm">Start</button></div><div className="mt-3 flex flex-wrap gap-2">{w.exercises.map((ex, idx) => <span key={idx} className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300">{ex.name}</span>)}</div></div>)}{workouts.filter((w) => w.scheduledFor !== new Date().toISOString().slice(0,10)).length > 0 && <div className="card"><div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold">Upcoming scheduled</h2><button onClick={() => setActiveTab('plans')} className="text-xs text-violet-400">Manage Plans</button></div><div className="space-y-2">{workouts.filter((w) => w.scheduledFor && w.scheduledFor > new Date().toISOString().slice(0,10)).slice(0,5).map((w) => <div key={w.id} className="rounded-lg bg-gray-900/60 px-3 py-2"><p className="text-sm font-medium">{w.scheduledFor}</p><p className="text-xs text-gray-500">{w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}</p></div>)}</div></div>}</div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">{workouts.length === 0 && <div className="card text-center py-10"><Activity size={36} className="text-gray-600 mx-auto mb-3" /><p className="text-gray-400 font-medium">No workout history yet</p><p className="text-gray-600 text-sm mt-1">Completed sessions will appear here.</p></div>}{filteredWorkouts.length === 0 && workouts.length > 0 && <div className="card text-center py-10"><Filter size={36} className="text-gray-600 mx-auto mb-3" /><p className="text-gray-400 font-medium">No workouts found</p><p className="text-gray-600 text-sm mt-1">Try adjusting your filters.</p></div>}{filteredWorkouts.map((w) => <div key={w.id} className="card"><div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}><div><p className="font-semibold">{formatDate(w.date)}</p><p className="text-sm text-gray-400">{w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}{calcVolume(w.exercises) > 0 && ` · ${calcVolume(w.exercises).toLocaleString()} lbs`}{w.rpe !== undefined && <span className={`ml-2 font-medium ${getRpeColor(w.rpe)}`}>RPE {w.rpe}</span>}</p></div><div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={16} /></button>{expandedId === w.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}</div></div>{expandedId === w.id && <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">{w.notes && <div className="flex gap-2 text-sm text-gray-400 bg-gray-800/60 rounded-lg px-3 py-2"><FileText size={14} className="flex-shrink-0 mt-0.5" /><p className="italic">{w.notes}</p></div>}{w.exercises.map((ex, i) => <div key={i}><p className="text-sm font-medium text-gray-300">{ex.name}</p><div className="flex flex-wrap gap-1.5 mt-1">{ex.sets.filter((s) => s.completed).map((s, si) => <span key={si} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{s.weight}lbs × {s.reps}</span>)}</div></div>)}</div>}</div>)}</div>
      )}

      {showTemplateModal && <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center"><div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-4"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Templates</h2><button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div>{templates.length === 0 ? <p className="text-sm text-gray-500">No templates yet.</p> : <div className="space-y-3">{templates.map((template) => <button key={template.id} onClick={() => loadTemplateIntoWorkout(template)} className="w-full rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-left hover:bg-gray-800"><p className="font-medium">{template.name}</p><p className="text-xs text-gray-500 mt-1">{template.exercises.map((exercise) => exercise.name).join(' • ')}</p></button>)}</div>}</div></div>}
    </div>
  );
}
