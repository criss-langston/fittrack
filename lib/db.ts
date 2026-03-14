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
