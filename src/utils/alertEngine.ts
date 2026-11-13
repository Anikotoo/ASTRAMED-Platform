import { HealthReading, HealthAlert, MissionSettings, AlertSeverity } from '../types/astramed';

export const DEFAULT_MISSION_SETTINGS: MissionSettings = {
  missionName: 'Astra-X ISS Expedition 75',
  missionStartDate: '2026-03-15T00:00:00.000Z',
  thresholds: {
    heartRateHigh: 110,
    heartRateLow: 45,
    systolicHigh: 140,
    systolicLow: 90,
    sleepMinHours: 6.0,
    spo2MinPercent: 94,
    muscleLossWarningPercent: 85 // if strength drops below 85% of preflight baseline
  },
  units: 'metric',
  autoRotate3D: true,
  activeGenderModel: 'male'
};

export function evaluateAlerts(
  readings: HealthReading[],
  settings: MissionSettings = DEFAULT_MISSION_SETTINGS
): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const { thresholds } = settings;

  // Group latest reading per crewId and parameter
  const latestMap = new Map<string, HealthReading>();
  for (const r of readings) {
    const key = `${r.crewId}_${r.parameter}`;
    const existing = latestMap.get(key);
    if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
      latestMap.set(key, r);
    }
  }

  for (const reading of latestMap.values()) {
    let severity: AlertSeverity | null = null;
    let title = '';
    let explanation = '';
    let recommendedAction = '';
    let thresholdValue = 0;

    switch (reading.parameter) {
      case 'heart_rate':
      case 'resting_heart_rate':
        if (reading.value > thresholds.heartRateHigh) {
          severity = reading.value > 125 ? 'critical' : 'attention';
          title = `Elevated Heart Rate (${reading.value} bpm)`;
          thresholdValue = thresholds.heartRateHigh;
          explanation = `Resting heart rate exceeds configured ceiling of ${thresholds.heartRateHigh} bpm. Possible cardiovascular deconditioning, cephalad fluid shift, or acute workload stress.`;
          recommendedAction = 'Verify fluid loading status, review sleep telemetry, and conduct resting 12-lead ECG biomedical check.';
        } else if (reading.value < thresholds.heartRateLow) {
          severity = 'attention';
          title = `Bradychardia Observed (${reading.value} bpm)`;
          thresholdValue = thresholds.heartRateLow;
          explanation = `Heart rate dropped below ${thresholds.heartRateLow} bpm limit. Verify autonomic regulatory response and sensor contact.`;
          recommendedAction = 'Confirm bio-monitor impedance and monitor orthostatic tolerance.';
        }
        break;

      case 'blood_pressure_sys':
        if (reading.value > thresholds.systolicHigh) {
          severity = reading.value > 160 ? 'critical' : 'attention';
          title = `Hypertensive Systolic Reading (${reading.value} mmHg)`;
          thresholdValue = thresholds.systolicHigh;
          explanation = `Systolic pressure exceeds mission ceiling of ${thresholds.systolicHigh} mmHg. Cephalic venous congestion and altered baroreflex sensitivity are common in microgravity.`;
          recommendedAction = 'Schedule manual sphygmomanometer cross-verification; review dietary sodium and cabin CO2 levels.';
        } else if (reading.value < thresholds.systolicLow) {
          severity = 'attention';
          title = `Hypotensive Systolic Reading (${reading.value} mmHg)`;
          thresholdValue = thresholds.systolicLow;
          explanation = `Systolic blood pressure measured below ${thresholds.systolicLow} mmHg. Risk of pre-syncopal episodes during egress or rapid posture change.`;
          recommendedAction = 'Ensure Lower Body Negative Pressure (LBNP) protocol compliance and oral rehydration.';
        }
        break;

      case 'spo2':
        if (reading.value < thresholds.spo2MinPercent) {
          severity = reading.value < 90 ? 'critical' : 'attention';
          title = `Low Oxygen Saturation (${reading.value}%)`;
          thresholdValue = thresholds.spo2MinPercent;
          explanation = `SpO2 level below nominal threshold of ${thresholds.spo2MinPercent}%. Potential ventilation imbalance or environmental cabin atmosphere anomaly.`;
          recommendedAction = 'Check environmental life support cabin pO2, inspect pulse oximeter probe placement, and evaluate airway comfort.';
        }
        break;

      case 'sleep_duration':
        if (reading.value < thresholds.sleepMinHours) {
          severity = 'attention';
          title = `Sleep Deprivation Indicator (${reading.value.toFixed(1)} hrs)`;
          thresholdValue = thresholds.sleepMinHours;
          explanation = `Rest cycle recorded less than ${thresholds.sleepMinHours} hours. Sleep debt in orbit degrades cognitive alertness and motor coordination.`;
          recommendedAction = 'Adjust crew work/rest cycle schedule, check sleeping compartment acoustic/light levels, and consider circadian light therapy.';
        }
        break;

      case 'muscle_strength_quad':
      case 'muscle_strength_bicep':
        if (reading.value < thresholds.muscleLossWarningPercent) {
          severity = reading.value < 75 ? 'critical' : 'attention';
          title = `Musculoskeletal Strength Loss (${reading.value.toFixed(1)}%)`;
          thresholdValue = thresholds.muscleLossWarningPercent;
          explanation = `Muscle group performance measured below ${thresholds.muscleLossWarningPercent}% of pre-flight baseline. Microgravity induces rapid postural muscle atrophy if countermeasure loading is insufficient.`;
          recommendedAction = 'Increase Advanced Resistive Exercise Device (aRED) resistive load cycle and consult Flight Surgeon.';
        }
        break;

      case 'bone_density_tscore':
        if (reading.value < -1.5) {
          severity = reading.value < -2.0 ? 'critical' : 'attention';
          title = `Bone Mineral Density Decline (T-Score ${reading.value})`;
          thresholdValue = -1.5;
          explanation = `Osteopenia range detected in weight-bearing skeleton. Microgravity osteoclastic resorption outpaces osteoblastic bone formation.`;
          recommendedAction = 'Review dietary calcium, vitamin D supplement regimen, and bisphosphonate countermeasure protocol.';
        }
        break;

      case 'cabin_co2':
        if (reading.value > 4.0) {
          severity = reading.value > 6.0 ? 'critical' : 'attention';
          title = `Elevated Cabin CO2 Partial Pressure (${reading.value} mmHg)`;
          thresholdValue = 4.0;
          explanation = `Cabin CO2 accumulation exceeds nominal orbit threshold. Higher partial pressure is strongly correlated with astronaut headaches and SANS symptoms.`;
          recommendedAction = 'Command ECLSS Carbon Dioxide Removal Assembly (CDRA) into high-scrub mode; deploy personal ventilation fan.';
        }
        break;
    }

    if (severity) {
      alerts.push({
        id: `alt_${reading.id}`,
        crewId: reading.crewId,
        title,
        category: reading.category,
        parameter: reading.parameter,
        currentValue: reading.value,
        thresholdValue,
        unit: reading.unit,
        severity,
        timestamp: reading.timestamp,
        explanation,
        recommendedAction,
        source: reading.source
      });
    }
  }

  // Sort critical alerts first, then most recent
  return alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}
