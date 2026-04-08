import { openDB, DBSchema, IDBPDatabase } from 'idb';

export const COMMON_EXERCISES = [
  "Bench Press","Squat","Deadlift","Overhead Press","Barbell Row",
  "Pull Up","Lat Pulldown","Leg Press","Romanian Deadlift","Incline Bench Press",
  "Dumbbell Curl","Tricep Pushdown","Lateral Raise","Cable Fly","Leg Curl",
  "Leg Extension","Calf Raise","Face Pull","Dips","Lunges",
];

export const SPECIFIC_MUSCLES: Record<string, string[]> = {
  Chest: ['Pectoralis Major (Sternal)','Pectoralis Major (Clavicular)','Pectoralis Minor','Serratus Anterior'],
  Back: ['Latissimus Dorsi','Trapezius (Upper)','Trapezius (Middle)','Trapezius (Lower)','Rhomboids','Erector Spinae','Teres Major','Teres Minor','Infraspinatus'],
  Shoulders: ['Anterior Deltoid','Lateral Deltoid','Posterior Deltoid','Rotator Cuff'],
  Arms: ['Biceps Brachii (Long Head)','Biceps Brachii (Short Head)','Brachialis','Brachioradialis','Triceps (Long Head)','Triceps (Lateral Head)','Triceps (Medial Head)','Forearm Flexors','Forearm Extensors'],
  Legs: ['Quadriceps (Rectus Femoris)','Quadriceps (Vastus Lateralis)','Quadriceps (Vastus Medialis)','Hamstrings (Biceps Femoris)','Hamstrings (Semitendinosus)','Glutes (Gluteus Maximus)','Glutes (Gluteus Medius)','Hip Flexors','Adductors','Gastrocnemius','Soleus','Tibialis Anterior'],
  Core: ['Rectus Abdominis','Obliques (External)','Obliques (Internal)','Transverse Abdominis','Multifidus','Hip Flexors'],
  'Full Body': [],
};

export function getGeneralGroupForSpecific(specificMuscle: string): string | null {
  for (const [group, muscles] of Object.entries(SPECIFIC_MUSCLES)) {
    if (muscles.includes(specificMuscle)) return group;
  }
  return null;
}

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

export interface MacroLog {
  id: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
  createdAt: string;
}

export type ReadinessLevel = 'Low' | 'Medium' | 'High';
export type SleepLevel = 'Bad' | 'OK' | 'Good';
export type TrainingLevel = 'Bad' | 'OK' | 'Great' | 'Rest day';

export interface ReadinessLog {
  id: string;
  date: string;
  energy: ReadinessLevel;
  recovery: ReadinessLevel;
  sleep: SleepLevel;
  training: TrainingLevel;
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

export interface UserProfile {
  id: string;
  age: number;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  bodyFat?: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  goal: 'lose' | 'maintain' | 'gain';
  macroPreference: 'balanced' | 'low-carb' | 'keto' | 'high-protein' | 'custom';
  weeklyWeightChange: number;
  bmr: number;
  tdee: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  targetCalories: number;
  targetWater: number;
  lastUpdated: string;
}

export interface MacroPreferences {
  proteinRatio: number;
  carbRatio: number;
  fatRatio: number;
  dietaryRestrictions?: string[];
}

export interface Workout {
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
  recurringPlanId?: string;
  scheduledFor?: string;
  supersets?: { exerciseIndices: number[] }[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: { name: string; sets: number; reps: number }[];
  createdAt: string;
}

export interface RecurringWorkoutPlan {
  id: string;
  name: string;
  templateId?: string;
  exerciseNames: string[];
  weekdays: number[]; // 0=Sun ... 6=Sat
  startDate: string;
  endDate?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  bodyFat?: number;
  notes?: string;
}

export type PhaseType = 'bulk' | 'cut' | 'maintenance';

export interface FitnessPhase {
  id: string;
  name: string;
  type: PhaseType;
  startDate: string;
  endDate: string;
  parentPhaseId?: string | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

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
      const bestSet = h.sets.reduce((best, s) => epley1RM(s.weight, s.reps) > epley1RM(best.weight, best.reps) ? s : best, h.sets[0]);
      return { maxWeight: Math.max(...h.sets.map(s => s.weight)), bestSet, date: h.date };
    })
    .filter(Boolean) as { maxWeight: number; bestSet: { reps: number; weight: number }; date: string }[];
  if (sessions.length === 0) return null;
  const last = sessions[0];
  const best1RM = Math.max(...sessions.map(s => epley1RM(s.bestSet.weight, s.bestSet.reps)));
  let trend: 'up' | 'stable' | 'down' = 'stable';
  if (sessions.length >= 2) {
    const recent1RM = epley1RM(sessions[0].bestSet.weight, sessions[0].bestSet.reps);
    const older1RM = epley1RM(sessions[Math.min(sessions.length - 1, 2)].bestSet.weight, sessions[Math.min(sessions.length - 1, 2)].bestSet.reps);
    if (recent1RM > older1RM * 1.02) trend = 'up';
    else if (recent1RM < older1RM * 0.98) trend = 'down';
  }
  let targetWeight = last.bestSet.weight;
  let targetReps = last.bestSet.reps;
  let suggestion = '';
  if (last.bestSet.reps >= 12) {
    targetWeight = last.bestSet.weight + 5; targetReps = 8;
    suggestion = `You hit ${last.bestSet.reps} reps at ${last.bestSet.weight}lbs. Try ${targetWeight}lbs x ${targetReps} reps.`;
  } else if (last.bestSet.reps >= 8) {
    targetReps = last.bestSet.reps + 1;
    if (targetReps > 12) { targetWeight = last.bestSet.weight + 5; targetReps = 8; suggestion = `You've mastered ${last.bestSet.weight}lbs. Bump up to ${targetWeight}lbs x ${targetReps} reps.`; }
    else { suggestion = `Solid work at ${last.bestSet.weight}lbs. Next session aim for ${targetReps} reps, then add 5lbs.`; }
  } else if (last.bestSet.reps >= 5) {
    targetReps = last.bestSet.reps + 1;
    suggestion = `Keep pushing: try ${last.bestSet.weight}lbs x ${targetReps} reps next time.`;
  } else {
    targetReps = last.bestSet.reps + 1;
    suggestion = `Heavy singles/doubles - aim for ${targetReps} reps at ${last.bestSet.weight}lbs.`;
  }
  return { suggestion, targetWeight, targetReps, lastWeight: last.bestSet.weight, lastReps: last.bestSet.reps, best1RM, trend };
}

