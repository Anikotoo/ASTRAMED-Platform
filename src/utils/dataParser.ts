import {
  HealthReading,
  HealthCategory,
  HealthParameter,
  DataSource,
  MeasurementStatus
} from '../types/astramed';

export interface ParseValidationError {
  row: number;
  field: string;
  message: string;
  raw?: string;
}

export interface ParseResult {
  valid: HealthReading[];
  errors: ParseValidationError[];
  summary: {
    totalRows: number;
    validCount: number;
    errorCount: number;
    crewIds: string[];
    parameters: string[];
  };
}

const PARAMETER_MAP: Record<
  string,
  {
    category: HealthCategory;
    standardUnit: string;
    min: number;
    max: number;
  }
> = {
  heart_rate: { category: 'cardiovascular', standardUnit: 'bpm', min: 30, max: 240 },
  hr: { category: 'cardiovascular', standardUnit: 'bpm', min: 30, max: 240 },
  blood_pressure_sys: { category: 'cardiovascular', standardUnit: 'mmHg', min: 60, max: 240 },
  bp_sys: { category: 'cardiovascular', standardUnit: 'mmHg', min: 60, max: 240 },
  blood_pressure_dia: { category: 'cardiovascular', standardUnit: 'mmHg', min: 40, max: 140 },
  bp_dia: { category: 'cardiovascular', standardUnit: 'mmHg', min: 40, max: 140 },
  resting_heart_rate: { category: 'cardiovascular', standardUnit: 'bpm', min: 35, max: 150 },
  hrv: { category: 'cardiovascular', standardUnit: 'ms', min: 10, max: 250 },
  muscle_strength_quad: { category: 'musculoskeletal', standardUnit: '% baseline', min: 30, max: 180 },
  muscle_strength_bicep: { category: 'musculoskeletal', standardUnit: '% baseline', min: 30, max: 180 },
  muscle_mass: { category: 'musculoskeletal', standardUnit: 'kg', min: 30, max: 150 },
  bone_density_tscore: { category: 'musculoskeletal', standardUnit: 'T-score', min: -5.0, max: 3.0 },
  exercise_duration: { category: 'musculoskeletal', standardUnit: 'min', min: 0, max: 360 },
  body_weight: { category: 'general', standardUnit: 'kg', min: 35, max: 180 },
  weight: { category: 'general', standardUnit: 'kg', min: 35, max: 180 },
  sleep_duration: { category: 'general', standardUnit: 'hours', min: 0, max: 24 },
  sleep: { category: 'general', standardUnit: 'hours', min: 0, max: 24 },
  sleep_efficiency: { category: 'general', standardUnit: '%', min: 10, max: 100 },
  spo2: { category: 'general', standardUnit: '%', min: 60, max: 100 },
  radiation_cumulative: { category: 'environmental', standardUnit: 'mSv', min: 0, max: 1000 },
  cabin_co2: { category: 'environmental', standardUnit: 'mmHg', min: 0, max: 25 },
  cabin_pressure: { category: 'environmental', standardUnit: 'psi', min: 8, max: 18 }
};

export function normalizeParameterName(raw: string): HealthParameter | null {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'hr' || normalized === 'heart_rate') return 'heart_rate';

  if (
    normalized === 'bp_sys' ||
    normalized === 'blood_pressure_sys' ||
    normalized === 'systolic'
  ) return 'blood_pressure_sys';

  if (
    normalized === 'bp_dia' ||
    normalized === 'blood_pressure_dia' ||
    normalized === 'diastolic'
  ) return 'blood_pressure_dia';

  if (normalized === 'resting_hr' || normalized === 'resting_heart_rate') {
    return 'resting_heart_rate';
  }

  if (normalized === 'hrv') return 'hrv';

  if (
    normalized === 'quad_strength' ||
    normalized === 'muscle_strength_quad'
  ) return 'muscle_strength_quad';

  if (
    normalized === 'bicep_strength' ||
    normalized === 'muscle_strength_bicep'
  ) return 'muscle_strength_bicep';

  if (normalized === 'muscle_mass') return 'muscle_mass';

  if (
    normalized === 'bone_density' ||
    normalized === 'bone_density_tscore' ||
    normalized === 'dexa'
  ) return 'bone_density_tscore';

  if (normalized === 'exercise' || normalized === 'exercise_duration') {
    return 'exercise_duration';
  }

  if (normalized === 'weight' || normalized === 'body_weight') {
    return 'body_weight';
  }

  if (normalized === 'sleep' || normalized === 'sleep_duration') {
    return 'sleep_duration';
  }

  if (normalized === 'sleep_efficiency') return 'sleep_efficiency';

  if (normalized === 'spo2' || normalized === 'o2_sat') return 'spo2';

  if (
    normalized === 'radiation' ||
    normalized === 'radiation_cumulative'
  ) return 'radiation_cumulative';

  if (normalized === 'co2' || normalized === 'cabin_co2') return 'cabin_co2';

  if (normalized === 'pressure' || normalized === 'cabin_pressure') {
    return 'cabin_pressure';
  }

  return null;
}

