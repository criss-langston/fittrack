"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCustomExercises,
  addCustomExercise,
  deleteCustomExercise,
  generateId,
} from "@/lib/db";
import { Plus, Trash2, X, Dumbbell, Filter } from "lucide-react";

type Category = 'machine' | 'cable' | 'barbell' | 'dumbbell' | 'bodyweight' | 'other';

interface CustomExercise {
  id: string;
  name: string;
  category: Category;
  muscleGroup: string;
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

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addCustomExercise({
      id: generateId(),
      name: name.trim(),
      category,
      muscleGroup,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    setName('');
    setNotes('');
    setShowForm(false);
    await loadExercises();
  };

  const handleDelete = async (id: string) => {
    await deleteCustomExercise(id);
    await loadExercises();
  };

  // Group exercises by category for display
  const grouped = exercises.reduce<Record<string, CustomExercise[]>>((acc, ex) => {
    const key = ex.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label || cat;

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
          <Plus size={18} /> Add Exercise
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-violet-400">New Custom Exercise</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Exercise Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Hammer Curl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Muscle Group</label>
              <select
                className="input-field"
                value={muscleGroup}
                onChange={(e) => setMuscleGroup(e.target.value)}
              >
                {MUSCLE_GROUPS.map((mg) => (
                  <option key={mg} value={mg}>
                    {mg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Use EZ bar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Exercise
          </button>
        </div>
      )}

      {/* Exercise list grouped by category */}
      {exercises.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Dumbbell size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-lg">No custom exercises yet</p>
          <p className="text-sm mt-1">
            Add your own exercises to use them in workouts.
            They&apos;ll appear alongside the built-in list.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {categoryLabel(cat)}
              </h3>
              <div className="space-y-2">
                {items.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">{ex.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ex.muscleGroup}
                        {ex.notes ? ` -- ${ex.notes}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
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