interface FitTrackDB extends DBSchema {
  workouts: { key: string; value: Workout; indexes: { 'by-date': string; 'by-scheduledFor': string } };
  weightLog: { key: string; value: { id: string; date: string; weight: number; calories?: number; notes?: string }; indexes: { 'by-date': string } };
  photos: { key: string; value: { id: string; date: string; dataUrl: string; caption?: string; milestone?: string }; indexes: { 'by-date': string } };
  programs: { key: string; value: { id: string; name: string; description?: string; days: { name: string; exercises: { name: string; sets: number; reps: string; restSeconds?: number }[] }[]; isActive: boolean; createdAt: string } };
  personalRecords: { key: string; value: { id: string; exercise: string; weight: number; reps: number; date: string }; indexes: { 'by-exercise': string } };
  customExercises: { key: string; value: { id: string; name: string; category: 'machine' | 'cable' | 'barbell' | 'dumbbell' | 'bodyweight' | 'other'; muscleGroup: string; specificMuscles?: string[]; notes?: string; createdAt: string }; indexes: { 'by-category': string; 'by-muscle': string } };
  workoutTemplates: { key: string; value: WorkoutTemplate };
  recurringWorkoutPlans: { key: string; value: RecurringWorkoutPlan; indexes: { 'by-startDate': string; 'by-active': number } };
  measurements: { key: string; value: Measurement; indexes: { 'by-date': string } };
  meals: { key: string; value: Meal; indexes: { 'by-date': string; 'by-mealType': string } };
  macroLogs: { key: string; value: MacroLog; indexes: { 'by-date': string } };
  readinessLogs: { key: string; value: ReadinessLog; indexes: { 'by-date': string } };
  foods: { key: string; value: FoodItem; indexes: { 'by-name': string } };
  userProfile: { key: string; value: UserProfile; indexes: { 'by-lastUpdated': string } };
  phases: { key: string; value: FitnessPhase; indexes: { 'by-startDate': string; 'by-endDate': string; 'by-type': string } };
}

let dbPromise: Promise<IDBPDatabase<FitTrackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FitTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FitTrackDB>('fittrack', 12, {
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
        if (oldVersion < 3) { db.createObjectStore('workoutTemplates', { keyPath: 'id' }); }
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
        if (oldVersion < 10) {
          const macroLogStore = db.createObjectStore('macroLogs', { keyPath: 'id' });
          macroLogStore.createIndex('by-date', 'date');
          if ((db.objectStoreNames as DOMStringList).contains('meals')) {
            (db as unknown as IDBDatabase).deleteObjectStore('meals');
          }
          if ((db.objectStoreNames as DOMStringList).contains('foods')) {
            (db as unknown as IDBDatabase).deleteObjectStore('foods');
          }
        }
        if (oldVersion < 11) {
          const readinessStore = db.createObjectStore('readinessLogs', { keyPath: 'id' });
          readinessStore.createIndex('by-date', 'date');
        }
        if (oldVersion < 12) {
          const recurringStore = db.createObjectStore('recurringWorkoutPlans', { keyPath: 'id' });
          recurringStore.createIndex('by-startDate', 'startDate');
          recurringStore.createIndex('by-active', 'isActive');
        }
        if (oldVersion < 7) {
          const userProfileStore = db.createObjectStore('userProfile', { keyPath: 'id' });
          userProfileStore.createIndex('by-lastUpdated', 'lastUpdated');
        }
        if (oldVersion < 8) {
          const legacyStores = ['healthMetrics', 'healthWorkouts', 'healthSyncHistory', 'healthSettings'] as const;
          for (const storeName of legacyStores) {
            if ((db.objectStoreNames as DOMStringList).contains(storeName)) {
              (db as unknown as IDBDatabase).deleteObjectStore(storeName);
            }
          }
        }
        if (oldVersion < 9) {
          const phaseStore = db.createObjectStore('phases', { keyPath: 'id' });
          phaseStore.createIndex('by-startDate', 'startDate');
          phaseStore.createIndex('by-endDate', 'endDate');
          phaseStore.createIndex('by-type', 'type');
        }
      },
    });
  }
  return dbPromise;
}

