import { openDB, DBSchema, IDBPDatabase } from 'idb';

export const COMMON_EXERCISES = [
  "Bench Press","Squat","Deadlift","Overhead Press","Barbell Row",
  "Pull Up","Lat Pulldown","Leg Press","Romanian Deadlift","Incline Bench Press",
  "Dumbbell Curl","Tricep Pushdown","Lateral Raise","Cable Fly","Leg Curl",
  "Leg Extension","Calf Raise","Face Pull","Dips","Lunges",
];

// Specific muscles per general group
export const SPECIFIC_MUSCLES: Record<string, string[]> = {
  Chest: [
    'Pectoralis Major (Sternal)',
    'Pectoralis Major (Clavicular)',
    'Pectoralis Minor',
    'Serratus Anterior',
  ],
  Back: [
    'Latissimus Dorsi',
    'Trapezius (Upper)',
    'Trapezius (Middle)',
    'Trapezius (Lower)',
    'Rhomboids',
    'Erector Spinae',
    'Teres Major',
    'Teres Minor',
    'Infraspinatus',
  ],
  Shoulders: [
    'Anterior Deltoid',
    'Lateral Deltoid',
    'Posterior Deltoid',
    'Rotator Cuff',
  ],
  Arms: [
    'Biceps Brachii (Long Head)',
    'Biceps Brachii (Short Head)',
    'Brachialis',
    'Brachioradialis',
    'Triceps (Long Head)',
    'Triceps (Lateral Head)',
    'Triceps (Medial Head)',
    'Forearm Flexors',
    'Forearm Extensors',
  ],
  Legs: [
    'Quadriceps (Rectus Femoris)',
    'Quadriceps (Vastus Lateralis)',
    'Quadriceps (Vastus Medialis)',
    'Hamstrings (Biceps Femoris)',
    'Hamstrings (Semitendinosus)',
    'Glutes (Gluteus Maximus)',
    'Glutes (Gluteus Medius)',
    'Hip Flexors',
    'Adductors',
    'Gastrocnemius',
    'Soleus',
    'Tibialis Anterior',
  ],
  Core: [
    'Rectus Abdominis',
    'Obliques (External)',
    'Obliques (Internal)',
    'Transverse Abdominis',
    'Multifidus',
    'Hip Flexors',
  ],
  'Full Body': [],
};

// Map specific muscle -> general group (for chart aggregation)
export function getGeneralGroupForSpecific(specificMuscle: string): string | null {
  for (const [group, muscles] of Object.entries(SPECIFIC_MUSCLES)) {
    if (muscles.includes(specificMuscle)) return group;
  }
  return null;
}

// --- Nutrition Types ---

export interface FoodEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  quantity?: number;
}

export interface Meal {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodEntry[];
  notes?: string;
  createdAt: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  isCustom: boolean;
  createdAt: string;
}

