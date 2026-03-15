"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCustomExercises,
  addCustomExercise,
  deleteCustomExercise,
  generateId,
  SPECIFIC_MUSCLES,
} from "@/lib/db";
import { Plus, Trash2, X, Dumbbell, Filter, ChevronDown, ChevronUp } from "lucide-react";

type Category = 'machine' | 'cable' | 'barbell' | 'dumbbell' | 'bodyweight' | 'other';

interface CustomExercise {
  id: string;
  name: string;
  category: Category;
  muscleGroup: string;
  specificMuscles?: string[];
  notes?: string;
  createdAt: string;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Cable' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'other', label: 'Other' },
];

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'];

export default function CustomExerciseManager() {
  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('barbell');
  const [muscleGroup, setMuscleGroup] = useState('Chest');
  const [selectedSpecific, setSelectedSpecific] = useState<string[]>([]);
  const [showSpecificPicker, setShowSpecificPicker] = useState(false);
  const [notes, setNotes] = useState('');

  const loadExercises = useCallback(async () => {
    const data = filterCategory === 'all'
      ? await getCustomExercises()
      : await getCustomExercises(filterCategory);
    setExercises(data as CustomExercise[]);
  }, [filterCategory]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Reset specific muscles when general group changes
  useEffect(() => {
    setSelectedSpecific([]);
  }, [muscleGroup]);

  const toggleSpecific = (muscle: string) => {
    setSelectedSpecific((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addCustomExercise({
      id: generateId(),
      name: name.trim(),
      category,
      muscleGroup,
      specificMuscles: selectedSpecific.length > 0 ? selectedSpecific : undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setName('');
    setNotes('');
    setSelectedSpecific([]);
    setShowSpecificPicker(false);
    setShowForm(false);
    await loadExercises();
  };

  const handleDelete = async (id: string) => {
    await deleteCustomExercise(id);
    await loadExercises();
  };

  const grouped = exercises.reduce<Record<string, CustomExercise[]>>((acc, ex) => {
    const key = ex.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label || cat;

  const availableSpecific = SPECIFIC_MUSCLES[muscleGroup] ?? [];

  return (
    <div className="space-y-4">
      {/* Category filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <Filter size={16} className="text-gray-500 flex-shrink-0" />
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            filterCategory === 'all'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filterCategory === cat.value
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-1.5 text-sm !px-4 !py-2 w-full justify-center"
        >
          <Plus size={16} />
          Add Exercise
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">New Custom Exercise</h3>
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedSpecific([]);
                setShowSpecificPicker(false);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Exercise Name</label>
            <input
              className="input-field"
              placeholder="e.g. Cable Crossover"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Category</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* General muscle group */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Primary Muscle Group</label>
            <select
              className="input-field"
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
            >
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </select>
          </div>

          {/* Specific muscles picker */}
          {availableSpecific.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowSpecificPicker((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors mb-2"
              >
                {showSpecificPicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Specific muscles
                {selectedSpecific.length > 0 && (
                  <span className="bg-violet-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    {selectedSpecific.length}
                  </span>
                )}
              </button>

              {showSpecificPicker && (
                <div className="grid grid-cols-1 gap-1 pl-1">
                  {availableSpecific.map((muscle) => (
                    <label key={muscle} className="flex items-center gap-2 cursor-pointer group">
                      <div
                        onClick={() => toggleSpecific(muscle)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedSpecific.includes(muscle)
                            ? 'border-violet-500 bg-violet-600'
                            : 'border-gray-600 bg-transparent group-hover:border-gray-400'
                        }`}
                      >
                        {selectedSpecific.includes(muscle) && (
                          <span className="text-white text-[10px] font-bold">&#x2713;</span>
                        )}
                      </div>
                      <span
                        onClick={() => toggleSpecific(muscle)}
                        className="text-xs text-gray-300 group-hover:text-white transition-colors"
                      >
                        {muscle}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {selectedSpecific.length > 0 && !showSpecificPicker && (
                <div className="flex flex-wrap gap-1">
                  {selectedSpecific.map((m) => (
                    <span key={m} className="text-[11px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
            <input
              className="input-field"
              placeholder="Any notes about this exercise"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button onClick={handleAdd} className="btn-primary w-full">
            Save Exercise
          </button>
        </div>
      )}

      {/* Exercise list grouped by category */}
      {exercises.length === 0 ? (
        <div className="card text-center py-8">
          <Dumbbell size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No custom exercises yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Add your own exercises to use them in workouts.
            They&apos;ll appear alongside the built-in list.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {categoryLabel(cat)}
              </h4>
              <div className="space-y-2">
                {items.map((ex) => (
                  <div key={ex.id} className="card flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{ex.name}</p>
                      <p className="text-xs text-gray-500">
                        {ex.muscleGroup}
                        {ex.notes ? ` \u2014 ${ex.notes}` : ''}
                      </p>
                      {ex.specificMuscles && ex.specificMuscles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ex.specificMuscles.map((m) => (
                            <span key={m} className="text-[11px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 flex-shrink-0 ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