export async function ensureWorkoutIndexes() {
  const db = await getDB();
  return db;
}

export async function addWorkout(workout: Workout) { const db = await getDB(); await db.put('workouts', workout); }
export async function getWorkouts(limit?: number): Promise<Workout[]> { const db = await getDB(); const all = await db.getAllFromIndex('workouts', 'by-date'); const sorted = all.reverse(); return limit ? sorted.slice(0, limit) : sorted; }
export async function deleteWorkout(id: string) { const db = await getDB(); await db.delete('workouts', id); }
export async function getScheduledWorkoutsForDate(date: string): Promise<Workout[]> {
  const workouts = await getWorkouts();
  return workouts.filter((workout) => workout.scheduledFor === date);
}

export async function addWeightEntry(entry: FitTrackDB['weightLog']['value']) { const db = await getDB(); await db.put('weightLog', entry); }
export async function getWeightEntries(limit?: number) { const db = await getDB(); const all = await db.getAllFromIndex('weightLog', 'by-date'); const sorted = all.reverse(); return limit ? sorted.slice(0, limit) : sorted; }
export async function deleteWeightEntry(id: string) { const db = await getDB(); await db.delete('weightLog', id); }

export async function addPhoto(photo: FitTrackDB['photos']['value']) { const db = await getDB(); await db.put('photos', photo); }
export async function getPhotos() { const db = await getDB(); const all = await db.getAllFromIndex('photos', 'by-date'); return all.reverse(); }
export async function deletePhoto(id: string) { const db = await getDB(); await db.delete('photos', id); }

export async function addProgram(program: FitTrackDB['programs']['value']) { const db = await getDB(); await db.put('programs', program); }
export async function getPrograms() { const db = await getDB(); return db.getAll('programs'); }
export async function getProgram(id: string) { const db = await getDB(); return db.get('programs', id); }
export async function deleteProgram(id: string) { const db = await getDB(); await db.delete('programs', id); }
export async function setActiveProgram(id: string) {
  const db = await getDB();
  const programs = await db.getAll('programs');
  for (const p of programs) { p.isActive = p.id === id; await db.put('programs', p); }
}

export async function addPersonalRecord(pr: FitTrackDB['personalRecords']['value']) { const db = await getDB(); await db.put('personalRecords', pr); }
export async function getPersonalRecords(exercise?: string) { const db = await getDB(); if (exercise) return db.getAllFromIndex('personalRecords', 'by-exercise', exercise); return db.getAll('personalRecords'); }

export async function addCustomExercise(exercise: FitTrackDB['customExercises']['value']) { const db = await getDB(); await db.put('customExercises', exercise); }
export async function getCustomExercises(category?: string) { const db = await getDB(); if (category) return db.getAllFromIndex('customExercises', 'by-category', category); return db.getAll('customExercises'); }
export async function deleteCustomExercise(id: string) { const db = await getDB(); await db.delete('customExercises', id); }
export async function getAllExerciseNames(): Promise<string[]> {
  const custom = await getCustomExercises();
  const customNames = custom.map((e) => e.name);
  const merged = [...COMMON_EXERCISES, ...customNames];
  return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
}

export async function addWorkoutTemplate(template: WorkoutTemplate) { const db = await getDB(); await db.put('workoutTemplates', template); }
export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> { const db = await getDB(); return db.getAll('workoutTemplates'); }
export async function deleteWorkoutTemplate(id: string) { const db = await getDB(); await db.delete('workoutTemplates', id); }

