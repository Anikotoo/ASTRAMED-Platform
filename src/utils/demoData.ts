import { CrewMember, HealthAlert, HealthEvent, HealthReading } from '../types/astramed';

// Entirely synthetic fixtures for product demonstrations. Never persisted to the mission database.
export const DEMO_CREW: CrewMember[] = [
  {
    id: 'demo-crew-nova',
    name: 'Demo Commander Nova',
    callsign: 'NOVA-01',
    role: 'Commander',
    mission: 'ASTRAMED DEMONSTRATION MISSION',
    age: 38,
    sex: 'female',
    bloodType: 'Not specified',
    evaCount: 2,
    daysInOrbit: 46,
    baseline: { restingHeartRate: 60, bloodPressureSys: 118, bloodPressureDia: 76, weightKg: 68, vo2Max: 48, quadStrengthBaseline: 100 }
  },
  {
    id: 'demo-crew-orion',
    name: 'Demo Flight Engineer Orion',
    callsign: 'ORION-02',
    role: 'Flight Engineer',
    mission: 'ASTRAMED DEMONSTRATION MISSION',
    age: 41,
    sex: 'male',
    bloodType: 'Not specified',
    evaCount: 1,
    daysInOrbit: 46,
    baseline: { restingHeartRate: 64, bloodPressureSys: 122, bloodPressureDia: 78, weightKg: 82, vo2Max: 45, quadStrengthBaseline: 100 }
  }
];

const makeSeries = (crewId: string, crewIndex: number): HealthReading[] => {
  const rows: HealthReading[] = [];
  const metrics = [
    { parameter: 'heart_rate' as const, unit: 'bpm', base: crewIndex ? 68 : 64, amplitude: 5 },
    { parameter: 'blood_pressure_sys' as const, unit: 'mmHg', base: crewIndex ? 121 : 117, amplitude: 4 },
    { parameter: 'muscle_strength_quad' as const, unit: '% baseline', base: crewIndex ? 94 : 96, amplitude: 2 },
    { parameter: 'sleep_duration' as const, unit: 'hours', base: crewIndex ? 7.1 : 7.4, amplitude: 0.45 },
    { parameter: 'spo2' as const, unit: '%', base: crewIndex ? 98 : 97, amplitude: 1 },
    { parameter: 'body_weight' as const, unit: 'kg', base: crewIndex ? 81.6 : 67.8, amplitude: 0.35 },
    { parameter: 'resting_heart_rate' as const, unit: 'bpm', base: crewIndex ? 63 : 59, amplitude: 3 },
    { parameter: 'muscle_strength_bicep' as const, unit: '% baseline', base: crewIndex ? 95 : 97, amplitude: 2 }
  ];

  for (let day = 13; day >= 0; day--) {
    metrics.forEach((metric, metricIndex) => {
      const variation = Math.sin((13 - day + metricIndex * 1.7 + crewIndex) * 0.82) * metric.amplitude;
      const value = Number((metric.base + variation).toFixed(1));
      const timestamp = new Date(Date.now() - day * 86400000 - metricIndex * 900000).toISOString();
      rows.push({
        id: `demo-${crewId}-${metric.parameter}-${day}`,
        crewId,
        category: metric.parameter.startsWith('muscle') ? 'musculoskeletal' : metric.parameter.startsWith('sleep') ? 'general' : 'cardiovascular',
        parameter: metric.parameter,
        value,
        unit: metric.unit,
        timestamp,
        source: 'manual_entry',
        reportedSource: 'ASTRAMED synthetic demo generator',
        measurementMethod: 'Synthetic demonstration fixture — not measured by a sensor',
        status: 'unverified',
        notes: 'DEMO ONLY: fictional sample value for interface demonstration. Not a real astronaut measurement.'
      });
    });
  }
  return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const DEMO_READINGS: HealthReading[] = [
  ...makeSeries(DEMO_CREW[0].id, 0),
  ...makeSeries(DEMO_CREW[1].id, 1)
].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const DEMO_ALERTS: HealthAlert[] = [
  {
    id: 'demo-alert-hydration',
    crewId: DEMO_CREW[0].id,
    title: 'Example hydration follow-up',
    category: 'general',
    parameter: 'sleep_duration',
    currentValue: 6.1,
    thresholdValue: 7,
    unit: 'hours',
    severity: 'attention',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    explanation: 'This is a fictional alert used to demonstrate the alert interface. It is not generated from a real crew member or a validated clinical rule.',
    recommendedAction: 'Demo scenario only: review the sample record and demonstrate acknowledgement. Do not use as medical guidance.',
    source: 'manual_entry'
  }
];

export const DEMO_EVENTS: HealthEvent[] = [
  {
    id: 'demo-event-reading',
    crewId: DEMO_CREW[0].id,
    type: 'reading',
    title: 'Sample biometric batch received',
    description: 'Synthetic demonstration readings generated locally for the ASTRAMED interface walkthrough.',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    source: 'DEMO GENERATOR'
  },
  {
    id: 'demo-event-exercise',
    crewId: DEMO_CREW[1].id,
    type: 'countermeasure',
    title: 'Example exercise session logged',
    description: 'Fictional mission event to demonstrate timeline presentation; not a real exercise record.',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    source: 'DEMO GENERATOR'
  }
];
