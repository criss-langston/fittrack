"use client";

import { useState, useEffect, useMemo } from "react";
import { addPhase, getPhases, deletePhase, generateId, updatePhase, type FitnessPhase, type PhaseType } from "@/lib/db";
import { useToast } from "@/app/providers";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus, Trash2, X, Pencil } from "lucide-react";

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PHASE_COLORS: Record<PhaseType, string> = { bulk: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', cut: 'bg-red-500/20 text-red-300 border-red-500/30', maintenance: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };

function getDaysInMonth(year: number, month: number): number { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number): number { return new Date(year, month, 1).getDay(); }
function formatDateISO(year: number, month: number, day: number): string { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
function getTodayISO(): string { const now = new Date(); return formatDateISO(now.getFullYear(), now.getMonth(), now.getDate()); }
function overlapsMonth(phase: FitnessPhase, year: number, month: number) { const monthStart = formatDateISO(year, month, 1); const monthEnd = formatDateISO(year, month, getDaysInMonth(year, month)); return phase.startDate <= monthEnd && phase.endDate >= monthStart; }
function isPhaseOnDate(phase: FitnessPhase, date: string) { return phase.startDate <= date && phase.endDate >= date; }

export default function CalendarPage() {
  const { showToast } = useToast();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [phases, setPhases] = useState<FitnessPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [showForm, setShowForm] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', type: 'maintenance' as PhaseType, startDate: getTodayISO(), endDate: getTodayISO(), description: '' });

  const loadPhases = async () => { setLoading(true); setPhases(await getPhases()); setLoading(false); };
  useEffect(() => { loadPhases(); }, []);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = getTodayISO();

  const calendarDays = useMemo(() => {
    const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
    const prevMonthDays = getDaysInMonth(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({ day, dateStr: formatDateISO(y, m, day), isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) days.push({ day, dateStr: formatDateISO(currentYear, currentMonth, day), isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({ day, dateStr: formatDateISO(y, m, day), isCurrentMonth: false });
    }
    return days;
  }, [currentYear, currentMonth, daysInMonth, firstDay]);

  const selectedPhases = phases.filter((phase) => isPhaseOnDate(phase, selectedDate));
  const monthPhases = phases.filter((phase) => overlapsMonth(phase, currentYear, currentMonth));

  const openCreate = () => {
    setEditingPhaseId(null);
    setDraft({ name: '', type: 'maintenance', startDate: selectedDate, endDate: selectedDate, description: '' });
    setShowForm(true);
  };

  const openEdit = (phase: FitnessPhase) => {
    setEditingPhaseId(phase.id);
    setDraft({ name: phase.name, type: phase.type, startDate: phase.startDate, endDate: phase.endDate, description: phase.description || '' });
    setShowForm(true);
  };

  const savePhase = async () => {
    if (!draft.name.trim()) {
      showToast("Phase name is required.", "error");
      return;
    }
    if (draft.endDate < draft.startDate) {
      showToast("End date cannot be before start date.", "error");
      return;
    }
    if (editingPhaseId) {
      await updatePhase(editingPhaseId, { name: draft.name.trim(), type: draft.type, startDate: draft.startDate, endDate: draft.endDate, description: draft.description.trim() || undefined });
      showToast("Phase updated.", "success");
    } else {
      await addPhase({ id: generateId(), name: draft.name.trim(), type: draft.type, startDate: draft.startDate, endDate: draft.endDate, description: draft.description.trim() || undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      showToast("Phase created.", "success");
    }
    setShowForm(false);
    setEditingPhaseId(null);
    setDraft({ name: '', type: 'maintenance', startDate: selectedDate, endDate: selectedDate, description: '' });
    await loadPhases();
  };

  const confirmDeletePhase = async (id: string) => { if (confirm('Delete this phase?')) { await deletePhase(id); await loadPhases(); showToast('Phase deleted.', 'success'); } };
  const goToPrevMonth = () => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear((y) => y - 1)) : setCurrentMonth((m) => m - 1);
  const goToNextMonth = () => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear((y) => y + 1)) : setCurrentMonth((m) => m + 1);

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-gray-500">Track cutting, bulking, and maintenance phases.</p>
        </div>
        <button onClick={openCreate} className="btn-primary !px-3 !py-2 flex items-center gap-2"><Plus size={16} /> Phase</button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={goToPrevMonth} className="p-2 text-gray-400 hover:text-white"><ChevronLeft size={20} /></button>
        <h2 className="text-lg font-semibold">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
        <button onClick={goToNextMonth} className="p-2 text-gray-400 hover:text-white"><ChevronRight size={20} /></button>
      </div>

      {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          <div className="card p-2 mb-4">
            <div className="grid grid-cols-7 mb-1">{DAY_NAMES.map((d) => <div key={d} className="py-1 text-center text-[10px] font-medium text-gray-600">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ day, dateStr, isCurrentMonth }) => {
                const phasesForDay = phases.filter((phase) => isPhaseOnDate(phase, dateStr));
                const topPhase = phasesForDay[0];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <button key={dateStr} onClick={() => setSelectedDate(dateStr)} className={`aspect-square rounded-xl border p-1 text-left transition-colors ${isSelected ? 'border-violet-500 bg-violet-500/10' : 'border-gray-800 bg-gray-900/60 hover:bg-gray-800'} ${!isCurrentMonth ? 'opacity-40' : ''}`}>
                    <div className={`text-sm ${isToday ? 'font-bold text-violet-300' : 'text-gray-200'}`}>{day}</div>
                    {topPhase && <div className={`mt-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium truncate ${PHASE_COLORS[topPhase.type]}`}>{topPhase.name}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card mb-4">
            <div className="flex items-center gap-2 mb-3"><CalIcon size={16} className="text-violet-400" /><h3 className="text-sm font-semibold">Selected date</h3></div>
            <p className="text-sm text-gray-400 mb-3">{new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            {selectedPhases.length === 0 ? <p className="text-sm text-gray-500">No phase assigned to this day.</p> : <div className="space-y-2">{selectedPhases.map((phase) => <div key={phase.id} className={`rounded-xl border p-3 ${PHASE_COLORS[phase.type]}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{phase.name}</p><p className="text-xs opacity-80">{phase.startDate} → {phase.endDate}</p>{phase.description && <p className="mt-1 text-xs opacity-80">{phase.description}</p>}</div><div className="flex items-center gap-2"><button onClick={() => openEdit(phase)} className="opacity-70 hover:opacity-100"><Pencil size={14} /></button><button onClick={() => confirmDeletePhase(phase.id)} className="opacity-70 hover:opacity-100"><Trash2 size={14} /></button></div></div></div>)}</div>}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold mb-3">This month&apos;s phases</h3>
            {monthPhases.length === 0 ? <p className="text-sm text-gray-500">No phases in this month yet.</p> : <div className="space-y-2">{monthPhases.map((phase) => <div key={phase.id} className="flex items-center justify-between rounded-xl bg-gray-900/60 px-3 py-2"><div><p className="text-sm font-medium">{phase.name}</p><p className="text-xs text-gray-500">{phase.startDate} → {phase.endDate}</p></div><div className="flex items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${PHASE_COLORS[phase.type]}`}>{phase.type}</span><button onClick={() => openEdit(phase)} className="text-gray-400 hover:text-white"><Pencil size={14} /></button></div></div>)}</div>}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-4">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{editingPhaseId ? 'Edit Phase' : 'New Phase'}</h2><button onClick={() => { setShowForm(false); setEditingPhaseId(null); }} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
            <div className="space-y-3">
              <input className="input-field" placeholder="Phase name" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
              <select className="input-field" value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as PhaseType }))}><option value="bulk">Bulking</option><option value="cut">Cutting</option><option value="maintenance">Maintenance</option></select>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-400 mb-1 block">Start date</label><input type="date" className="input-field" value={draft.startDate} onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))} /></div><div><label className="text-xs text-gray-400 mb-1 block">End date</label><input type="date" className="input-field" value={draft.endDate} onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))} /></div></div>
              <textarea className="input-field min-h-24 resize-none" placeholder="Description" value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
              <button onClick={savePhase} className="btn-primary w-full">{editingPhaseId ? 'Update Phase' : 'Save Phase'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