export async function addRecurringWorkoutPlan(plan: RecurringWorkoutPlan) { const db = await getDB(); await db.put('recurringWorkoutPlans', plan); }
export async function getRecurringWorkoutPlans(): Promise<RecurringWorkoutPlan[]> { const db = await getDB(); const all = await db.getAll('recurringWorkoutPlans'); return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export async function updateRecurringWorkoutPlan(id: string, updates: Partial<RecurringWorkoutPlan>) {
  const db = await getDB();
  const current = await db.get('recurringWorkoutPlans', id);
  if (!current) return null;
  const updated = { ...current, ...updates, id, updatedAt: new Date().toISOString() };
  await db.put('recurringWorkoutPlans', updated);
  return updated;
}
export async function deleteRecurringWorkoutPlan(id: string) { const db = await getDB(); await db.delete('recurringWorkoutPlans', id); }

export function isRecurringWorkoutDue(plan: RecurringWorkoutPlan, date: string) {
  if (!plan.isActive) return false;
  if (date < plan.startDate) return false;
  if (plan.endDate && date > plan.endDate) return false;
  const day = new Date(date + 'T12:00:00').getDay();
  return plan.weekdays.includes(day);
}

export async function getDueRecurringWorkoutPlans(date: string) {
  const plans = await getRecurringWorkoutPlans();
  return plans.filter((plan) => isRecurringWorkoutDue(plan, date));
}

export async function scheduleRecurringWorkout(planId: string, date: string) {
  const db = await getDB();
  const plan = await db.get('recurringWorkoutPlans', planId);
  if (!plan) return null;
  const existing = (await getWorkouts()).find((w) => w.recurringPlanId === planId && w.scheduledFor === date);
  if (existing) return existing;
  const template = plan.templateId ? await db.get('workoutTemplates', plan.templateId) : null;
  const exercises = template
    ? template.exercises.map((exercise) => ({ name: exercise.name, sets: Array.from({ length: exercise.sets }, () => ({ reps: exercise.reps, weight: 0, completed: true })) }))
    : plan.exerciseNames.map((name) => ({ name, sets: [{ reps: 10, weight: 0, completed: true }] }));
  const workout: Workout = {
    id: generateId(),
    date: `${date}T06:00:00.000Z`,
    scheduledFor: date,
    recurringPlanId: plan.id,
    exercises,
    notes: plan.notes,
  };
  await db.put('workouts', workout);
  return workout;
}

export async function materializeRecurringWorkoutsForDate(date: string) {
  const duePlans = await getDueRecurringWorkoutPlans(date);
  const created: Workout[] = [];
  for (const plan of duePlans) {
    const workout = await scheduleRecurringWorkout(plan.id, date);
    if (workout) created.push(workout);
  }
  return created;
}

export async function addMeasurement(measurement: Measurement) { const db = await getDB(); await db.put('measurements', measurement); }
export async function getMeasurements(limit?: number): Promise<Measurement[]> { const db = await getDB(); const all = await db.getAllFromIndex('measurements', 'by-date'); const sorted = all.reverse(); return limit ? sorted.slice(0, limit) : sorted; }
export async function deleteMeasurement(id: string) { const db = await getDB(); await db.delete('measurements', id); }

export async function addMacroLog(log: MacroLog) { const db = await getDB(); await db.put('macroLogs', log); }
export async function getMacroLogs(date?: string): Promise<MacroLog[]> { const db = await getDB(); if (date) return db.getAllFromIndex('macroLogs', 'by-date', date); const all = await db.getAllFromIndex('macroLogs', 'by-date'); return all.reverse(); }
export async function deleteMacroLog(id: string) { const db = await getDB(); await db.delete('macroLogs', id); }

export function getReadinessScore(log: ReadinessLog): number {
  const scoreLevel = (value: ReadinessLevel) => value === 'High' ? 10 : value === 'Medium' ? 7 : 4;
  const scoreSleep = (value: SleepLevel) => value === 'Good' ? 10 : value === 'OK' ? 7 : 4;
  const scoreTraining = (value: TrainingLevel) => value === 'Great' ? 10 : value === 'OK' ? 7 : value === 'Rest day' ? 7 : 4;
  return Math.round((scoreLevel(log.energy) + scoreLevel(log.recovery) + scoreSleep(log.sleep) + scoreTraining(log.training)) / 4);
}

export async function addReadinessLog(log: ReadinessLog) { const db = await getDB(); await db.put('readinessLogs', log); }
export async function getReadinessLogs(date?: string): Promise<ReadinessLog[]> { const db = await getDB(); if (date) return db.getAllFromIndex('readinessLogs', 'by-date', date); const all = await db.getAllFromIndex('readinessLogs', 'by-date'); return all.reverse(); }
export async function getLatestReadinessLog(): Promise<ReadinessLog | null> { const logs = await getReadinessLogs(); return logs.length > 0 ? logs[0] : null; }
export async function getRecentReadinessLogs(limit: number): Promise<ReadinessLog[]> { const logs = await getReadinessLogs(); return logs.slice(0, limit); }
export async function getRecentMacroLogs(limit: number): Promise<MacroLog[]> { const logs = await getMacroLogs(); return logs.slice(0, limit); }
export async function deleteReadinessLog(id: string) { const db = await getDB(); await db.delete('readinessLogs', id); }

export interface CoachHistoryEntry {
  weekStart: string;
  weekEnd: string;
  phaseName: string;
  command: string;
  confidence: 'low' | 'medium' | 'high';
  weightDelta: number;
  avgReadiness: number;
}

export interface CoachSummary {
  currentWeek: ReadinessLog[];
  previousWeek: ReadinessLog[];
  avgReadiness: number;
  previousAvgReadiness: number;
  avgCalories: number;
  calorieTarget: number;
  calorieDelta: number;
  avgWeight: number;
  prevAvgWeight: number;
  weightDelta: number;
  workoutCount: number;
  plannedCount: number;
  adherencePercent: number;
  activePhase: FitnessPhase | null;
  command: string;
  why: string[];
  actions: string[];
  confidence: 'low' | 'medium' | 'high';
  history: CoachHistoryEntry[];
}

function getActivePhaseForDate(phases: FitnessPhase[], date: string) {
  const matching = phases.filter((phase) => phase.startDate <= date && phase.endDate >= date);
  const subPhase = matching.find((phase) => phase.parentPhaseId);
  return subPhase || matching[0] || null;
}

function getPhaseWeightTargetRange(phaseType?: PhaseType | null) {
  if (phaseType === 'bulk') return { min: 0.25, max: 0.75 };
  if (phaseType === 'cut') return { min: -1.5, max: -0.4 };
  if (phaseType === 'maintenance') return { min: -0.3, max: 0.3 };
  return { min: -0.3, max: 0.3 };
}

type CoachInput = Pick<CoachSummary, 'currentWeek' | 'previousWeek' | 'avgReadiness' | 'previousAvgReadiness' | 'avgCalories' | 'calorieTarget' | 'calorieDelta' | 'avgWeight' | 'prevAvgWeight' | 'weightDelta' | 'workoutCount' | 'plannedCount' | 'adherencePercent' | 'activePhase'>;

function isMiniCutPhase(phase: FitnessPhase | null) {
  return !!phase && phase.type === 'cut' && !!phase.parentPhaseId;
}

export function getCoachCommand(summary: CoachInput) {
  const phaseType = summary.activePhase?.type || 'maintenance';
  const target = getPhaseWeightTargetRange(phaseType);
  const why: string[] = [];
  const actions: string[] = [];
  let command = 'Stay the course';
  let confidence: CoachSummary['confidence'] = 'medium';

  if (summary.workoutCount < 2 && summary.plannedCount >= 3) {
    command = 'Hit your planned sessions first';
    why.push('training consistency is low versus your recurring plan');
    actions.push('complete your next scheduled workouts before changing calories');
  } else if (summary.avgReadiness < 6 || summary.avgReadiness < summary.previousAvgReadiness - 1) {
    command = 'Recover first';
    why.push('readiness is low or trending down');
    actions.push('prioritize sleep and reduce training volume slightly this week');
  } else if (isMiniCutPhase(summary.activePhase)) {
    if (summary.weightDelta > -0.3) {
      command = 'Tighten the mini cut';
      why.push('mini cut is not driving enough short-term weight loss');
      if (summary.calorieDelta > 0) why.push('average calories are above target during the mini cut');
      actions.push('reduce calories by 150–200 and keep training intensity high');
    } else if (summary.avgReadiness < 7) {
      command = 'Protect performance during the mini cut';
      why.push('fat loss is happening but readiness is slipping');
      actions.push('hold calories steady for now and reduce fatigue where possible');
    } else {
      command = 'Mini cut is on track';
      why.push('short-term fat loss is moving while recovery remains acceptable');
      actions.push('keep protein high and maintain lifting performance');
    }
  } else if (phaseType === 'bulk') {
    if (summary.weightDelta < target.min) {
      command = 'Increase calories slightly';
      why.push('weight gain is below your bulk target range');
      if (summary.calorieDelta < 0) why.push('average calories are below target');
      actions.push('add 150–200 daily calories and reassess next week');
    } else if (summary.weightDelta > target.max) {
      command = 'Slow the bulk slightly';
      why.push('weight gain is above your target range');
      actions.push('reduce calories by 100–150 and keep protein high');
    } else {
      command = 'Bulk is on track';
      why.push('weight gain is within your target range');
      actions.push('hold calories steady and keep training hard');
    }
  } else if (phaseType === 'cut') {
    if (summary.weightDelta > target.max) {
      command = 'Tighten the cut';
      why.push('weight is not dropping fast enough for a cut');
      if (summary.calorieDelta > 0) why.push('average calories are above target');
      actions.push('reduce calories by 150–200 or increase activity slightly');
    } else if (summary.weightDelta < target.min) {
      command = 'Ease the cut a bit';
      why.push('weight loss is faster than target');
      actions.push('increase calories slightly to protect recovery and performance');
    } else {
      command = 'Cut is on track';
      why.push('weight loss is within your target range');
      actions.push('stay consistent and keep protein high');
    }
  } else {
    if (summary.weightDelta >= target.min && summary.weightDelta <= target.max && summary.avgReadiness >= 7) {
      command = 'Maintenance is working';
      why.push('bodyweight is stable and readiness is solid');
      actions.push('keep calories and training steady');
    } else if (summary.calorieDelta < -150 && summary.avgReadiness < 7) {
      command = 'Increase calories slightly';
      why.push('you are eating below target and recovery looks limited');
      actions.push('add 100–150 calories and reassess in 7 days');
    } else {
      command = 'Stay the course';
      why.push('current trends do not suggest a major adjustment');
      actions.push('keep logging and reassess next week');
    }
  }

  if (summary.currentWeek.length < 4 || summary.avgWeight === 0 || summary.prevAvgWeight === 0) {
    confidence = 'low';
    actions.push('log more weigh-ins and readiness check-ins for stronger guidance');
  } else if (summary.currentWeek.length >= 6 && summary.workoutCount >= 3) {
    confidence = 'high';
  }

  return { command, why, actions, confidence };
}

export async function getWeeklyReadinessSummary(): Promise<CoachSummary> {
  const today = new Date().toISOString().slice(0, 10);
  const [logs, weights, macroLogs, profile, phases, workouts, plans] = await Promise.all([
    getRecentReadinessLogs(14),
    getWeightEntries(14),
    getRecentMacroLogs(7),
    getDefaultUserProfile(),
    getPhases(),
    getWorkouts(30),
    getRecurringWorkoutPlans(),
  ]);
  const currentWeek = logs.slice(0, 7);
  const previousWeek = logs.slice(7, 14);
  const currentWeightWindow = weights.slice(0, 7).map((w) => Number(w.weight)).filter(Boolean);
  const previousWeightWindow = weights.slice(7, 14).map((w) => Number(w.weight)).filter(Boolean);
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const avgReadiness = Math.round(average(currentWeek.map(getReadinessScore)));
  const previousAvgReadiness = Math.round(average(previousWeek.map(getReadinessScore)));
  const avgCalories = Math.round(average(macroLogs.map((log) => Number(log.calories)).filter(Boolean)));
  const avgWeight = average(currentWeightWindow);
  const prevAvgWeight = average(previousWeightWindow);
  const weightDelta = avgWeight && prevAvgWeight ? Number((avgWeight - prevAvgWeight).toFixed(1)) : 0;
  const activePhase = getActivePhaseForDate(phases, today);
  const plannedCount = plans.filter((plan) => plan.isActive && (!plan.endDate || plan.endDate >= today) && plan.startDate <= today).length;
  const workoutCount = workouts.filter((workout) => new Date(workout.date) >= new Date(Date.now() - 7 * 86400000)).length;
  const adherencePercent = plannedCount > 0 ? Math.min(100, Math.round((workoutCount / plannedCount) * 100)) : 100;
  const calorieTarget = profile.targetCalories || 0;
  const calorieDelta = avgCalories && calorieTarget ? avgCalories - calorieTarget : 0;

  const baseSummary: CoachInput = {
    currentWeek,
    previousWeek,
    avgReadiness,
    previousAvgReadiness,
    avgCalories,
    calorieTarget,
    calorieDelta,
    avgWeight,
    prevAvgWeight,
    weightDelta,
    workoutCount,
    plannedCount,
    adherencePercent,
    activePhase,
  };
  const coaching = getCoachCommand(baseSummary);

  const history: CoachHistoryEntry[] = [0, 1, 2, 3].map((weekIndex) => {
    const start = weekIndex * 7;
    const end = start + 7;
    const weekLogs = logs.slice(start, end);
    const weekWeights = weights.slice(start, end).map((w) => Number(w.weight)).filter(Boolean);
    const prevWeights = weights.slice(end, end + 7).map((w) => Number(w.weight)).filter(Boolean);
    const weekAvgReadiness = Math.round(average(weekLogs.map(getReadinessScore)));
    const weekAvgWeight = average(weekWeights);
    const prevWeekAvgWeight = average(prevWeights);
    const weekWeightDelta = weekAvgWeight && prevWeekAvgWeight ? Number((weekAvgWeight - prevWeekAvgWeight).toFixed(1)) : 0;
    const phaseForWeek = getActivePhaseForDate(phases, logs[start]?.date || today);
    const historyInput: CoachInput = {
      currentWeek: weekLogs,
      previousWeek: logs.slice(end, end + 7),
      avgReadiness: weekAvgReadiness,
      previousAvgReadiness: Math.round(average(logs.slice(end, end + 7).map(getReadinessScore))),
      avgCalories,
      calorieTarget,
      calorieDelta,
      avgWeight: weekAvgWeight,
      prevAvgWeight: prevWeekAvgWeight,
      weightDelta: weekWeightDelta,
      workoutCount,
      plannedCount,
      adherencePercent,
      activePhase: phaseForWeek,
    };
    const historyCoach = getCoachCommand(historyInput);
    const weekStart = logs[end - 1]?.date || today;
    const weekEnd = logs[start]?.date || today;
    return {
      weekStart,
      weekEnd,
      phaseName: phaseForWeek?.name || 'No phase',
      command: historyCoach.command,
      confidence: historyCoach.confidence,
      weightDelta: weekWeightDelta,
      avgReadiness: weekAvgReadiness,
    };
  }).filter((entry) => entry.weekStart && entry.weekEnd);

  return {
    ...baseSummary,
    ...coaching,
    history,
  };
}

export async function getDailyNutritionSummary(date: string): Promise<{ totalCalories: number; totalProtein: number; totalCarbs: number; totalFat: number; mealCount: number; byMealType: Record<string, { calories: number; protein: number; carbs: number; fat: number }> }> {
  const logs = await getMacroLogs(date);
  const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
  const totalProtein = logs.reduce((sum, log) => sum + log.protein, 0);
  const totalCarbs = logs.reduce((sum, log) => sum + log.carbs, 0);
  const totalFat = logs.reduce((sum, log) => sum + log.fat, 0);
  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    mealCount: logs.length,
    byMealType: {},
  };
}

