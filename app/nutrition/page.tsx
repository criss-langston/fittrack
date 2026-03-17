"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addMeal,
  getMeals,
  deleteMeal,
  getDailyNutritionSummary,
  searchFoods,
  addFoodItem,
  getFoodItems,
  generateId,
  type Meal,
  type FoodEntry,
  type FoodItem,
} from "@/lib/db";
import {
  Plus,
  Trash2,
  X,
  Utensils,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Search,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Coffee,
  Cookie,
} from "lucide-react";

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_ICONS = {
  breakfast: Sun,
  lunch: Coffee,
  dinner: Moon,
  snack: Cookie,
};
const MEAL_COLORS = {
  breakfast: 'text-amber-400',
  lunch: 'text-green-400',
  dinner: 'text-blue-400',
  snack: 'text-pink-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export default function NutritionPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    mealCount: 0,
  });
  const [weeklyAvg, setWeeklyAvg] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  // Add meal modal
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newMealType, setNewMealType] = useState<typeof MEAL_TYPES[number]>('breakfast');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodResults, setFoodResults] = useState<FoodItem[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<FoodEntry[]>([]);

  // Custom food form
  const [showCustomFood, setShowCustomFood] = useState(false);
  const [customFood, setCustomFood] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: '' });

  const loadDay = useCallback(async (date: string) => {
    setLoading(true);
    const [dayMeals, daySummary] = await Promise.all([
      getMeals(date),
      getDailyNutritionSummary(date),
    ]);
    setMeals(dayMeals);
    setSummary(daySummary);
    setLoading(false);
  }, []);

  const loadWeeklyAvg = useCallback(async () => {
    const weekDates = getWeekDates();
    let totalCal = 0, totalPro = 0, totalCarb = 0, totalFat = 0;
    let daysWithData = 0;

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

  useEffect(() => {
    loadDay(selectedDate);
    loadWeeklyAvg();
  }, [selectedDate, loadDay, loadWeeklyAvg]);

  useEffect(() => {
    if (foodSearch.length >= 2) {
      searchFoods(foodSearch).then(setFoodResults);
    } else {
      setFoodResults([]);
    }
  }, [foodSearch]);

  const addFoodToMeal = (food: FoodEntry) => {
    setSelectedFoods(prev => [...prev, { ...food, quantity: food.quantity || 1 }]);
    setFoodSearch('');
    setFoodResults([]);
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

  const removeSelectedFood = (idx: number) => {
    setSelectedFoods(prev => prev.filter((_, i) => i !== idx));
  };

  const saveMeal = async () => {
    if (selectedFoods.length === 0) return;
    const meal: Meal = {
      id: generateId(),
      date: selectedDate,
      mealType: newMealType,
      foods: selectedFoods,
      createdAt: new Date().toISOString(),
    };
    await addMeal(meal);
    setShowAddMeal(false);
    setSelectedFoods([]);
    loadDay(selectedDate);
    loadWeeklyAvg();
  };

  const saveCustomFood = async () => {
    if (!customFood.name.trim()) return;
    const food: FoodItem = {
      id: generateId(),
      name: customFood.name.trim(),
      calories: customFood.calories,
      protein: customFood.protein,
      carbs: customFood.carbs,
      fat: customFood.fat,
      servingSize: customFood.servingSize || '1 serving',
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    await addFoodItem(food);
    setShowCustomFood(false);
    setCustomFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: '' });
  };

  const handleDeleteMeal = async (id: string) => {
    await deleteMeal(id);
    loadDay(selectedDate);
    loadWeeklyAvg();
  };

  const totalMealMacros = (foods: FoodEntry[]) => {
    return foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs,
        fat: acc.fat + f.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const isToday = selectedDate === getTodayISO();
  const isYesterday = selectedDate === getYesterdayISO();
  const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : formatDate(selectedDate);

  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate());
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (next <= tomorrow) {
      setSelectedDate(next.toISOString().split('T')[0]);
    }
  };

  const customFoodCal = customFood.protein * 4 + customFood.carbs * 4 + customFood.fat * 9;
  const selectedTotal = totalMealMacros(selectedFoods);

  // Macro ring percentages (assuming 2000 cal, 150g protein, 250g carbs, 65g fat defaults)
  const calGoal = 2000;
  const proGoal = 150;
  const carbGoal = 250;
  const fatGoal = 65;

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      {/* Header with date navigation */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Nutrition</h1>
        <div className="flex items-center gap-2">
          <button onClick={goToPrevDay} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ChevronDown size={18} className="rotate-90" />
          </button>
          <span className="text-sm font-medium min-w-[80px] text-center">{dateLabel}</span>
          <button
            onClick={goToNextDay}
            className={`p-2 transition-colors ${isToday ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
            disabled={isToday}
          >
            <ChevronUp size={18} className="rotate-90" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Daily Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card col-span-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-orange-400" />
                  <span className="text-xs text-gray-500">Calories</span>
                </div>
                <span className="text-xs text-gray-600">{Math.round(summary.totalCalories / calGoal * 100)}%</span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold">{summary.totalCalories}</p>
                <p className="text-sm text-gray-500 mb-1">/ {calGoal} cal</p>
              </div>
              <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (summary.totalCalories / calGoal) * 100)}%` }}
                />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Beef size={16} className="text-red-400" />
                <span className="text-xs text-gray-500">Protein</span>
              </div>
              <p className="text-2xl font-bold">{summary.totalProtein}<span className="text-sm font-normal text-gray-500">g</span></p>
              <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (summary.totalProtein / proGoal) * 100)}%` }} />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Wheat size={16} className="text-yellow-400" />
                <span className="text-xs text-gray-500">Carbs</span>
              </div>
              <p className="text-2xl font-bold">{summary.totalCarbs}<span className="text-sm font-normal text-gray-500">g</span></p>
              <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (summary.totalCarbs / carbGoal) * 100)}%` }} />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Droplet size={16} className="text-cyan-400" />
                <span className="text-xs text-gray-500">Fat</span>
              </div>
              <p className="text-2xl font-bold">{summary.totalFat}<span className="text-sm font-normal text-gray-500">g</span></p>
              <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (summary.totalFat / fatGoal) * 100)}%` }} />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Utensils size={16} className="text-violet-400" />
                <span className="text-xs text-gray-500">Meals</span>
              </div>
              <p className="text-2xl font-bold">{summary.mealCount}</p>
            </div>
          </div>

          {/* Weekly Averages */}
          {weeklyAvg.calories > 0 && (
            <div className="card mb-4">
              <h3 className="text-xs text-gray-500 mb-2">7-Day Average</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-orange-400">{weeklyAvg.calories}</p>
                  <p className="text-[10px] text-gray-600">cal</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">{weeklyAvg.protein}g</p>
                  <p className="text-[10px] text-gray-600">protein</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-yellow-400">{weeklyAvg.carbs}g</p>
                  <p className="text-[10px] text-gray-600">carbs</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-cyan-400">{weeklyAvg.fat}g</p>
                  <p className="text-[10px] text-gray-600">fat</p>
                </div>
              </div>
            </div>
          )}

          {/* Meals List */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Meals</h2>
            <button
              onClick={() => { setShowAddMeal(true); setSelectedFoods([]); setFoodSearch(''); }}
              className="btn-primary flex items-center gap-1.5 text-sm !px-3 !py-2"
            >
              <Plus size={16} />Log Meal
            </button>
          </div>

          {/* Add Meal Modal */}
          {showAddMeal && (
            <div className="card mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Log Meal</h3>
                <button onClick={() => setShowAddMeal(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Meal type selector */}
              <div className="flex gap-2 mb-4">
                {MEAL_TYPES.map(type => {
                  const Icon = MEAL_ICONS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setNewMealType(type)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        newMealType === type
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="capitalize">{type}</span>
                    </button>
                  );
                })}
              </div>

              {/* Food search */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="input-field pl-10"
                  placeholder="Search foods..."
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  onFocus={() => setFoodSearch(foodSearch)}
                />
                {foodSearch.length >= 2 && foodResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto">
                    {foodResults.slice(0, 10).map(food => (
                      <button
                        key={food.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addFoodToMeal(food)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center justify-between"
                      >
                        <span>{food.name}</span>
                        <span className="text-xs text-gray-500">{food.calories} cal</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick add custom food */}
              <button
                onClick={() => setShowCustomFood(!showCustomFood)}
                className="text-xs text-violet-400 hover:text-violet-300 mb-3 flex items-center gap-1"
              >
                {showCustomFood ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Add custom food
              </button>

              {showCustomFood && (
                <div className="card mb-3 bg-gray-800/50">
                  <input
                    className="input-field mb-2 text-sm"
                    placeholder="Food name"
                    value={customFood.name}
                    onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="number" className="input-field text-sm" placeholder="Calories" value={customFood.calories || ''} onChange={(e) => setCustomFood({ ...customFood, calories: Number(e.target.value) })} />
                    <input className="input-field text-sm" placeholder="Serving size" value={customFood.servingSize} onChange={(e) => setCustomFood({ ...customFood, servingSize: e.target.value })} />
                    <input type="number" className="input-field text-sm" placeholder="Protein (g)" value={customFood.protein || ''} onChange={(e) => setCustomFood({ ...customFood, protein: Number(e.target.value) })} />
                    <input type="number" className="input-field text-sm" placeholder="Carbs (g)" value={customFood.carbs || ''} onChange={(e) => setCustomFood({ ...customFood, carbs: Number(e.target.value) })} />
                    <input type="number" className="input-field text-sm" placeholder="Fat (g)" value={customFood.fat || ''} onChange={(e) => setCustomFood({ ...customFood, fat: Number(e.target.value) })} />
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500">~{customFoodCal} cal from macros</span>
                    </div>
                  </div>
                  <button onClick={saveCustomFood} className="btn-secondary text-xs w-full" disabled={!customFood.name.trim()}>Save to Library</button>
                </div>
              )}

              {/* Selected foods */}
              {selectedFoods.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Foods ({selectedTotal.calories} cal total)</p>
                  {selectedFoods.map((food, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-gray-800 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{food.name}</p>
                        <p className="text-xs text-gray-500">{food.calories}cal \u00b7 {food.protein}p \u00b7 {food.carbs}c \u00b7 {food.fat}f</p>
                      </div>
                      <input
                        type="number"
                        className="input-field !w-16 !py-1 text-center text-xs"
                        value={food.quantity || 1}
                        min={0.5}
                        step={0.5}
                        onChange={(e) => updateSelectedFood(idx, 'quantity', Number(e.target.value))}
                      />
                      <button onClick={() => removeSelectedFood(idx)} className="text-gray-600 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={saveMeal}
                disabled={selectedFoods.length === 0}
                className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Meal
              </button>
            </div>
          )}

          {/* Meal entries */}
          {meals.length === 0 ? (
            <div className="card text-center py-10">
              <Utensils size={36} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No meals logged</p>
              <p className="text-gray-600 text-sm mt-1">Tap "Log Meal" to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {MEAL_TYPES.map(mealType => {
                const mealForType = meals.filter(m => m.mealType === mealType);
                if (mealForType.length === 0) return null;
                const Icon = MEAL_ICONS[mealType];
                const colorClass = MEAL_COLORS[mealType];

                return (
                  <div key={mealType} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={colorClass} />
                        <h3 className="font-medium capitalize">{mealType}</h3>
                      </div>
                    </div>
                    {mealForType.map(meal => {
                      const macros = totalMealMacros(meal.foods);
                      const isExpanded = expandedMeal === meal.id;
                      return (
                        <div key={meal.id} className="mb-2 last:mb-0">
                          <div
                            className="flex items-center justify-between cursor-pointer py-1"
                            onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                          >
                            <div>
                              <p className="text-sm font-medium">{macros.calories} cal</p>
                              <p className="text-xs text-gray-500">{macros.protein}p \u00b7 {macros.carbs}c \u00b7 {macros.fat}f</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteMeal(meal.id); }}
                                className="text-gray-600 hover:text-red-400 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                              {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-1 pl-2 border-l-2 border-gray-800 space-y-1">
                              {meal.foods.map((food, fi) => (
                                <div key={fi} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">{food.name}</span>
                                  <span className="text-gray-600">{food.calories}cal</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}