"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addMeal,
  getMeals,
  deleteMeal,
  getDailyNutritionSummary,
  searchFoods,
  addFoodItem,
  generateId,
  type Meal,
  type FoodEntry,
  type FoodItem,
  getDefaultUserProfile,
  updateUserProfile,
  type UserProfile,
} from "@/lib/db";
import {
  Plus,
  Trash2,
  X,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Search,
  ChevronDown,
  ChevronUp,
  Target,
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
  const [entries, setEntries] = useState<Meal[]>([]);
  const [summary, setSummary] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 });
  const [weeklyAvg, setWeeklyAvg] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');
  const [foodResults, setFoodResults] = useState<FoodItem[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<FoodEntry[]>([]);
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [customFood, setCustomFood] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: '' });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState({ targetCalories: 2200, targetProtein: 150, targetCarbs: 250, targetFats: 65 });

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
    const [dayMeals, daySummary] = await Promise.all([getMeals(date), getDailyNutritionSummary(date)]);
    setEntries(dayMeals);
    setSummary(daySummary);
    setLoading(false);
  }, []);

  const loadWeeklyAvg = useCallback(async () => {
    const weekDates = getWeekDates();
    let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0, daysWithData = 0;
    for (const date of weekDates) {
      const s = await getDailyNutritionSummary(date);
      if (s.mealCount > 0) { totalCal += s.totalCalories; totalPro += s.totalProtein; totalCarb += s.totalCarbs; totalFat += s.totalFat; daysWithData++; }
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
  useEffect(() => {
    if (foodSearch.length >= 2) searchFoods(foodSearch).then(setFoodResults); else setFoodResults([]);
  }, [foodSearch]);

  const addFoodToMeal = (food: FoodEntry) => {
    setSelectedFoods(prev => [...prev, { ...food, quantity: food.quantity || 1 }]);
    setFoodSearch(''); setFoodResults([]);
  };

  const updateSelectedFood = (idx: number, field: keyof FoodEntry, value: number) => {
    setSelectedFoods(prev => {
      const copy = [...prev];
      const food = { ...copy[idx] };
      const originalQuantity = food.quantity || 1;
      (food as Record<string, unknown>)[field] = value;
      if (field === 'quantity') {
        const ratio = value / originalQuantity;
        food.calories = Math.round(food.calories * ratio);
        food.protein = Math.round(food.protein * ratio * 10) / 10;
        food.carbs = Math.round(food.carbs * ratio * 10) / 10;
        food.fat = Math.round(food.fat * ratio * 10) / 10;
      }
      copy[idx] = food;
      return copy;
    });
  };

  const removeSelectedFood = (idx: number) => setSelectedFoods(prev => prev.filter((_, i) => i !== idx));

  const saveTargets = async () => {
    const updated = await updateUserProfile(targets);
    if (updated) setProfile(updated);
  };

  const saveEntry = async () => {
    if (selectedFoods.length === 0) return;
    const meal: Meal = { id: generateId(), date: selectedDate, mealType: 'snack', foods: selectedFoods, createdAt: new Date().toISOString() };
    await addMeal(meal);
    setShowAddEntry(false); setSelectedFoods([]); loadDay(selectedDate); loadWeeklyAvg();
  };

  const saveCustomFood = async () => {
    if (!customFood.name.trim()) return;
    const food: FoodItem = { id: generateId(), name: customFood.name.trim(), calories: customFood.calories, protein: customFood.protein, carbs: customFood.carbs, fat: customFood.fat, servingSize: customFood.servingSize || '1 serving', isCustom: true, createdAt: new Date().toISOString() };
    await addFoodItem(food);
    setShowCustomFood(false);
    setCustomFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: '' });
  };

  const handleDeleteEntry = async (id: string) => { await deleteMeal(id); loadDay(selectedDate); loadWeeklyAvg(); };
  const isToday = selectedDate === getTodayISO();
  const isYesterday = selectedDate === getYesterdayISO();
  const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : formatDate(selectedDate);
  const goToPrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); };
  const goToNextDay = () => { const next = new Date(selectedDate); const today = new Date(); next.setDate(next.getDate() + 1); if (next <= today) setSelectedDate(next.toISOString().split('T')[0]); };
  const selectedTotal = selectedFoods.reduce((acc, f) => ({ calories: acc.calories + f.calories, protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

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

          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowAddEntry((v) => !v)} className="btn-primary flex-1 flex items-center justify-center gap-2"><Plus size={16} /> Add Food</button>
            <button onClick={() => setShowCustomFood((v) => !v)} className="btn-secondary flex-1">Custom Food</button>
          </div>

          {showAddEntry && (
            <div className="card mb-4 space-y-4">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Add Daily Foods</h2><button onClick={() => { setShowAddEntry(false); setSelectedFoods([]); }} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Search foods</label>
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input className="input-field pl-10" placeholder="Chicken, rice, yogurt..." value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} /></div>
                {foodResults.length > 0 && <div className="mt-2 max-h-48 overflow-y-auto space-y-2">{foodResults.map((food) => <button key={food.id} onClick={() => addFoodToMeal(food)} className="w-full text-left bg-gray-800 rounded-lg px-3 py-2 hover:bg-gray-700"><div className="flex items-center justify-between"><span className="text-sm font-medium">{food.name}</span><span className="text-xs text-gray-500">{food.calories} cal</span></div><p className="text-xs text-gray-500">P {food.protein} • C {food.carbs} • F {food.fat}</p></button>)}</div>}
              </div>
              {selectedFoods.length > 0 && <div className="space-y-3">{selectedFoods.map((food, idx) => <div key={idx} className="rounded-xl border border-gray-800 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-sm">{food.name}</p><p className="text-xs text-gray-500">{food.servingSize || '1 serving'}</p></div><button onClick={() => removeSelectedFood(idx)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button></div><div className="grid grid-cols-5 gap-2 mt-3 text-xs"><div><label className="text-gray-500 block mb-1">Qty</label><input type="number" className="input-field !py-2 text-center" value={food.quantity || 1} onChange={(e) => updateSelectedFood(idx, 'quantity', Number(e.target.value) || 1)} /></div><div><label className="text-gray-500 block mb-1">Cal</label><input type="number" className="input-field !py-2 text-center" value={food.calories} onChange={(e) => updateSelectedFood(idx, 'calories', Number(e.target.value) || 0)} /></div><div><label className="text-gray-500 block mb-1">P</label><input type="number" className="input-field !py-2 text-center" value={food.protein} onChange={(e) => updateSelectedFood(idx, 'protein', Number(e.target.value) || 0)} /></div><div><label className="text-gray-500 block mb-1">C</label><input type="number" className="input-field !py-2 text-center" value={food.carbs} onChange={(e) => updateSelectedFood(idx, 'carbs', Number(e.target.value) || 0)} /></div><div><label className="text-gray-500 block mb-1">F</label><input type="number" className="input-field !py-2 text-center" value={food.fat} onChange={(e) => updateSelectedFood(idx, 'fat', Number(e.target.value) || 0)} /></div></div></div>)}</div>}
              {selectedFoods.length > 0 && <div className="rounded-xl bg-gray-900/60 p-3 text-sm"><div className="grid grid-cols-4 gap-2 text-center"><div><p className="text-gray-500">Cal</p><p className="font-semibold">{selectedTotal.calories}</p></div><div><p className="text-gray-500">P</p><p className="font-semibold">{selectedTotal.protein}g</p></div><div><p className="text-gray-500">C</p><p className="font-semibold">{selectedTotal.carbs}g</p></div><div><p className="text-gray-500">F</p><p className="font-semibold">{selectedTotal.fat}g</p></div></div></div>}
              <button onClick={saveEntry} disabled={selectedFoods.length === 0} className="btn-primary w-full disabled:opacity-40">Save Daily Entry</button>
            </div>
          )}

          {showCustomFood && (
            <div className="card mb-4 space-y-3">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Create Custom Food</h2><button onClick={() => setShowCustomFood(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
              <input className="input-field" placeholder="Food name" value={customFood.name} onChange={(e) => setCustomFood((p) => ({ ...p, name: e.target.value }))} />
              <input className="input-field" placeholder="Serving size" value={customFood.servingSize} onChange={(e) => setCustomFood((p) => ({ ...p, servingSize: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3"><input type="number" className="input-field" placeholder="Calories" value={customFood.calories} onChange={(e) => setCustomFood((p) => ({ ...p, calories: Number(e.target.value) || 0 }))} /><input type="number" className="input-field" placeholder="Protein" value={customFood.protein} onChange={(e) => setCustomFood((p) => ({ ...p, protein: Number(e.target.value) || 0 }))} /><input type="number" className="input-field" placeholder="Carbs" value={customFood.carbs} onChange={(e) => setCustomFood((p) => ({ ...p, carbs: Number(e.target.value) || 0 }))} /><input type="number" className="input-field" placeholder="Fat" value={customFood.fat} onChange={(e) => setCustomFood((p) => ({ ...p, fat: Number(e.target.value) || 0 }))} /></div>
              <button onClick={saveCustomFood} className="btn-primary w-full">Save Custom Food</button>
            </div>
          )}

          <div className="space-y-3">
            {entries.length === 0 && <div className="card text-center py-10 text-gray-500 text-sm">No foods logged for this day yet.</div>}
            {entries.map((entry) => (
              <div key={entry.id} className="card">
                <div className="flex items-center justify-between mb-3"><div><p className="font-semibold">Daily Entry</p><p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p></div><button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button></div>
                <div className="space-y-2">{entry.foods.map((food, idx) => <div key={idx} className="flex items-center justify-between rounded-lg bg-gray-800/70 px-3 py-2"><div><p className="text-sm font-medium">{food.name}</p><p className="text-xs text-gray-500">{food.servingSize || '1 serving'}{food.quantity ? ` × ${food.quantity}` : ''}</p></div><div className="text-right text-xs text-gray-400"><p>{food.calories} cal</p><p>P {food.protein} · C {food.carbs} · F {food.fat}</p></div></div>)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