export async function getDefaultUserProfile(): Promise<UserProfile> {
  const existing = await getUserProfile();
  if (existing) return existing;
  return {
    id: generateId(), age: 30, gender: 'male', height: 175, weight: 180, bodyFat: undefined,
    activityLevel: 'moderate', goal: 'maintain', macroPreference: 'balanced', weeklyWeightChange: 0,
    bmr: 0, tdee: 0, targetProtein: 150, targetCarbs: 250, targetFats: 65, targetCalories: 2200, targetWater: 3000,
    lastUpdated: new Date().toISOString(),
  };
}
export async function saveUserProfile(profile: UserProfile): Promise<void> { const db = await getDB(); profile.id = profile.id || generateId(); profile.lastUpdated = new Date().toISOString(); await db.put('userProfile', profile); }
export async function getUserProfile(): Promise<UserProfile | null> { const db = await getDB(); const all = await db.getAllFromIndex('userProfile', 'by-lastUpdated'); return all.length > 0 ? all[all.length - 1] : null; }
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> { const current = await getDefaultUserProfile(); const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() }; await saveUserProfile(updated); return updated; }

export async function addPhase(phase: FitnessPhase) { const db = await getDB(); await db.put('phases', phase); }
export async function updatePhase(id: string, updates: Partial<FitnessPhase>) {
  const db = await getDB();
  const current = await db.get('phases', id);
  if (!current) return null;
  const updated = { ...current, ...updates, id, updatedAt: new Date().toISOString() };
  await db.put('phases', updated);
  return updated;
}
export async function getPhases(): Promise<FitnessPhase[]> { const db = await getDB(); const all = await db.getAllFromIndex('phases', 'by-startDate'); return all.sort((a, b) => a.startDate.localeCompare(b.startDate)); }
export async function deletePhase(id: string) { const db = await getDB(); await db.delete('phases', id); }
export async function getPhase(id: string) { const db = await getDB(); return db.get('phases', id); }