function parseCSVRows(
  input: string
): { rows: string[][]; malformed: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if (
      (char === '\n' || char === '\r') &&
      !inQuotes
    ) {
      if (char === '\r' && input[i + 1] === '\n') {
        i++;
      }

      row.push(field.trim());

      if (row.some(cell => cell.length > 0)) {
        rows.push(row);
      }

      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    return { rows: [], malformed: true };
  }

  row.push(field.trim());

  if (row.some(cell => cell.length > 0)) {
    rows.push(row);
  }

  return { rows, malformed: false };
}

export function parseCSV(
  csvContent: string,
  datasetId: string = `ds_${Date.now()}`
): ParseResult {
  const parsedCSV = parseCSVRows(csvContent);
  const lines = parsedCSV.rows;
  const errors: ParseValidationError[] = [];
  const valid: HealthReading[] = [];

  if (parsedCSV.malformed) {
    return {
      valid: [],
      errors: [
        {
          row: 0,
          field: 'file',
          message: 'CSV contains an unclosed quoted field'
        }
      ],
      summary: {
        totalRows: 0,
        validCount: 0,
        errorCount: 1,
        crewIds: [],
        parameters: []
      }
    };
  }

  if (lines.length < 2) {
    return {
      valid: [],
      errors: [
        {
          row: 0,
          field: 'file',
          message: 'CSV file must have a header row and at least one data row'
        }
      ],
      summary: {
        totalRows: 0,
        validCount: 0,
        errorCount: 1,
        crewIds: [],
        parameters: []
      }
    };
  }

  const headers = lines[0].map(h => h.trim().toLowerCase());

  const crewIdIdx = headers.findIndex(
    h => h === 'crew_id' || h === 'crewid' || h === 'astronaut_id'
  );

  const paramIdx = headers.findIndex(
    h => h === 'parameter' || h === 'metric' || h === 'measurement'
  );

  const valueIdx = headers.findIndex(
    h => h === 'value' || h === 'reading'
  );

  const unitIdx = headers.findIndex(h => h === 'unit');

  const timestampIdx = headers.findIndex(
    h => h === 'timestamp' || h === 'date' || h === 'time'
  );

  const sourceIdx = headers.findIndex(h => h === 'source');

  const notesIdx = headers.findIndex(
    h => h === 'notes' || h === 'note'
  );

  if (crewIdIdx === -1 || paramIdx === -1 || valueIdx === -1) {
    errors.push({
      row: 1,
      field: 'header',
      message: 'Missing required columns: CSV must contain crew_id, parameter, and value'
    });

    return {
      valid: [],
      errors,
      summary: {
        totalRows: lines.length - 1,
        validCount: 0,
        errorCount: errors.length,
        crewIds: [],
        parameters: []
      }
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = lines[i];

    const rawCrewId = cols[crewIdIdx];
    const rawParam = cols[paramIdx];
    const rawValue = cols[valueIdx];

    if (!rawCrewId) {
      errors.push({
        row: rowNum,
        field: 'crew_id',
        message: 'Crew ID is required'
      });
      continue;
    }

    if (!rawParam) {
      errors.push({
        row: rowNum,
        field: 'parameter',
        message: 'Parameter name is required'
      });
      continue;
    }

    const param = normalizeParameterName(rawParam);

    if (!param) {
      errors.push({
        row: rowNum,
        field: 'parameter',
        message: `Unknown parameter '${rawParam}'`
      });
      continue;
    }

    const numValue = parseFloat(rawValue);

    if (isNaN(numValue) || !isFinite(numValue)) {
      errors.push({
        row: rowNum,
        field: 'value',
        message: `Invalid numeric value '${rawValue}'`
      });
      continue;
    }

    const paramMeta = PARAMETER_MAP[param];

    if (
      paramMeta &&
      (numValue < paramMeta.min || numValue > paramMeta.max)
    ) {
      errors.push({
        row: rowNum,
        field: 'value',
        message: `Value ${numValue} is outside physiological bounds (${paramMeta.min} to ${paramMeta.max} ${paramMeta.standardUnit})`
      });
      continue;
    }

    let timestamp = new Date().toISOString();

    if (timestampIdx !== -1 && cols[timestampIdx]) {
      const parsedDate = new Date(cols[timestampIdx]);

      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate.toISOString();
      } else {
        errors.push({
          row: rowNum,
          field: 'timestamp',
          message: `Invalid ISO date format '${cols[timestampIdx]}'`
        });
        continue;
      }
    }

    const unit =
      unitIdx !== -1 && cols[unitIdx]
        ? cols[unitIdx]
        : (paramMeta?.standardUnit || '');

    const source: DataSource =
      sourceIdx !== -1 && cols[sourceIdx]
        ? (cols[sourceIdx] as DataSource)
        : 'user_import';

    const notes =
      notesIdx !== -1 && cols[notesIdx]
        ? cols[notesIdx]
        : undefined;

    const reading: HealthReading = {
      id: `imp_${Date.now()}_${i}`,
      crewId: rawCrewId,
      category: paramMeta?.category || 'general',
      parameter: param,
      value: numValue,
      unit,
      timestamp,
      source,
      status: 'normal',
      notes,
      datasetId,
      isBuiltIn: false
    };

    valid.push(reading);
  }

  const crewSet = new Set<string>(valid.map(v => v.crewId));
  const paramSet = new Set<string>(valid.map(v => v.parameter));

  return {
    valid,
    errors,
    summary: {
      totalRows: lines.length - 1,
      validCount: valid.length,
      errorCount: errors.length,
      crewIds: Array.from(crewSet),
      parameters: Array.from(paramSet)
    }
  };
}

