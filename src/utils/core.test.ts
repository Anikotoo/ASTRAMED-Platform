import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, parseJSON, normalizeParameterName } from './dataParser';
import { evaluateAlerts, DEFAULT_MISSION_SETTINGS } from './alertEngine';
import { calculateTrend } from './trendCalculator';
import { HealthReading } from '../types/astramed';

test('normalizeParameterName recognizes common aliases', () => {
  assert.equal(normalizeParameterName('hr'), 'heart_rate');
  assert.equal(normalizeParameterName('Heart Rate'), 'heart_rate');
  assert.equal(normalizeParameterName('bp_sys'), 'blood_pressure_sys');
  assert.equal(normalizeParameterName('dexa'), 'bone_density_tscore');
  assert.equal(normalizeParameterName('invalid_metric_xyz'), null);
});

test('parseCSV correctly parses valid rows and catches invalid ones', () => {
  const sampleCSV = `crew_id,parameter,value,unit,timestamp
crew-01,heart_rate,72,bpm,2026-04-01T10:00:00Z
crew-01,blood_pressure_sys,125,mmHg,2026-04-01T10:00:00Z
crew-02,heart_rate,999,bpm,2026-04-01T10:00:00Z
,sleep_duration,7.5,hours,2026-04-01T10:00:00Z
crew-03,unknown_param,50,units,2026-04-01T10:00:00Z`;

  const result = parseCSV(sampleCSV, 'test_dataset');
  assert.equal(result.valid.length, 2);
  assert.equal(result.errors.length, 3);
  assert.equal(result.valid[0].crewId, 'crew-01');
  assert.equal(result.valid[0].datasetId, 'test_dataset');
});

test('parseCSV preserves quoted commas and escaped quotes', () => {
  const csv = `crew_id,parameter,value,unit,timestamp,notes
crew-01,heart_rate,72,bpm,2026-04-01T10:00:00Z,"steady, resting"
crew-02,heart_rate,75,bpm,2026-04-01T11:00:00Z,"said ""feeling good"""
`;
  const result = parseCSV(csv, 'quoted_dataset');
  assert.equal(result.valid.length, 2);
  assert.equal(result.valid[0].notes, 'steady, resting');
  assert.equal(result.valid[1].notes, 'said "feeling good"');
  assert.equal(result.errors.length, 0);
});

test('parseCSV supports quoted fields containing newlines', () => {
  const csv = `crew_id,parameter,value,unit,notes
crew-01,heart_rate,72,bpm,"line one
line two"
`;
  const result = parseCSV(csv, 'multiline_dataset');
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].notes, 'line one\nline two');
});

test('parseCSV reports unclosed quoted fields', () => {
  const result = parseCSV('crew_id,parameter,value,unit\ncrew-01,heart_rate,72,bpm,"unfinished');
  assert.equal(result.valid.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /unclosed quoted field/i);
});

test('parseJSON parses array of astronaut health records', () => {
  const json = JSON.stringify([
    { crewId: 'crew-01', parameter: 'spo2', value: 98, unit: '%' },
    { crewId: 'crew-02', parameter: 'spo2', value: 88, unit: '%' }
  ]);

  const result = parseJSON(json);
  assert.equal(result.valid.length, 2);
  assert.equal(result.errors.length, 0);
  assert.equal(result.valid[0].parameter, 'spo2');
});

test('alertEngine triggers critical and attention alerts based on thresholds', () => {
  const readings: HealthReading[] = [
    {
      id: 'r1',
      crewId: 'crew-01',
      category: 'cardiovascular',
      parameter: 'heart_rate',
      value: 130,
      unit: 'bpm',
      timestamp: '2026-04-02T12:00:00Z',
      source: 'biomed_telemetry',
      status: 'attention'
    },
    {
      id: 'r2',
      crewId: 'crew-02',
      category: 'general',
      parameter: 'spo2',
      value: 89,
      unit: '%',
      timestamp: '2026-04-02T12:00:00Z',
      source: 'biomed_telemetry',
      status: 'attention'
    },
    {
      id: 'r3',
      crewId: 'crew-03',
      category: 'musculoskeletal',
      parameter: 'muscle_strength_quad',
      value: 80,
      unit: '% baseline',
      timestamp: '2026-04-02T12:00:00Z',
      source: 'aRED_exercise',
      status: 'attention'
    }
  ];

  const alerts = evaluateAlerts(readings, DEFAULT_MISSION_SETTINGS);
  assert.equal(alerts.length, 3);
  assert.equal(alerts[0].severity, 'critical');
  assert.ok(alerts.some(a => a.parameter === 'muscle_strength_quad'));
});

test('trendCalculator calculates accurate statistics and data gaps', () => {
  const readings: HealthReading[] = [
    {
      id: 't1',
      crewId: 'crew-01',
      category: 'cardiovascular',
      parameter: 'heart_rate',
      value: 65,
      unit: 'bpm',
      timestamp: '2026-04-01T08:00:00Z',
      source: 'biomed_telemetry',
      status: 'normal'
    },
    {
      id: 't2',
      crewId: 'crew-01',
      category: 'cardiovascular',
      parameter: 'heart_rate',
      value: 70,
      unit: 'bpm',
      timestamp: '2026-04-02T08:00:00Z',
      source: 'biomed_telemetry',
      status: 'normal'
    },
    {
      id: 't3',
      crewId: 'crew-01',
      category: 'cardiovascular',
      parameter: 'heart_rate',
      value: 75,
      unit: 'bpm',
      timestamp: '2026-04-03T08:00:00Z',
      source: 'biomed_telemetry',
      status: 'normal'
    }
  ];

  const trend = calculateTrend(readings);
  assert.ok(trend !== null);
  assert.equal(trend.count, 3);
  assert.equal(trend.min, 65);
  assert.equal(trend.max, 75);
  assert.equal(trend.mean, 70);
  assert.equal(trend.median, 70);
  assert.equal(trend.first, 65);
  assert.equal(trend.latest, 75);
  assert.equal(trend.deltaAbsolute, 10);
  assert.equal(trend.direction, 'increasing');
  assert.equal(trend.hasDataGaps, false);
});