export async function getExerciseHistory(exerciseName: string, limit: number): Promise<{ date: string; workoutId: string; sets: { reps: number; weight: number }[] }[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('workouts', 'by-date');
  const sorted = all.reverse();
  const results: { date: string; workoutId: string; sets: { reps: number; weight: number }[] }[] = [];
  for (const workout of sorted) {
    for (const ex of workout.exercises) {
      if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
        results.push({ date: workout.date, workoutId: workout.id, sets: ex.sets.filter(s => s.completed).map(s => ({ reps: s.reps, weight: s.weight })) });
        break;
      }
    }
    if (results.length >= limit) break;
  }
  return results;
}

const STORE_NAMES = ['workouts', 'weightLog', 'photos', 'programs', 'personalRecords', 'customExercises', 'workoutTemplates', 'recurringWorkoutPlans', 'measurements', 'macroLogs', 'readinessLogs', 'userProfile', 'phases'] as const;
type StoreName = typeof STORE_NAMES[number];

export interface FitTrackBackup {
  metadata: { exportDate: string; appVersion: string; storeCount: Record<StoreName, number>; };
  data: Record<StoreName, unknown[]>;
}

export async function exportAllData(): Promise<FitTrackBackup> {
  const db = await getDB();
  const data: Record<string, unknown[]> = {};
  const storeCount: Record<string, number> = {};
  for (const store of STORE_NAMES) {
    const items = await db.getAll(store as StoreName);
    data[store] = items;
    storeCount[store] = items.length;
  }
  return { metadata: { exportDate: new Date().toISOString(), appVersion: '0.1.0', storeCount: storeCount as Record<StoreName, number> }, data: data as Record<StoreName, unknown[]> };
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
  for (const store of STORE_NAMES) { if (data[store] !== undefined && !Array.isArray(data[store])) return false; }
  return true;
}

