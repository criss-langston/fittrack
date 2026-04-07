"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { ChevronDown, ChevronUp, X, Search, Filter } from 'lucide-react';

export interface DateRange {
  start: string;
  end: string;
}

export interface FilterState {
  searchText: string;
  dateRange: DateRange;
  exercises: string[];
  sortBy: 'newest' | 'oldest' | 'duration' | 'weight';
}

interface FilterPanelProps {
  availableExercises: string[];
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

const SESSION_STORAGE_KEY = 'fittrack_filter_preferences';

const DEFAULT_FILTERS: FilterState = {
  searchText: '',
  dateRange: { start: '', end: '' },
  exercises: [],
  sortBy: 'newest',
};

export default function FilterPanel({ availableExercises, onFilterChange, initialFilters }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
  const debouncedSearchText = useDebounce(localFilters.searchText, 300);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FilterState;
        setLocalFilters({ ...DEFAULT_FILTERS, ...parsed, ...initialFilters });
        return;
      }
    } catch (e) { }
    setLocalFilters({ ...DEFAULT_FILTERS, ...initialFilters });
  }, [initialFilters]);

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(localFilters)); } catch (e) { }
  }, [localFilters]);

  useEffect(() => {
    onFilterChange({ ...localFilters, searchText: debouncedSearchText });
  }, [debouncedSearchText, localFilters, onFilterChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilters.searchText) count++;
    if (localFilters.dateRange.start || localFilters.dateRange.end) count++;
    if (localFilters.exercises.length > 0) count++;
    if (localFilters.sortBy !== 'newest') count++;
    return count;
  }, [localFilters]);

  const clearAllFilters = useCallback(() => setLocalFilters(DEFAULT_FILTERS), []);

  const toggleExercise = (exercise: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      exercises: prev.exercises.includes(exercise)
        ? prev.exercises.filter((e) => e !== exercise)
        : [...prev.exercises, exercise],
    }));
  };

  return (
    <div className="card mb-4">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="font-semibold text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="input-field pl-9 pr-8" placeholder="Search text..."
                value={localFilters.searchText}
                onChange={(e) => setLocalFilters((prev) => ({ ...prev, searchText: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
              <input type="date" className="input-field" value={localFilters.dateRange.start}
                onChange={(e) => setLocalFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">End Date</label>
              <input type="date" className="input-field" value={localFilters.dateRange.end}
                onChange={(e) => setLocalFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Sort By</label>
            <select className="input-field" value={localFilters.sortBy}
              onChange={(e) => setLocalFilters((prev) => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="duration">Duration (Longest First)</option>
              <option value="weight">Weight (Heaviest First)</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <div className="flex justify-end pt-2 border-t border-gray-800">
              <button onClick={clearAllFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <X size={12} />Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