export function parseJSON(
  jsonContent: string,
  datasetId: string = `ds_${Date.now()}`
): ParseResult {
  const errors: ParseValidationError[] = [];
  const valid: HealthReading[] = [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonContent);
  } catch (err) {
    return {
      valid: [],
      errors: [
        {
          row: 0,
          field: 'json',
          message: `JSON syntax error: ${(err as Error).message}`
        }
      ],
      summary: {
        totalRows: 0,
        validCount: 0,
        errorCount: 1,
        crewIds: [],
        parameters: []
      }
    };
  }

  const records = Array.isArray(parsed)
    ? parsed
    : (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { readings?: unknown[] }).readings)
      )
      ? (parsed as { readings: unknown[] }).readings
      : [parsed];

  records.forEach((item, idx) => {
    const row = idx + 1;

    if (!item || typeof item !== 'object') {
      errors.push({
        row,
        field: 'record',
        message: 'Record must be an object'
      });
      return;
    }

    const rec = item as Record<string, unknown>;

    const crewId = String(
      rec.crewId || rec.crew_id || rec.astronautId || ''
    );

    const rawParam = String(rec.parameter || rec.metric || '');
    const rawVal = rec.value;

    if (!crewId) {
      errors.push({
        row,
        field: 'crewId',
        message: 'crewId is required'
      });
      return;
    }

    if (!rawParam) {
      errors.push({
        row,
        field: 'parameter',
        message: 'parameter is required'
      });
      return;
    }

    const param = normalizeParameterName(rawParam);

    if (!param) {
      errors.push({
        row,
        field: 'parameter',
        message: `Unknown parameter '${rawParam}'`
      });
      return;
    }

    const numValue = Number(rawVal);

    if (isNaN(numValue) || !isFinite(numValue)) {
      errors.push({
        row,
        field: 'value',
        message: `Invalid numeric value '${rawVal}'`
      });
      return;
    }

    const paramMeta = PARAMETER_MAP[param];

    if (
      paramMeta &&
      (numValue < paramMeta.min || numValue > paramMeta.max)
    ) {
      errors.push({
        row,
        field: 'value',
        message: `Value ${numValue} out of physiological bounds (${paramMeta.min}-${paramMeta.max})`
      });
      return;
    }

    let timestamp = new Date().toISOString();

    if (rec.timestamp) {
      const dt = new Date(String(rec.timestamp));

      if (!isNaN(dt.getTime())) {
        timestamp = dt.toISOString();
      }
    }

    const reading: HealthReading = {
      id: `imp_json_${Date.now()}_${idx}`,
      crewId,
      category: paramMeta?.category || 'general',
      parameter: param,
      value: numValue,
      unit: String(rec.unit || paramMeta?.standardUnit || ''),
      timestamp,
      source: (rec.source as DataSource) || 'user_import',
      status: (rec.status as MeasurementStatus) || 'normal',
      notes: rec.notes ? String(rec.notes) : undefined,
      datasetId,
      isBuiltIn: false
    };

    valid.push(reading);
  });

  const crewSet = new Set<string>(valid.map(v => v.crewId));
  const paramSet = new Set<string>(valid.map(v => v.parameter));

  return {
    valid,
    errors,
    summary: {
      totalRows: records.length,
      validCount: valid.length,
      errorCount: errors.length,
      crewIds: Array.from(crewSet),
      parameters: Array.from(paramSet)
    }
  };
}