// Epley 1RM formula
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Get progressive overload suggestion for an exercise
export function getProgressiveOverloadSuggestion(history: { date: string; sets: { reps: number; weight: number }[] }[]): {
  suggestion: string;
  targetWeight: number;
  targetReps: number;
  lastWeight: number;
  lastReps: number;
  best1RM: number;
  trend: 'up' | 'stable' | 'down';
} | null {
  if (history.length === 0) return null;

  const sessions = history
    .map(h => {
      if (h.sets.length === 0) return null;
      const maxWeight = Math.max(...h.sets.map(s => s.weight));
      const bestSet = h.sets.reduce((best, s) => {
        const current1RM = epley1RM(s.weight, s.reps);
        const best1RM = epley1RM(best.weight, best.reps);
        return current1RM > best1RM ? s : best;
      }, h.sets[0]);
      return { maxWeight, bestSet, date: h.date };
    })
    .filter(Boolean) as { maxWeight: number; bestSet: { reps: number; weight: number }; date: string }[];

  if (sessions.length === 0) return null;

  const last = sessions[0];
  const best1RM = Math.max(...sessions.map(s => epley1RM(s.bestSet.weight, s.bestSet.reps)));

  // Determine trend from last 3 sessions
  let trend: 'up' | 'stable' | 'down' = 'stable';
  if (sessions.length >= 2) {
    const recent1RM = epley1RM(sessions[0].bestSet.weight, sessions[0].bestSet.reps);
    const older1RM = epley1RM(sessions[Math.min(sessions.length - 1, 2)].bestSet.weight, sessions[Math.min(sessions.length - 1, 2)].bestSet.reps);
    if (recent1RM > older1RM * 1.02) trend = 'up';
    else if (recent1RM < older1RM * 0.98) trend = 'down';
  }

  // Calculate suggestion
  let targetWeight = last.bestSet.weight;
  let targetReps = last.bestSet.reps;
  let suggestion = '';

  if (last.bestSet.reps >= 12) {
    // High reps: increase weight, lower reps
    targetWeight = last.bestSet.weight + 5;
    targetReps = 8;
    suggestion = `You hit ${last.bestSet.reps} reps at ${last.bestSet.weight}lbs. Time to go heavier: try ${targetWeight}lbs x ${targetReps} reps.`;
  } else if (last.bestSet.reps >= 8) {
    // Moderate reps: try more reps first, then add weight
    targetReps = last.bestSet.reps + 1;
    if (targetReps > 12) {
      targetWeight = last.bestSet.weight + 5;
      targetReps = 8;
      suggestion = `You've mastered ${last.bestSet.weight}lbs. Bump up to ${targetWeight}lbs x ${targetReps} reps.`;
    } else {
      suggestion = `Solid work at ${last.bestSet.weight}lbs. Next session aim for ${targetReps} reps, then add 5lbs.`;
    }
  } else if (last.bestSet.reps >= 5) {
    // Low-moderate reps: try to add a rep or small weight
    targetReps = last.bestSet.reps + 1;
    suggestion = `Keep pushing: try ${last.bestSet.weight}lbs x ${targetReps} reps next time.`;
  } else {
    // Very low reps: add a rep
    targetReps = last.bestSet.reps + 1;
    suggestion = `Heavy singles/doubles - aim for ${targetReps} reps at ${last.bestSet.weight}lbs.`;
  }

  return { suggestion, targetWeight, targetReps, lastWeight: last.bestSet.weight, lastReps: last.bestSet.reps, best1RM, trend };
}

interface FitTrackDB extends DBSchema {
  workouts: {
    key: string;
    value: {
      id: string;
      date: string;
      exercises: {
        name: string;
        sets: { reps: number; weight: number; completed: boolean }[];
      }[];
      duration?: number;
      notes?: string;
      rpe?: number;
      programId?: string;
      supersets?: { exerciseIndices: number[] }[];
    };
    indexes: { 'by-date': string };
  };
  weightLog: {
    key: string;
    value: {
      id: string;
      date: string;
      weight: number;
      calories?: number;
      notes?: string;
    };
    indexes: { 'by-date': string };
  };
  photos: {
    key: string;
    value: {
      id: string;
      date: string;
      dataUrl: string;
      caption?: string;
      milestone?: string;
    };
    indexes: { 'by-date': string };
  };
  programs: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      days: {
        name: string;
        exercises: { name: string; sets: number; reps: string; restSeconds?: number }[];
      }[];
      isActive: boolean;
      createdAt: string;
    };
  };
  personalRecords: {
    key: string;
    value: {
      id: string;
      exercise: string;
      weight: number;
      reps: number;
      date: string;
    };
    indexes: { 'by-exercise': string };
  };
  customExercises: {
    key: string;
    value: {
      id: string;
      name: string;
      category: 'machine' | 'cable' | 'barbell' | 'dumbbell' | 'bodyweight' | 'other';
      muscleGroup: string;
      specificMuscles?: string[];
      notes?: string;
      createdAt: string;
    };
    indexes: { 'by-category': string; 'by-muscle': string };
  };
  workoutTemplates: {
    key: string;
    value: {
      id: string;
      name: string;
      exercises: { name: string; sets: number; reps: number }[];
      createdAt: string;
    };
  };
  measurements: {
    key: string;
    value: {
      id: string;
      date: string;
      chest?: number;
      waist?: number;
      hips?: number;
      bicepLeft?: number;
      bicepRight?: number;
      thighLeft?: number;
      thighRight?: number;
      neck?: number;
      notes?: string;
    };
    indexes: { 'by-date': string };
  };
  meals: {
    key: string;
    value: Meal;
    indexes: { 'by-date': string; 'by-mealType': string };
  };
  foods: {
    key: string;
    value: FoodItem;
    indexes: { 'by-name': string };
  };
}

