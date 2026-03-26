import * as db from './db';
import { HealthDataSource, SyncStatus } from '@/types/health';

export { HealthDataSource, SyncStatus };

type StepData = db.StepData;
type HeartRateData = db.HeartRateData;
type HealthWorkout = db.HealthWorkout;
type SleepData = db.SleepData;
type SyncPreferences = db.SyncPreferences;

export class HealthSyncService {
  private db: typeof db;
  private settings: db.HealthSettings;

  constructor() {
    this.db = db;
    this.settings = db.DEFAULT_HEALTH_SETTINGS;
  }

  async checkBluetoothSupport(): Promise<boolean> {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async requestAppleHealthPermission(): Promise<boolean> {
    try {
      if (!('bluetooth' in navigator)) return false;
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['health_monitor'] }],
        optionalServices: ['heart_rate', 'step_counter', 'distance']
      });
      if (device) {
        await this.saveDeviceConnection(HealthDataSource.APPLE_HEALTH, device.name || 'Apple Watch');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Apple Health permission denied:', error);
      return false;
    }
  }

  async requestGoogleFitPermission(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      await this.loadGoogleFitScript();
      const gapi = (window as any).gapi;
      if (!gapi) return false;
      await new Promise<void>((resolve, reject) => {
        gapi.load('client:auth2', async () => {
          try {
            await gapi.client.init({
              apiKey: process.env.NEXT_PUBLIC_GOOGLE_FIT_API_KEY,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/fitness/v1/rest'],
              scope: 'https://www.googleapis.com/auth/fitness.activity.read'
            });
            resolve();
          } catch (err) { reject(err); }
        });
      });
      const GoogleAuth = (window as any).gapi.auth2.getAuthInstance();
      const result = await GoogleAuth.signIn();
      if (result.getAuthResponse().access_token) {
        await this.saveDeviceConnection(HealthDataSource.GOOGLE_FIT, 'Google Fit');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Google Fit permission denied:', error);
      return false;
    }
  }

  private loadGoogleFitScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/platform.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  private async saveDeviceConnection(source: HealthDataSource, deviceName: string): Promise<void> {
    const settings = await this.db.getHealthSettings();
    if (!settings.connectedSources.includes(source)) {
      settings.connectedSources.push(source);
      await this.db.updateHealthSettings(settings);
    }
  }

  async syncSteps(): Promise<{ source: HealthDataSource; steps: number; date: string }[]> {
    const results: { source: HealthDataSource; steps: number; date: string }[] = [];
    const settings = await this.db.getHealthSettings();
    if (!settings.enabled || !settings.syncPreferences.steps) return results;
    for (const source of settings.connectedSources) {
      try {
        let stepData: StepData[] = [];
        if (source === HealthDataSource.APPLE_HEALTH) stepData = await this.syncAppleHealthSteps();
        else if (source === HealthDataSource.GOOGLE_FIT) stepData = await this.syncGoogleFitSteps();
        for (const data of stepData) {
          await this.db.addHealthMetric(data);
          results.push({ source, steps: data.steps, date: data.date });
        }
      } catch (error) { console.error(`Failed to sync steps from ${source}:`, error); }
    }
    return results;
  }

  private async syncAppleHealthSteps(): Promise<StepData[]> { return []; }
  private async syncGoogleFitSteps(): Promise<StepData[]> { return []; }

  async syncWorkouts(): Promise<HealthWorkout[]> {
    const workouts: HealthWorkout[] = [];
    const settings = await this.db.getHealthSettings();
    if (!settings.enabled || !settings.syncPreferences.workouts) return workouts;
    for (const source of settings.connectedSources) {
      try {
        const sourceWorkouts: HealthWorkout[] = source === HealthDataSource.GOOGLE_FIT
          ? await this.syncGoogleFitWorkouts() : [];
        for (const workout of sourceWorkouts) {
          const existing = await this.db.getHealthWorkoutByExternalId(source, workout.externalId);
          if (!existing) { await this.db.addHealthWorkout(workout); workouts.push(workout); }
        }
      } catch (error) { console.error(`Failed to sync workouts from ${source}:`, error); }
    }
    return workouts;
  }

  private async syncGoogleFitWorkouts(): Promise<HealthWorkout[]> { return []; }

  async syncHeartRate(): Promise<HeartRateData[]> {
    const heartRates: HeartRateData[] = [];
    const settings = await this.db.getHealthSettings();
    if (!settings.enabled || !settings.syncPreferences.heartRate) return heartRates;
    return heartRates;
  }

  async syncSleep(): Promise<SleepData[]> {
    const sleepData: SleepData[] = [];
    const settings = await this.db.getHealthSettings();
    if (!settings.enabled || !settings.syncPreferences.sleep) return sleepData;
    return sleepData;
  }

  async syncAll(): Promise<{ steps: number; workouts: number; heartRate: number; sleep: number; errors: string[] }> {
    const errors: string[] = [];
    const results = { steps: 0, workouts: 0, heartRate: 0, sleep: 0 };
    try {
      const stepResults = await this.syncSteps();
      results.steps = stepResults.reduce((sum, r) => sum + r.steps, 0);
      const workoutResults = await this.syncWorkouts();
      results.workouts = workoutResults.length;
    } catch (error) {
      errors.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    const settingsForHistory = await this.db.getHealthSettings();
    await this.recordSyncHistory(settingsForHistory.connectedSources, results, errors);
    return { ...results, errors };
  }

  private async recordSyncHistory(
    sources: HealthDataSource[],
    results: { steps: number; workouts: number; heartRate: number; sleep: number },
    errors: string[]
  ): Promise<void> {
    for (const source of sources) {
      const entry: db.SyncHistory = {
        id: `sync_${source}_${Date.now()}`,
        source,
        timestamp: new Date().toISOString(),
        status: errors.length > 0 ? 'failed' : 'success',
        dataTypes: ['steps', 'workouts', 'heartRate', 'sleep'],
        itemsSynced: {
          steps: results.steps > 0 ? results.steps : undefined,
          workouts: results.workouts > 0 ? results.workouts : undefined,
        },
        errors: errors.length > 0 ? errors : undefined
      };
      await this.db.addSyncHistory(entry);
    }
  }

  async getDailySteps(date: string): Promise<number> {
    const metrics = await this.db.getHealthMetricsByDate(date, 'steps');
    return metrics.reduce((sum, m) => sum + ((m as db.StepData).steps || 0), 0);
  }

  async getStepHistory(days: number = 30): Promise<{ date: string; steps: number }[]> {
    const history: { date: string; steps: number }[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const steps = await this.getDailySteps(dateStr);
      history.push({ date: dateStr, steps });
    }
    return history.reverse();
  }

  async getRecentHealthWorkouts(limit: number = 10): Promise<db.HealthWorkout[]> {
    return this.db.getHealthWorkouts(undefined, undefined, limit);
  }

  mapWorkoutToFitTrack(healthWorkout: db.HealthWorkout): Partial<db.Workout> {
    const exerciseName = healthWorkout.mappedExerciseName || this.guessExerciseFromType(healthWorkout.type);
    const sets = Math.max(3, Math.floor(healthWorkout.duration / 300));
    return {
      date: healthWorkout.date,
      exercises: [{ name: exerciseName, sets: Array.from({ length: sets }, () => ({ reps: 10, weight: 0, completed: true })) }],
      duration: healthWorkout.duration / 60,
      notes: `Imported from ${healthWorkout.source} - ${healthWorkout.type}`
    };
  }

  private guessExerciseFromType(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('run') || t.includes('jog')) return 'Running';
    if (t.includes('walk')) return 'Walking';
    if (t.includes('cycle') || t.includes('bike')) return 'Cycling';
    if (t.includes('swim')) return 'Swimming';
    if (t.includes('yoga')) return 'Yoga';
    if (t.includes('strength') || t.includes('weight')) return 'Strength Training';
    if (t.includes('hiit')) return 'HIIT';
    return 'Cardio';
  }

  async updateSyncPreferences(preferences: Partial<SyncPreferences>): Promise<void> {
    const settings = await this.db.getHealthSettings();
    settings.syncPreferences = { ...settings.syncPreferences, ...preferences };
    await this.db.updateHealthSettings(settings);
  }

  async setStepGoal(goal: number): Promise<void> {
    const settings = await this.db.getHealthSettings();
    settings.stepGoal = goal;
    await this.db.updateHealthSettings(settings);
  }

  async setEnabled(enabled: boolean): Promise<void> {
    const settings = await this.db.getHealthSettings();
    settings.enabled = enabled;
    await this.db.updateHealthSettings(settings);
  }

  async getSettings(): Promise<db.HealthSettings> {
    return this.db.getHealthSettings();
  }

  async disconnectSource(source: HealthDataSource): Promise<void> {
    const settings = await this.db.getHealthSettings();
    settings.connectedSources = settings.connectedSources.filter(s => s !== source);
    await this.db.updateHealthSettings(settings);
  }

  async clearAllHealthData(): Promise<void> {
    const dbInstance = await this.db.getDB();
    const metrics = await dbInstance.getAll('healthMetrics');
    for (const m of metrics) await this.db.deleteHealthMetric(m.id);
    const workouts = await dbInstance.getAll('healthWorkouts');
    for (const w of workouts) await this.db.deleteHealthWorkout(w.id);
    const history = await dbInstance.getAll('healthSyncHistory');
    for (const h of history) await this.db.deleteSyncHistory(h.id);
  }
}

export const healthSync = new HealthSyncService();
