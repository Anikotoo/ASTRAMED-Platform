export type CrewRole = 
  | 'Commander' 
  | 'Flight Engineer' 
  | 'Mission Specialist' 
  | 'Payload Specialist' 
  | 'Medical Officer';

export interface CrewMember {
  id: string;
  name: string;
  callsign: string;
  role: CrewRole;
  mission: string;
  age: number;
  sex: 'male' | 'female';
  bloodType: string;
  evaCount: number;
  daysInOrbit: number;
  avatarSeed: string;
  baseline: {
    restingHeartRate: number; // bpm
    bloodPressureSys: number; // mmHg
    bloodPressureDia: number; // mmHg
    weightKg: number;
    vo2Max: number; // mL/kg/min
    boneDensityTScore: number;
    quadStrengthBaseline: number; // N
  };
}

export type HealthCategory = 'cardiovascular' | 'musculoskeletal' | 'general' | 'environmental';

export type HealthParameter = 
  | 'heart_rate'
  | 'blood_pressure_sys'
  | 'blood_pressure_dia'
  | 'resting_heart_rate'
  | 'hrv'
  | 'muscle_strength_quad'
  | 'muscle_strength_bicep'
  | 'muscle_mass'
  | 'bone_density_tscore'
  | 'exercise_duration'
  | 'body_weight'
  | 'sleep_duration'
  | 'sleep_efficiency'
  | 'spo2'
  | 'radiation_cumulative'
  | 'cabin_co2'
  | 'cabin_pressure';

export type MeasurementStatus = 'normal' | 'attention' | 'critical' | 'unverified';

export type DataSource = 'biomed_telemetry' | 'cycle_ergometer' | 'aRED_exercise' | 'clinical_exam' | 'manual_entry' | 'user_import';

export interface HealthReading {
  id: string;
  crewId: string;
  category: HealthCategory;
  parameter: HealthParameter;
  value: number;
  secondaryValue?: number; // for diastolic BP if needed
  unit: string;
  timestamp: string; // ISO 8601
  source: DataSource;
  status: MeasurementStatus;
  notes?: string;
  datasetId?: string; // set if imported
  isBuiltIn?: boolean;
}

export type AlertSeverity = 'critical' | 'attention' | 'informational';

export interface HealthAlert {
  id: string;
  crewId: string;
  title: string;
  category: HealthCategory;
  parameter: HealthParameter;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  severity: AlertSeverity;
  timestamp: string;
  explanation: string;
  recommendedAction: string;
  source: DataSource;
  acknowledged?: boolean;
}

export interface HealthEvent {
  id: string;
  crewId?: string;
  type: 'reading' | 'alert' | 'import' | 'eva' | 'countermeasure' | 'observation';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'normal' | 'warning' | 'critical';
  source: string;
  metadata?: Record<string, unknown>;
}

export interface ImportedDataset {
  id: string;
  name: string;
  filename: string;
  format: 'csv' | 'json';
  recordCount: number;
  importedAt: string;
  crewIdsAffected: string[];
  parametersIncluded: string[];
}

export type StudyType = 
  | 'Systematic Review / Meta-analysis'
  | 'Review'
  | 'Clinical Trial'
  | 'Observational Study'
  | 'Experimental Study'
  | 'Case Report'
  | 'Unknown';

export interface ResearchStudy {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  abstract: string;
  doi?: string;
  pmid?: string;
  osdrId?: string;
  source: 'Europe PMC' | 'NASA OSDR' | 'Spaceflight Medicine Index';
  category: 
    | 'Cardiovascular Health'
    | 'Musculoskeletal Health'
    | 'Bone Loss'
    | 'Microgravity'
    | 'Radiation'
    | 'Sleep and Circadian Rhythm'
    | 'Psychological Health'
    | 'Vestibular and Sensorimotor Health'
    | 'General Spaceflight Medicine';
  studyType: StudyType;
  url: string;
  relevanceScore?: number;
}

export interface MuscleGroupInfo {
  id: string;
  name: string;
  latinName: string;
  location: 'anterior' | 'posterior' | 'both';
  crewMetricKey: string;
  primaryFunction: string;
  microgravityImpact: string;
  countermeasures: string;
  relatedResearchKeywords: string[];
}

export interface MissionSettings {
  missionName: string;
  missionStartDate: string;
  thresholds: {
    heartRateHigh: number;
    heartRateLow: number;
    systolicHigh: number;
    systolicLow: number;
    sleepMinHours: number;
    spo2MinPercent: number;
    muscleLossWarningPercent: number;
  };
  units: 'metric' | 'imperial';
  autoRotate3D: boolean;
  activeGenderModel: 'male' | 'female';
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'navigate' | 'filter' | 'open_reading_form' | 'open_study';
    label: string;
    targetSection?: string;
    params?: Record<string, string>;
  };
  citations?: Array<{
    id?: string;
    title: string;
    source: string;
    doi?: string;
    url?: string;
  }>;
  isLiveGemini?: boolean;
  isLiveAI?: boolean;
  provider?: 'openrouter' | 'gemini' | 'offline';
  model?: string;
  evidenceType?: string;
  note?: string;
  sourceDisclosure?: string;
}