let dbPromise: Promise<IDBPDatabase<FitTrackDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FitTrackDB>('fittrack', 5, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
          workoutStore.createIndex('by-date', 'date');

          const weightStore = db.createObjectStore('weightLog', { keyPath: 'id' });
          weightStore.createIndex('by-date', 'date');

          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('by-date', 'date');

          db.createObjectStore('programs', { keyPath: 'id' });

          const prStore = db.createObjectStore('personalRecords', { keyPath: 'id' });
          prStore.createIndex('by-exercise', 'exercise');
        }

        if (oldVersion < 2) {
          const customExStore = db.createObjectStore('customExercises', { keyPath: 'id' });
          customExStore.createIndex('by-category', 'category');
          customExStore.createIndex('by-muscle', 'muscleGroup');
        }

        if (oldVersion < 3) {
          db.createObjectStore('workoutTemplates', { keyPath: 'id' });
        }

        if (oldVersion < 4) {
          const measurementStore = db.createObjectStore('measurements', { keyPath: 'id' });
          measurementStore.createIndex('by-date', 'date');
        }

        if (oldVersion < 5) {
          const mealStore = db.createObjectStore('meals', { keyPath: 'id' });
          mealStore.createIndex('by-date', 'date');
          mealStore.createIndex('by-mealType', 'mealType');

          const foodStore = db.createObjectStore('foods', { keyPath: 'id' });
          foodStore.createIndex('by-name', 'name');
        }
      },
    });
  }
  return dbPromise;
}

export async function addWorkout(workout: FitTrackDB['workouts']['value']) {
  const db = await getDB();
  await db.put('workouts', workout);
}

export async function getWorkouts(limit?: number) {
  const db = await getDB();
  const all = await db.getAllFromIndex('workouts', 'by-date');
  const sorted = all.reverse();
  return limit ? sorted.slice(0, limit) : sorted;
}

export async function deleteWorkout(id: string) {
  const db = await getDB();
  await db.delete('workouts', id);
}

export async function addWeightEntry(entry: FitTrackDB['weightLog']['value']) {
  const db = await getDB();
  await db.put('weightLog', entry);
}

export async function getWeightEntries(limit?: number) {
  const db = await getDB();
  const all = await db.getAllFromIndex('weightLog', 'by-date');
  const sorted = all.reverse();
  return limit ? sorted.slice(0, limit) : sorted;
}

export async function deleteWeightEntry(id: string) {
  const db = await getDB();
  await db.delete('weightLog', id);
}

export async function addPhoto(photo: FitTrackDB['photos']['value']) {
  const db = await getDB();
  await db.put('photos', photo);
}

export async function getPhotos() {
  const db = await getDB();
  const all = await db.getAllFromIndex('photos', 'by-date');
  return all.reverse();
}

export async function deletePhoto(id: string) {
  const db = await getDB();
  await db.delete('photos', id);
}

export async function addProgram(program: FitTrackDB['programs']['value']) {
  const db = await getDB();
  await db.put('programs', program);
}

export async function getPrograms() {
  const db = await getDB();
  return db.getAll('programs');
}

export async function getProgram(id: string) {
  const db = await getDB();
  return db.get('programs', id);
}

export async function deleteProgram(id: string) {
  const db = await getDB();
  await db.delete('programs', id);
}

export async function setActiveProgram(id: string) {
  const db = await getDB();
  const programs = await db.getAll('programs');
  for (const p of programs) {
    p.isActive = p.id === id;
    await db.put('programs', p);
  }
}

export async function addPersonalRecord(pr: FitTrackDB['personalRecords']['value']) {
  const db = await getDB();
  await db.put('personalRecords', pr);
}

export async function getPersonalRecords(exercise?: string) {
  const db = await getDB();
  if (exercise) {
    return db.getAllFromIndex('personalRecords', 'by-exercise', exercise);
  }
  return db.getAll('personalRecords');
}

// --- Custom Exercises CRUD ---

export async function addCustomExercise(exercise: FitTrackDB['customExercises']['value']) {
  const db = await getDB();
  await db.put('customExercises', exercise);
}

export async function getCustomExercises(category?: string) {
  const db = await getDB();
  if (category) {
    return db.getAllFromIndex('customExercises', 'by-category', category);
  }
  return db.getAll('customExercises');
}

export async function deleteCustomExercise(id: string) {
  const db = await getDB();
  await db.delete('customExercises', id);
}

export async function getAllExerciseNames(): Promise<string[]> {
  const custom = await getCustomExercises();
  const customNames = custom.map((e) => e.name);
  const merged = [...COMMON_EXERCISES, ...customNames];
  return [...new Set(merged)].sort((a, b) => a.localeCompare(b));
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Workout Templates CRUD ---

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: { name: string; sets: number; reps: number }[];
  createdAt: string;
}

