/**
 * Health Data Types for FitTrack
 * Unified interface for syncing data from Apple Health, Google Fit, and Health Connect
 */

export enum HealthDataSource {
  APPLE_HEALTH = 'apple_health',
  GOOGLE_FIT = 'google_fit',
  HEALTH_CONNECT = 'health_connect',
  MANUAL = 'manual',
}

/** Sync status for a connected data source */
export enum SyncStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  PERMISSION_DENIED = 'permission_denied',
  SYNCING = 'syncing',
  ERROR = 'error',
}

/** Sync configuration - what data types to sync */
export interface SyncPreferences {
  steps: boolean;
  workouts: boolean;
  heartRate: boolean;
  restingHeartRate: boolean;
  sleep: boolean;
  calories: boolean;
  distance: boolean;
}

/** Step count data from wearable */
export interface StepData {
  id: string;
  source: HealthDataSource;
  date: string; // YYYY-MM-DD
  type: 'steps';
  steps: number;
  distance?: number; // meters
  calories?: number;
  syncedAt: string; // ISO timestamp
}

/** Heart rate data */
export interface HeartRateData {
  id: string;
  source: HealthDataSource;
  date: string; // YYYY-MM-DD
  type: 'heartRate' | 'restingHR';
  timestamp: string; // ISO timestamp for specific measurement
  bpm: number;
  resting?: boolean;
  syncedAt: string;
}

/** Heart rate zone information */
export interface HeartRateZone {
  zone: number; // 1-5
  name: string; // 'Fat Burn', 'Cardio', etc.
  minBpm: number;
  maxBpm: number;
  timeInZoneSeconds: number;
}

/** Workout session from wearable */
export interface HealthWorkout {
  id: string;
  source: HealthDataSource;
  externalId: string; // ID from the source API
  date: string; // YYYY-MM-DD
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // milliseconds
  type: string; // e.g., 'running', 'cycling', 'strength'
  calories?: number;
  distance?: number; // meters
  heartRateAvg?: number;
  heartRateMax?: number;
  heartRateZones?: HeartRateZone[];
  syncedAt: string;
  mappedExerciseName?: string; // matched FitTrack exercise
}

/** Sleep stage breakdown */
export interface SleepStage {
  type: 'awake' | 'light' | 'deep' | 'rem';
  duration: number; // seconds
  startTime: string;
  endTime: string;
}

/** Sleep data */
export interface SleepData {
  id: string;
  source: HealthDataSource;
  date: string; // YYYY-MM-DD
  type: 'sleep';
  startTime: string; // ISO
  endTime: string; // ISO
  duration: number; // seconds
  quality?: 'low' | 'medium' | 'high';
  stages?: SleepStage[];
  syncedAt: string;
}

/** User's health settings */
export interface HealthSettings {
  key?: string; // IDB key field
  enabled: boolean;
  syncEnabled?: boolean;
  syncPreferences: SyncPreferences;
  stepGoal: number;
  connectedSources: HealthDataSource[];
  lastSyncTimes: Record<HealthDataSource, string | null>;
  dataPrivacy: {
    shareWithApps: boolean;
    keepLocalOnly: boolean;
  };
  sources?: {
    appleHealth: boolean;
    googleFit: boolean;
    healthConnect: boolean;
  };
  units?: {
    distance: 'metric' | 'imperial';
    weight: 'metric' | 'imperial';
  };
}

/** Sync history entry */
export interface SyncHistory {
  id: string;
  source: HealthDataSource;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  dataTypes?: string[];
  itemsSynced: {
    steps?: number;
    workouts?: number;
    heartRate?: number;
    sleep?: number;
  };
  errors?: string[];
}

/** Default health settings */
export const DEFAULT_HEALTH_SETTINGS: HealthSettings = {
  key: 'settings',
  enabled: false,
  syncEnabled: true,
  syncPreferences: {
    steps: true,
    workouts: true,
    heartRate: true,
    restingHeartRate: true,
    sleep: false,
    calories: true,
    distance: true,
  },
  stepGoal: 10000,
  connectedSources: [],
  lastSyncTimes: {
    [HealthDataSource.APPLE_HEALTH]: null,
    [HealthDataSource.GOOGLE_FIT]: null,
    [HealthDataSource.HEALTH_CONNECT]: null,
    [HealthDataSource.MANUAL]: null,
  },
  dataPrivacy: {
    shareWithApps: false,
    keepLocalOnly: true,
  },
  sources: {
    appleHealth: false,
    googleFit: false,
    healthConnect: false,
  },
  units: {
    distance: 'metric',
    weight: 'metric',
  },
};
