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

export enum SyncStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  PERMISSION_DENIED = 'permission_denied',
  SYNCING = 'syncing',
  ERROR = 'error',
}

export interface SyncPreferences {
  steps: boolean;
  workouts: boolean;
  heartRate: boolean;
  restingHeartRate: boolean;
  sleep: boolean;
  calories: boolean;
  distance: boolean;
}

export interface StepData {
  id: string;
  source: HealthDataSource;
  date: string;
  type: 'steps';
  steps: number;
  distance?: number;
  calories?: number;
  syncedAt: string;
}

export interface HeartRateData {
  id: string;
  source: HealthDataSource;
  date: string;
  type: 'heartRate' | 'restingHR';
  timestamp: string;
  bpm: number;
  resting?: boolean;
  syncedAt: string;
}

export interface HeartRateZone {
  zone: number;
  name: string;
  minBpm: number;
  maxBpm: number;
  timeInZoneSeconds: number;
}

export interface HealthWorkout {
  id: string;
  source: HealthDataSource;
  externalId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  calories?: number;
  distance?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  heartRateZones?: HeartRateZone[];
  syncedAt: string;
  mappedExerciseName?: string;
}

export interface SleepStage {
  type: 'awake' | 'light' | 'deep' | 'rem';
  duration: number;
  startTime: string;
  endTime: string;
}

export interface SleepData {
  id: string;
  source: HealthDataSource;
  date: string;
  type: 'sleep';
  startTime: string;
  endTime: string;
  duration: number;
  quality?: 'low' | 'medium' | 'high';
  stages?: SleepStage[];
  syncedAt: string;
}

export interface HealthSettings {
  key?: string;
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

// ============================================
// PHASE TRACKER TYPES
// ============================================

export enum PhaseType {
  BULK = 'bulk',
  CUT = 'cut',
  MAINTENANCE = 'maintenance'
}

export interface FitnessPhase {
  id?: IDBValidKey;
  type: PhaseType;
  startDate: string; // ISO 8601 date string
  endDate?: string; // null = ongoing phase
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PhaseProgress {
  phaseId: IDBValidKey;
  date: string; // YYYY-MM-DD
  weightChange?: number; // kg/lbs change since phase start
  calorieAdherence?: number; // percentage (0-100)
  workoutAdherence?: number; // percentage (0-100)
  notes?: string;
  createdAt: number;
}