export async function addWorkoutTemplate(template: WorkoutTemplate) {
  const db = await getDB();
  await db.put('workoutTemplates', template);
}

export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  const db = await getDB();
  return db.getAll('workoutTemplates');
}

export async function deleteWorkoutTemplate(id: string) {
  const db = await getDB();
  await db.delete('workoutTemplates', id);
}

// --- Measurements CRUD ---

export interface Measurement {
  id: string;
  date: string;
  chest?: number;
  waist?: number;
  hips?: number;
  bicepLeft?: number;
  bicepRight?: number;
  thighLeft?: number;
  thighRight?: number;
  neck?: number;
  notes?: string;
}

export async function addMeasurement(measurement: Measurement) {
  const db = await getDB();
  await db.put('measurements', measurement);
}

export async function getMeasurements(limit?: number): Promise<Measurement[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('measurements', 'by-date');
  const sorted = all.reverse();
  return limit ? sorted.slice(0, limit) : sorted;
}

export async function deleteMeasurement(id: string) {
  const db = await getDB();
  await db.delete('measurements', id);
}

// --- Meals CRUD ---

export async function addMeal(meal: Meal) {
  const db = await getDB();
  await db.put('meals', meal);
}

export async function getMeals(date?: string): Promise<Meal[]> {
  const db = await getDB();
  if (date) {
    return db.getAllFromIndex('meals', 'by-date', date);
  }
  const all = await db.getAllFromIndex('meals', 'by-date');
  return all.reverse();
}

export async function getMealsForDateRange(startDate: string, endDate: string): Promise<Meal[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('meals', 'by-date');
  return all.filter(m => m.date >= startDate && m.date <= endDate).reverse();
}

export async function deleteMeal(id: string) {
  const db = await getDB();
  await db.delete('meals', id);
}

export async function getDailyNutritionSummary(date: string): Promise<{
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  byMealType: Record<string, { calories: number; protein: number; carbs: number; fat: number }>;
}> {
  const meals = await getMeals(date);
  const byMealType: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
  let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

  for (const meal of meals) {
    let mealCal = 0, mealPro = 0, mealCarb = 0, mealFat = 0;
    for (const food of meal.foods) {
      mealCal += food.calories;
      mealPro += food.protein;
      mealCarb += food.carbs;
      mealFat += food.fat;
    }
    totalCalories += mealCal;
    totalProtein += mealPro;
    totalCarbs += mealCarb;
    totalFat += mealFat;
    byMealType[meal.mealType] = { calories: mealCal, protein: mealPro, carbs: mealCarb, fat: mealFat };
  }

  return { totalCalories, totalProtein, totalCarbs, totalFat, mealCount: meals.length, byMealType };
}

// --- Foods Library CRUD ---

const COMMON_FOODS: FoodItem[] = [
  { id: 'common-1', name: 'Chicken Breast (6oz)', calories: 280, protein: 53, carbs: 0, fat: 6, servingSize: '6oz', isCustom: false, createdAt: '' },
  { id: 'common-2', name: 'White Rice (1 cup)', calories: 206, protein: 4, carbs: 45, fat: 0, servingSize: '1 cup', isCustom: false, createdAt: '' },
  { id: 'common-3', name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fat: 2, servingSize: '1 cup', isCustom: false, createdAt: '' },
  { id: 'common-4', name: 'Egg (1 large)', calories: 72, protein: 6, carbs: 0, fat: 5, servingSize: '1 large', isCustom: false, createdAt: '' },
  { id: 'common-5', name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0, servingSize: '1 medium', isCustom: false, createdAt: '' },
  { id: 'common-6', name: 'Oatmeal (1 cup)', calories: 154, protein: 5, carbs: 27, fat: 3, servingSize: '1 cup', isCustom: false, createdAt: '' },
  { id: 'common-7', name: 'Greek Yogurt (170g)', calories: 100, protein: 17, carbs: 6, fat: 1, servingSize: '170g', isCustom: false, createdAt: '' },
  { id: 'common-8', name: 'Whey Protein (1 scoop)', calories: 120, protein: 24, carbs: 3, fat: 1, servingSize: '1 scoop', isCustom: false, createdAt: '' },
  { id: 'common-9', name: 'Salmon (6oz)', calories: 350, protein: 38, carbs: 0, fat: 20, servingSize: '6oz', isCustom: false, createdAt: '' },
  { id: 'common-10', name: 'Sweet Potato (1 medium)', calories: 103, protein: 2, carbs: 24, fat: 0, servingSize: '1 medium', isCustom: false, createdAt: '' },
  { id: 'common-11', name: 'Broccoli (1 cup)', calories: 55, protein: 4, carbs: 11, fat: 1, servingSize: '1 cup', isCustom: false, createdAt: '' },
  { id: 'common-12', name: 'Avocado (1/2)', calories: 120, protein: 1, carbs: 6, fat: 11, servingSize: '1/2', isCustom: false, createdAt: '' },
  { id: 'common-13', name: 'Almonds (1oz)', calories: 164, protein: 6, carbs: 6, fat: 14, servingSize: '1oz', isCustom: false, createdAt: '' },
  { id: 'common-14', name: 'Whole Wheat Bread (1 slice)', calories: 81, protein: 4, carbs: 14, fat: 1, servingSize: '1 slice', isCustom: false, createdAt: '' },
  { id: 'common-15', name: 'Peanut Butter (2 tbsp)', calories: 190, protein: 7, carbs: 7, fat: 16, servingSize: '2 tbsp', isCustom: false, createdAt: '' },
];

