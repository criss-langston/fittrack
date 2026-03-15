import { openDB, DBSchema, IDBPDatabase } from 'idb';

export const COMMON_EXERCISES = [
  "Bench Press","Squat","Deadlift","Overhead Press","Barbell Row",
  "Pull Up","Lat Pulldown","Leg Press","Romanian Deadlift","Incline Bench Press",
  "Dumbbell Curl","Tricep Pushdown","Lateral Raise","Cable Fly","Leg Curl",
  "Leg Extension","Calf Raise","Face Pull","Dips","Lunges",
];

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
        id: string;
        label: string;
        exercises: { name: string; sets: number; reps: number; restSeconds?: number }[];
      }[];
      isActive: boolean;
      createdAt: string;
      completedDays?: string[];
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
}

let dbPromise: Promise<IDBPDatabase<FitTrackDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FitTrackDB>('fittrack', 4, {
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
  // Deduplicate and sort
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

// --- Exercise History (for progressive overload) ---

export async function getExerciseHistory(
  exerciseName: string,
  limit: number
): Promise<{ date: string; sets: { reps: number; weight: number }[] }[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('workouts', 'by-date');
  const sorted = all.reverse();

  const results: { date: string; sets: { reps: number; weight: number }[] }[] = [];

  for (const workout of sorted) {
    for (const ex of workout.exercises) {
      if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
        results.push({
          date: workout.date,
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

const STORE_NAMES = ['workouts', 'weightLog', 'photos', 'programs', 'personalRecords', 'customExercises', 'workoutTemplates', 'measurements'] as const;
type StoreName = typeof STORE_NAMES[number];

export interface FitTrackBackup {
  metadata: {
    exportDate: string;
    appVersion: string;
    storeCount: Record<string, number>;
  };
  data: Record<string, unknown[]>;
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

export async function importAllData(backup: FitTrackBackup): Promise<{ imported: Record<string, number> }> {
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
