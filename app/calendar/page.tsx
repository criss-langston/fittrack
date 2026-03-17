"use client";

import { useState, useEffect } from "react";
import { getWorkouts, getPrograms } from "@/lib/db";
import { ChevronLeft, ChevronRight, Dumbbell, Calendar as CalIcon, Star, Flame } from "lucide-react";
import Link from "next/link";

interface WorkoutData {
  id: string;
  date: string;
  exercises: {
    name: string;
    sets: { reps: number; weight: number; completed: boolean }[];
  }[];
  programId?: string;
}

interface Program {
  id: string;
  name: string;
  days: { name: string; exercises: { name: string; sets: number; reps: string }[] }[];
  isActive: boolean;
  createdAt: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateISO(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getTodayISO(): string {
  const now = new Date();
  return formatDateISO(now.getFullYear(), now.getMonth(), now.getDate());
}

function getProgramDayForDate(program: Program, dateStr: string): { name: string; exercises: { name: string; sets: number; reps: string }[]; dayIndex: number } | null {
  const created = new Date(program.createdAt);
  const target = new Date(dateStr);
  created.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((target.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince < 0) return null;
  const dayIndex = daysSince % program.days.length;
  return { ...program.days[dayIndex], dayIndex };
}

function getWorkoutVolume(workout: WorkoutData): number {
  return workout.exercises.reduce((total, ex) =>
    total + ex.sets.filter(s => s.completed).reduce((sum, s) => sum + s.reps * s.weight, 0), 0);
}

export default function CalendarPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [w, p] = await Promise.all([getWorkouts(), getPrograms()]);
      setWorkouts(w as WorkoutData[]);
      setPrograms(p as Program[]);
      setLoading(false);
    }
    load();
  }, []);

  const activeProgram = programs.find(p => p.isActive);
  const today = getTodayISO();

  // Group workouts by date
  const workoutsByDate = new Map<string, WorkoutData[]>();
  for (const w of workouts) {
    const dateStr = w.date.split('T')[0];
    const existing = workoutsByDate.get(dateStr) || [];
    existing.push(w);
    workoutsByDate.set(dateStr, existing);
  }

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(today);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Build calendar grid
  const calendarDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month fill
  const prevMonthDays = getDaysInMonth(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({ day, dateStr: formatDateISO(y, m, day), isCurrentMonth: false });
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, dateStr: formatDateISO(currentYear, currentMonth, day), isCurrentMonth: true });
  }

  // Next month fill
  const remaining = 42 - calendarDays.length;
  for (let day = 1; day <= remaining; day++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({ day, dateStr: formatDateISO(y, m, day), isCurrentMonth: false });
  }

  // Calculate monthly stats
  const monthWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalVolume = monthWorkouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
  const workoutDays = new Set(monthWorkouts.map(w => w.date.split('T')[0])).size;

  // Get selected date details
  const selectedWorkouts = selectedDate ? workoutsByDate.get(selectedDate) || [] : [];
  const selectedProgramDay = activeProgram && selectedDate ? getProgramDayForDate(activeProgram, selectedDate) : null;

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <button onClick={goToToday} className="text-xs text-violet-400 hover:text-violet-300 font-medium bg-violet-500/10 px-3 py-1.5 rounded-lg">
          Today
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={goToPrevMonth} className="p-2 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
            <button onClick={goToNextMonth} className="p-2 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Monthly stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-violet-400">{monthWorkouts.length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Workouts</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-emerald-400">{workoutDays}</p>
              <p className="text-[10px] text-gray-500 uppercase">Active Days</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xl font-bold text-amber-400">{totalVolume >= 1000 ? `${Math.round(totalVolume/1000)}k` : totalVolume}</p>
              <p className="text-[10px] text-gray-500 uppercase">Volume (lbs)</p>
            </div>
          </div>

          {/* Active program indicator */}
          {activeProgram && (
            <div className="flex items-center gap-2 mb-3 text-xs text-violet-400">
              <Star size={12} />
              <span>{activeProgram.name} active</span>
            </div>
          )}

          {/* Calendar grid */}
          <div className="card p-2 mb-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-[10px] text-gray-600 font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map(({ day, dateStr, isCurrentMonth }) => {
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const dayWorkouts = workoutsByDate.get(dateStr) || [];
                const hasWorkout = dayWorkouts.length > 0;
                const programDay = activeProgram ? getProgramDayForDate(activeProgram, dateStr) : null;
                const isFuture = dateStr > today;
                const hasProgramToday = programDay && programDay.exercises.length > 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg relative transition-all text-sm ${
                      !isCurrentMonth ? 'opacity-30' : ''
                    } ${
                      isSelected
                        ? 'bg-violet-600 text-white'
                        : isToday
                        ? 'bg-violet-500/20 text-violet-300 font-bold'
                        : 'hover:bg-gray-800 text-gray-300'
                    } ${isFuture && !isToday ? 'opacity-60' : ''}`}
                  >
                    <span className={`text-sm ${isToday && !isSelected ? 'font-bold' : ''}`}>{day}</span>
                    <div className="flex gap-0.5 mt-0.5">
                      {hasWorkout && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-500'}`} />
                      )}
                      {!hasWorkout && hasProgramToday && isCurrentMonth && !isFuture && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/50' : 'bg-gray-600'}`} />
                      )}
                      {!hasWorkout && hasProgramToday && isCurrentMonth && isFuture && (
                        <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/30' : 'bg-gray-700'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Workout logged
            </span>
            {activeProgram && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-600" /> Program day
              </span>
            )}
          </div>

          {/* Selected day details */}
          {selectedDate && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>

              {/* Workouts for selected day */}
              {selectedWorkouts.length > 0 ? (
                selectedWorkouts.map((w, i) => (
                  <div key={w.id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Dumbbell size={14} className="text-violet-400" />
                        <span className="text-sm font-medium">Workout {selectedWorkouts.length > 1 ? i + 1 : ''}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {getWorkoutVolume(w).toLocaleString()} lbs volume
                      </span>
                    </div>
                    <div className="space-y-1">
                      {w.exercises.map((ex, ei) => {
                        const completedSets = ex.sets.filter(s => s.completed);
                        return (
                          <div key={ei} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300">{ex.name}</span>
                            <span className="text-gray-500">
                              {completedSets.length} set{completedSets.length !== 1 ? 's' : ''}
                              {completedSets.length > 0 && ` \u00b7 ${Math.max(...completedSets.map(s => s.weight))}lbs max`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : selectedDate <= today ? (
                <div className="card text-center py-6">
                  <Flame size={24} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No workout logged</p>
                  {selectedDate === today && (
                    <Link href="/workouts" className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block">
                      Start one now
                    </Link>
                  )}
                </div>
              ) : null}

              {/* Program schedule for selected day */}
              {selectedProgramDay && selectedProgramDay.exercises.length > 0 && (
                <div className="card border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={12} className="text-violet-400" />
                    <span className="text-xs font-medium text-violet-400">{activeProgram?.name} \u2014 {selectedProgramDay.name}</span>
                  </div>
                  <div className="space-y-1">
                    {selectedProgramDay.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">{ex.name}</span>
                        <span className="text-gray-500">{ex.sets}x{ex.reps}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}