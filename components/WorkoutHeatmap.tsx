"use client";

import { useMemo } from "react";

interface Workout {
  id: string;
  date: string;
  exercises: {
    name: string;
    sets: { reps: number; weight: number; completed: boolean }[];
  }[];
}

interface WorkoutHeatmapProps {
  workouts: Workout[];
}

export default function WorkoutHeatmap({ workouts }: WorkoutHeatmapProps) {
  const { grid, monthLabels, currentStreak, longestStreak, thisMonthCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build a map of date string -> workout count
    const countMap: Record<string, number> = {};
    for (const w of workouts) {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split("T")[0];
      countMap[key] = (countMap[key] || 0) + 1;
    }

    // Generate 84 days (12 weeks) ending today
    const days: { date: Date; count: number; dateStr: string }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push({ date: new Date(d), count: countMap[key] || 0, dateStr: key });
    }

    // Arrange into grid: columns = weeks, rows = days of week (0=Sun..6=Sat)
    // We want Mon at top. Rearrange: Mon=0, Tue=1, ..., Sun=6
    const weeks: { date: Date; count: number; dateStr: string; dayOfWeek: number }[][] = [];
    let currentWeek: { date: Date; count: number; dateStr: string; dayOfWeek: number }[] = [];

    for (const day of days) {
      // JS getDay: 0=Sun, 1=Mon, ..., 6=Sat
      // We want Mon=0, so: (getDay() + 6) % 7
      const dow = (day.date.getDay() + 6) % 7;

      if (currentWeek.length > 0 && dow === 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({ ...day, dayOfWeek: dow });
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Month labels - find first day of each month that appears
    const labels: { text: string; weekIdx: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let lastMonth = -1;
    for (let wi = 0; wi < weeks.length; wi++) {
      for (const day of weeks[wi]) {
        const m = day.date.getMonth();
        if (m !== lastMonth) {
          labels.push({ text: monthNames[m], weekIdx: wi });
          lastMonth = m;
        }
      }
    }

    // Calculate streaks
    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    // Walk backward from today to calculate current streak
    for (let i = 0; i <= 83; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if (countMap[key] && countMap[key] > 0) {
        current++;
      } else if (i === 0) {
        // Today might not have a workout yet, check yesterday
        continue;
      } else {
        break;
      }
    }

    // Walk through all days for longest streak
    const allDays = Object.keys(countMap).sort();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if (countMap[key] && countMap[key] > 0) {
        tempStreak++;
        longest = Math.max(longest, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // This month count
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    let monthCount = 0;
    for (const w of workouts) {
      const d = new Date(w.date);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        monthCount++;
      }
    }

    return {
      grid: weeks,
      monthLabels: labels,
      currentStreak: current,
      longestStreak: longest,
      thisMonthCount: monthCount,
    };
  }, [workouts]);

  const getCellColor = (count: number) => {
    if (count === 0) return "bg-gray-800";
    if (count === 1) return "bg-violet-900";
    return "bg-violet-600";
  };

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <div>
      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        {/* Month labels */}
        <div className="flex ml-8 mb-1">
          {monthLabels.map((label, i) => (
            <span
              key={i}
              className="text-[10px] text-gray-500"
              style={{
                position: "relative",
                left: `${label.weekIdx * 16}px`,
                marginRight: i < monthLabels.length - 1
                  ? `${(monthLabels[i + 1].weekIdx - label.weekIdx) * 16 - 28}px`
                  : 0,
              }}
            >
              {label.text}
            </span>
          ))}
        </div>

        <div className="flex gap-0">
          {/* Day of week labels */}
          <div className="flex flex-col gap-[3px] mr-2 flex-shrink-0">
            {dayLabels.map((label, i) => (
              <div key={i} className="h-[12px] flex items-center">
                <span className="text-[10px] text-gray-500 w-6 text-right">{label}</span>
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="flex gap-[3px]">
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {/* Pad the first week if it doesn't start on Monday */}
                {wi === 0 && week[0] && week[0].dayOfWeek > 0 &&
                  Array.from({ length: week[0].dayOfWeek }).map((_, pi) => (
                    <div key={`pad-${pi}`} className="w-[12px] h-[12px]" />
                  ))
                }
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-[12px] h-[12px] rounded-[2px] ${getCellColor(day.count)} transition-colors`}
                    title={`${day.dateStr}: ${day.count} workout${day.count !== 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-violet-400">{currentStreak}</p>
          <p className="text-[10px] text-gray-500">Current Streak</p>
        </div>
        <div className="w-px h-8 bg-gray-800" />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-violet-400">{longestStreak}</p>
          <p className="text-[10px] text-gray-500">Longest Streak</p>
        </div>
        <div className="w-px h-8 bg-gray-800" />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-violet-400">{thisMonthCount}</p>
          <p className="text-[10px] text-gray-500">This Month</p>
        </div>
      </div>
    </div>
  );
}