export async function addFoodItem(food: FoodItem) {
  const db = await getDB();
  await db.put('foods', food);
}

export async function getFoodItems(): Promise<FoodItem[]> {
  const db = await getDB();
  const custom = await db.getAll('foods');
  return [...COMMON_FOODS, ...custom].sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteFoodItem(id: string) {
  const db = await getDB();
  await db.delete('foods', id);
}

export async function searchFoods(query: string): Promise<FoodItem[]> {
  const all = await getFoodItems();
  const lower = query.toLowerCase();
  return all.filter(f => f.name.toLowerCase().includes(lower));
}

// --- Exercise History (for progressive overload + detail page) ---

export async function getExerciseHistory(
  exerciseName: string,
  limit: number
): Promise<{ date: string; workoutId: string; sets: { reps: number; weight: number }[] }[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('workouts', 'by-date');
  const sorted = all.reverse();

  const results: { date: string; workoutId: string; sets: { reps: number; weight: number }[] }[] = [];

  for (const workout of sorted) {
    for (const ex of workout.exercises) {
      if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
        results.push({
          date: workout.date,
          workoutId: workout.id,
          sets: ex.sets
            .filter((s) => s.completed)
            .map((s) => ({ reps: s.reps, weight: s.weight })),
        });
        break;
      }
    }
    if (results.length >= limit) break;
  }

  return results;
}

// --- Data Backup / Restore ---

const STORE_NAMES = ['workouts', 'weightLog', 'photos', 'programs', 'personalRecords', 'customExercises', 'workoutTemplates', 'measurements', 'meals', 'foods'] as const;
type StoreName = typeof STORE_NAMES[number];

export interface FitTrackBackup {
  metadata: {
    exportDate: string;
    appVersion: string;
    storeCount: Record<StoreName, number>;
  };
  data: Record<StoreName, unknown[]>;
}

export async function exportAllData(): Promise<FitTrackBackup> {
  const db = await getDB();
  const data: Record<string, unknown[]> = {};
  const storeCount: Record<string, number> = {};

  for (const store of STORE_NAMES) {
    const items = await db.getAll(store);
    data[store] = items;
    storeCount[store] = items.length;
  }

  return {
    metadata: {
      exportDate: new Date().toISOString(),
      appVersion: '0.1.0',
      storeCount,
    },
    data,
  };
}

export function validateBackup(json: unknown): json is FitTrackBackup {
  if (typeof json !== 'object' || json === null) return false;
  const obj = json as Record<string, unknown>;
  if (typeof obj.metadata !== 'object' || obj.metadata === null) return false;
  if (typeof obj.data !== 'object' || obj.data === null) return false;

  const meta = obj.metadata as Record<string, unknown>;
  if (typeof meta.exportDate !== 'string') return false;
  if (typeof meta.appVersion !== 'string') return false;

  const data = obj.data as Record<string, unknown>;
  for (const store of STORE_NAMES) {
    if (data[store] !== undefined && !Array.isArray(data[store])) return false;
  }

  return true;
}

export async function importAllData(backup: FitTrackBackup): Promise<{ imported: Record<StoreName, number> }> {
  const db = await getDB();
  const imported: Record<string, number> = {};

  for (const store of STORE_NAMES) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();

    const items = backup.data[store];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await tx.store.put(item as never);
      }
      imported[store] = items.length;
    } else {
      imported[store] = 0;
    }

    await tx.done;
  }

  return { imported };
}