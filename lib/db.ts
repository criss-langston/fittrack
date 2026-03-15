import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
}

let dbPromise: Promise<IDBPDatabase<FitTrackDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FitTrackDB>('fittrack', 1, {
      upgrade(db) {
        const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
        workoutStore.createIndex('by-date', 'date');

        const weightStore = db.createObjectStore('weightLog', { keyPath: 'id' });
        weightStore.createIndex('by-date', 'date');

        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('by-date', 'date');

        db.createObjectStore('programs', { keyPath: 'id' });

        const prStore = db.createObjectStore('personalRecords', { keyPath: 'id' });
        prStore.createIndex('by-exercise', 'exercise');
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

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Data Backup / Restore ---

const STORE_NAMES = ['workouts', 'weightLog', 'photos', 'programs', 'personalRecords'] as const;
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