export async function importAllData(backup: FitTrackBackup): Promise<{ imported: Record<StoreName, number> }> {
  const db = await getDB();
  const imported: Record<string, number> = {};
  for (const store of STORE_NAMES) {
    const tx = db.transaction(store as StoreName, 'readwrite');
    await tx.store.clear();
    const items = backup.data[store];
    if (items && Array.isArray(items)) {
      for (const item of items) await tx.store.put(item as never);
      imported[store] = items.length;
    } else imported[store] = 0;
    await tx.done;
  }
  return { imported: imported as Record<StoreName, number> };
}

export function exportWorkoutsToCSV(workouts: Workout[]): string {
  const headers = ['Date', 'Exercise', 'Set', 'Reps', 'Weight', 'Completed', 'Workout Notes'];
  const rows: string[][] = [headers];
  workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      exercise.sets.forEach((set, setIndex) => {
        rows.push([workout.date, `"${exercise.name.replace(/"/g, '""')}"`, (setIndex + 1).toString(), set.reps.toString(), set.weight.toString(), set.completed ? 'Yes' : 'No', `"${(workout.notes || '').replace(/"/g, '""')}"`]);
      });
    });
  });
  return rows.map(row => row.join(',')).join('\n');
}

export function exportMeasurementsToCSV(measurements: Measurement[]): string {
  const headers = ['Date', 'Chest (in)', 'Waist (in)', 'Hips (in)', 'Bicep Left (in)', 'Bicep Right (in)', 'Thigh Left (in)', 'Thigh Right (in)', 'Neck (in)', 'Body Fat %', 'Notes'];
  const rows: string[][] = [headers];
  measurements.forEach(m => {
    rows.push([m.date, m.chest?.toString() || '', m.waist?.toString() || '', m.hips?.toString() || '', m.bicepLeft?.toString() || '', m.bicepRight?.toString() || '', m.thighLeft?.toString() || '', m.thighRight?.toString() || '', m.neck?.toString() || '', m.bodyFat?.toString() || '', `"${(m.notes || '').replace(/"/g, '""')}"`]);
  });
  return rows.map(row => row.join(',')).join('\n');
}

