"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addMacroLog,
  getMacroLogs,
  deleteMacroLog,
  getDailyNutritionSummary,
  generateId,
  getDefaultUserProfile,
  updateUserProfile,
  type UserProfile,
  type MacroLog,
} from "@/lib/db";
import {
  Plus,
  Trash2,
  X,
  Flame,
  Beef,
  Wheat,
  Droplet,
  ChevronDown,
  ChevronUp,
  Target,
  PencilLine,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function getTodayISO() { return new Date().toISOString().split('T')[0]; }
function getYesterdayISO() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; }
function getWeekDates(): string[] { const dates: string[] = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().split('T')[0]); } return dates; }
function progressColor(consumed: number, target: number) { return target > 0 && consumed > target ? 'bg-red-500' : 'bg-emerald-500'; }

export default function NutritionPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [entries, setEntries] = useState<MacroLog[]>([]);
  const [summary, setSummary] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 });
  const [weeklyAvg, setWeeklyAvg] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState({ targetCalories: 2200, targetProtein: 150, targetCarbs: 250, targetFats: 65 });
  const [draft, setDraft] = useState({ calories: '', protein: '', carbs: '', fat: '', notes: '' });

  const loadTargets = useCallback(async () => {
    const p = await getDefaultUserProfile();
    setProfile(p);
    setTargets({
      targetCalories: p.targetCalories || 2200,
      targetProtein: p.targetProtein || 150,
      targetCarbs: p.targetCarbs || 250,
      targetFats: p.targetFats || 65,
    });
  }, []);

  const loadDay = useCallback(async (date: string) => {
    setLoading(true);
    const [dayLogs, daySummary] = await Promise.all([getMacroLogs(date), getDailyNutritionSummary(date)]);
    setEntries(dayLogs);
    setSummary(daySummary);
    setLoading(false);
  }, []);

  const loadWeeklyAvg = useCallback(async () => {
    const weekDates = getWeekDates();
    let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, daysWithData = 0;
    for (const date of weekDates) {
      const s = await getDailyNutritionSummary(date);
      if (s.mealCount > 0) {
        totalCal += s.totalCalories;
        totalPro += s.totalProtein;
        totalCarb += s.totalCarbs;
        totalFat += s.totalFat;
        daysWithData++;
      }
    }
    setWeeklyAvg({
      calories: daysWithData > 0 ? Math.round(totalCal / daysWithData) : 0,
      protein: daysWithData > 0 ? Math.round(totalPro / daysWithData) : 0,
      carbs: daysWithData > 0 ? Math.round(totalCarb / daysWithData) : 0,
      fat: daysWithData > 0 ? Math.round(totalFat / daysWithData) : 0,
    });
  }, []);

  useEffect(() => { loadTargets(); }, [loadTargets]);
  useEffect(() => { loadDay(selectedDate); loadWeeklyAvg(); }, [selectedDate, loadDay, loadWeeklyAvg]);

  const saveTargets = async () => {
    const updated = await updateUserProfile(targets);
    if (updated) setProfile(updated);
  };

  const saveEntry = async () => {
    const calories = Number(draft.calories) || 0;
    const protein = Number(draft.protein) || 0;
    const carbs = Number(draft.carbs) || 0;
    const fat = Number(draft.fat) || 0;
    if (calories <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) return;
    await addMacroLog({
      id: generateId(),
      date: selectedDate,
      calories,
      protein,
      carbs,
      fat,
      notes: draft.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setDraft({ calories: '', protein: '', carbs: '', fat: '', notes: '' });
    setShowAddEntry(false);
    loadDay(selectedDate);
    loadWeeklyAvg();
  };

  const handleDeleteEntry = async (id: string) => { await deleteMacroLog(id); loadDay(selectedDate); loadWeeklyAvg(); };
  const isToday = selectedDate === getTodayISO();
  const isYesterday = selectedDate === getYesterdayISO();
  const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : formatDate(selectedDate);
  const goToPrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); };
  const goToNextDay = () => { const next = new Date(selectedDate); const today = new Date(); next.setDate(next.getDate() + 1); if (next <= today) setSelectedDate(next.toISOString().split('T')[0]); };

  const cards = [
    { key: 'cal', label: 'Calories', value: summary.totalCalories, target: targets.targetCalories, unit: '', icon: Flame, iconClass: 'text-orange-400' },
    { key: 'protein', label: 'Protein', value: summary.totalProtein, target: targets.targetProtein, unit: 'g', icon: Beef, iconClass: 'text-red-400' },
    { key: 'carbs', label: 'Carbs', value: summary.totalCarbs, target: targets.targetCarbs, unit: 'g', icon: Wheat, iconClass: 'text-yellow-400' },
    { key: 'fat', label: 'Fat', value: summary.totalFat, target: targets.targetFats, unit: 'g', icon: Droplet, iconClass: 'text-cyan-400' },
  ];

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <div className="flex items-center gap-2">
          <button onClick={goToPrevDay} className="p-2 text-gray-400 hover:text-white transition-colors"><ChevronDown size={18} className="rotate-90" /></button>
          <span className="text-sm font-medium min-w-[80px] text-center">{dateLabel}</span>
          <button onClick={goToNextDay} className={`p-2 transition-colors ${isToday ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`} disabled={isToday}><ChevronUp size={18} className="rotate-90" /></button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3"><Target size={16} className="text-violet-400" /><h2 className="text-sm font-semibold">Daily targets</h2></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-400 mb-1 block">Calories</label><input type="number" className="input-field" value={targets.targetCalories} onChange={(e) => setTargets((p) => ({ ...p, targetCalories: Number(e.target.value) || 0 }))} /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Protein (g)</label><input type="number" className="input-field" value={targets.targetProtein} onChange={(e) => setTargets((p) => ({ ...p, targetProtein: Number(e.target.value) || 0 }))} /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Carbs (g)</label><input type="number" className="input-field" value={targets.targetCarbs} onChange={(e) => setTargets((p) => ({ ...p, targetCarbs: Number(e.target.value) || 0 }))} /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Fat (g)</label><input type="number" className="input-field" value={targets.targetFats} onChange={(e) => setTargets((p) => ({ ...p, targetFats: Number(e.target.value) || 0 }))} /></div>
        </div>
        <button onClick={saveTargets} className="btn-secondary w-full mt-3">Save Targets</button>
      </div>

      {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {cards.map(({ key, label, value, target, unit, icon: Icon, iconClass }) => (
              <div key={key} className="card">
                <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Icon size={16} className={iconClass} /><span className="text-xs text-gray-500">{label}</span></div><span className="text-xs text-gray-600">{target ? Math.round((value / target) * 100) : 0}%</span></div>
                <p className="text-2xl font-bold">{value}{unit && <span className="text-sm font-normal text-gray-500">{unit}</span>}</p>
                <p className="text-xs text-gray-500 mt-1">Target {target}{unit}</p>
                <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${progressColor(value, target)}`} style={{ width: `${Math.min(100, target > 0 ? (value / target) * 100 : 0)}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="card mb-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-2">Weekly average</h2>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div><p className="text-gray-500">Cal</p><p className="font-semibold">{weeklyAvg.calories}</p></div>
              <div><p className="text-gray-500">P</p><p className="font-semibold">{weeklyAvg.protein}g</p></div>
              <div><p className="text-gray-500">C</p><p className="font-semibold">{weeklyAvg.carbs}g</p></div>
              <div><p className="text-gray-500">F</p><p className="font-semibold">{weeklyAvg.fat}g</p></div>
            </div>
          </div>

          <div className="mb-4">
            <button onClick={() => setShowAddEntry((v) => !v)} className="btn-primary w-full flex items-center justify-center gap-2"><Plus size={16} /> Log Macros</button>
          </div>

          {showAddEntry && (
            <div className="card mb-4 space-y-4">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Log Daily Macros</h2><button onClick={() => { setShowAddEntry(false); setDraft({ calories: '', protein: '', carbs: '', fat: '', notes: '' }); }} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 mb-1 block">Calories</label><input type="number" className="input-field" value={draft.calories} onChange={(e) => setDraft((p) => ({ ...p, calories: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Protein (g)</label><input type="number" className="input-field" value={draft.protein} onChange={(e) => setDraft((p) => ({ ...p, protein: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Carbs (g)</label><input type="number" className="input-field" value={draft.carbs} onChange={(e) => setDraft((p) => ({ ...p, carbs: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-400 mb-1 block">Fat (g)</label><input type="number" className="input-field" value={draft.fat} onChange={(e) => setDraft((p) => ({ ...p, fat: e.target.value }))} /></div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                <textarea className="input-field min-h-20 resize-none" placeholder="Optional note for this macro entry" value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <button onClick={saveEntry} className="btn-primary w-full">Save Macro Entry</button>
            </div>
          )}

          <div className="space-y-3">
            {entries.length === 0 && <div className="card text-center py-10 text-gray-500 text-sm">No macro entries logged for this day yet.</div>}
            {entries.map((entry) => (
              <div key={entry.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold flex items-center gap-2"><PencilLine size={14} className="text-violet-400" /> Macro Entry</p>
                    <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-gray-800/70 px-3 py-2"><p className="text-xs text-gray-500">Cal</p><p className="font-semibold">{entry.calories}</p></div>
                  <div className="rounded-lg bg-gray-800/70 px-3 py-2"><p className="text-xs text-gray-500">P</p><p className="font-semibold">{entry.protein}g</p></div>
                  <div className="rounded-lg bg-gray-800/70 px-3 py-2"><p className="text-xs text-gray-500">C</p><p className="font-semibold">{entry.carbs}g</p></div>
                  <div className="rounded-lg bg-gray-800/70 px-3 py-2"><p className="text-xs text-gray-500">F</p><p className="font-semibold">{entry.fat}g</p></div>
                </div>
                {entry.notes && <p className="text-xs text-gray-500 mt-3">{entry.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