export async function exportAllDataWithCSV(): Promise<FitTrackBackup & { csvExports: { workouts: string; measurements: string } }> {
  const data = await exportAllData();
  return { ...data, csvExports: { workouts: exportWorkoutsToCSV((data.data.workouts as Workout[] || [])), measurements: exportMeasurementsToCSV((data.data.measurements as Measurement[] || [])) } };
}

export function validateCSVImport(csv: string, type: 'workouts' | 'measurements'): { valid: boolean; error?: string; rowCount?: number } {
  if (!csv || typeof csv !== 'string') return { valid: false, error: 'CSV data is empty or invalid' };
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { valid: false, error: 'CSV has no data rows' };
  const headers = lines[0].split(',').map(h => h.trim());
  const expectedWorkoutHeaders = ['Date', 'Exercise', 'Set', 'Reps', 'Weight', 'Completed', 'Workout Notes'];
  const expectedMeasurementHeaders = ['Date', 'Chest (in)', 'Waist (in)', 'Hips (in)', 'Bicep Left (in)', 'Bicep Right (in)', 'Thigh Left (in)', 'Thigh Right (in)', 'Neck (in)', 'Body Fat %', 'Notes'];
  const expected = type === 'workouts' ? expectedWorkoutHeaders : expectedMeasurementHeaders;
  if (headers.length !== expected.length) return { valid: false, error: `Invalid header count. Expected ${expected.length}, got ${headers.length}` };
  return { valid: true, rowCount: lines.length - 1 };
}

export interface StoreStats { store: StoreName; count: number; sizeBytes: number; }
export async function getStorageStats(): Promise<StoreStats[]> {
  const db = await getDB();
  const stats: StoreStats[] = [];
  for (const store of STORE_NAMES) {
    const items = await db.getAll(store as StoreName);
    let size = 0;
    for (const item of items) { try { size += JSON.stringify(item).length; } catch {} }
    stats.push({ store, count: items.length, sizeBytes: size });
  }
  return stats;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  for (const store of STORE_NAMES) { const tx = db.transaction(store as StoreName, 'readwrite'); await tx.store.clear(); await tx.done; }
}

export async function cleanupOldData(options: { workoutsOlderThanDays?: number; keepLastNMeasurements?: number; deletePhotosOlderThanDays?: number }): Promise<{ deleted: Record<string, number> }> {
  const db = await getDB();
  const deleted: Record<string, number> = {};
  if (options.workoutsOlderThanDays) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - options.workoutsOlderThanDays); const cutoffStr = cutoff.toISOString().split('T')[0];
    const allWorkouts = await db.getAllFromIndex('workouts', 'by-date');
    const toDelete = allWorkouts.filter(w => w.date < cutoffStr).map(w => w.id);
    const tx = db.transaction('workouts', 'readwrite'); for (const id of toDelete) await tx.store.delete(id); await tx.done; deleted.workouts = toDelete.length;
  }
  if (options.keepLastNMeasurements) {
    const allMeasurements = await db.getAllFromIndex('measurements', 'by-date');
    const toDelete = allMeasurements.reverse().slice(options.keepLastNMeasurements).map(m => m.id);
    const tx = db.transaction('measurements', 'readwrite'); for (const id of toDelete) await tx.store.delete(id); await tx.done; deleted.measurements = toDelete.length;
  }
  if (options.deletePhotosOlderThanDays) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - options.deletePhotosOlderThanDays); const cutoffStr = cutoff.toISOString().split('T')[0];
    const allPhotos = await db.getAllFromIndex('photos', 'by-date');
    const toDelete = allPhotos.filter(p => p.date < cutoffStr).map(p => p.id);
    const tx = db.transaction('photos', 'readwrite'); for (const id of toDelete) await tx.store.delete(id); await tx.done; deleted.photos = toDelete.length;
  }
  return { deleted };
}

export function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
