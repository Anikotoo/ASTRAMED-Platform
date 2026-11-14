
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import { evaluateAlerts } from './src/utils/alertEngine';
import { searchResearchStudies } from './src/utils/researchData';
import {
  HealthReading,
  ImportedDataset,
  HealthEvent,
  MissionSettings
} from './src/types/astramed';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.ASTRAMED_DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'astramed-db.json');
const SEED_DB_PATH = path.join(__dirname, 'data', 'astramed-db.json');

app.use(express.json({ limit: '10mb' }));

// ============================================================
// DATABASE
// ============================================================

interface AstramedDatabase {
  crew: any[];
  readings: HealthReading[];
  importedDatasets: ImportedDataset[];
  events: HealthEvent[];
  settings: Partial<MissionSettings> & Record<string, any>;
}

function emptyDatabase(): AstramedDatabase {
  return {
    crew: [],
    readings: [],
    importedDatasets: [],
    events: [],
    settings: {}
  };
}

function readDb(): AstramedDatabase {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });

      if (
        path.resolve(SEED_DB_PATH) !== path.resolve(DB_PATH) &&
        fs.existsSync(SEED_DB_PATH)
      ) {
        fs.copyFileSync(SEED_DB_PATH, DB_PATH);
      } else {
        fs.writeFileSync(
          DB_PATH,
          JSON.stringify(emptyDatabase(), null, 2),
          'utf-8'
        );
      }
    }

    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    return {
      ...emptyDatabase(),
      ...parsed,
      crew: Array.isArray(parsed.crew) ? parsed.crew : [],
      readings: Array.isArray(parsed.readings) ? parsed.readings : [],
      importedDatasets: Array.isArray(parsed.importedDatasets)
        ? parsed.importedDatasets
        : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      settings: parsed.settings || {}
    };
  } catch (error) {
    console.error('Database read failed:', error);
    return emptyDatabase();
  }
}

function writeDb(data: AstramedDatabase): boolean {
  try {
    const directory = path.dirname(DB_PATH);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const temporaryPath = `${DB_PATH}.tmp`;

    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    fs.renameSync(temporaryPath, DB_PATH);
    return true;
  } catch (error) {
    console.error('Database write failed:', error);
    return false;
  }
}

// ============================================================
// COMMON HELPERS
// ============================================================

function timestampValue(value: unknown): number {
  const parsed = new Date(String(value || '')).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestFirst<T extends { timestamp?: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp)
  );
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function safeText(value: unknown, maxLength = 3000): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function getCrewById(db: AstramedDatabase, crewId?: string) {
  if (!crewId) return undefined;
  return db.crew.find((member: any) => member.id === crewId);
}

function findCrewFromMessage(
  db: AstramedDatabase,
  message: string,
  activeCrewId?: string
) {
  const text = normalize(message);

  // Prefer an explicitly named crew member in the user's question.
  const namedCrew = db.crew.find((member: any) => {
    const name = normalize(member.name);
    const callsign = normalize(member.callsign);

    return (
      (name.length > 1 && text.includes(name)) ||
      (callsign.length > 1 && text.includes(callsign))
    );
  });

  if (namedCrew) return namedCrew;

  return (
    getCrewById(db, activeCrewId) ||
    db.crew[0]
  );
}

const PARAMETER_ALIASES: Record<string, string[]> = {
  heart_rate: ['heart rate', 'pulse', 'hr', 'bpm', 'resting heart'],
  blood_pressure_systolic: [
    'blood pressure',
    'systolic',
    'bp',
    'hypertension'
  ],
  blood_pressure_diastolic: ['diastolic'],
  spo2: ['spo2', 'oxygen saturation', 'blood oxygen'],
  muscle_strength_quad: ['quadriceps', 'quad strength', 'muscle strength'],
  sleep_duration: ['sleep', 'sleep duration', 'rest hours'],
  radiation_dose: ['radiation dose', 'radiation'],
  body_mass: ['body mass', 'weight']
};

function detectParameter(message: string, activeParam?: string) {
  const text = normalize(message);

  for (const [parameter, aliases] of Object.entries(PARAMETER_ALIASES)) {
    if (aliases.some(alias => text.includes(alias))) {
      return parameter;
    }
  }

  return activeParam || undefined;
}

function getCrewReadings(
  db: AstramedDatabase,
  crewId?: string,
  parameter?: string
): HealthReading[] {
  let readings = db.readings.filter(
    reading => !crewId || reading.crewId === crewId
  );

  if (parameter) {
    readings = readings.filter(
      reading => normalize(reading.parameter) === normalize(parameter)
    );
  }

  return newestFirst(readings);
}

function formatReading(reading: HealthReading): string {
  return [
    `${reading.parameter}: ${reading.value} ${reading.unit || ''}`.trim(),
    `Time: ${reading.timestamp || 'Timestamp unavailable'}`,
    `Source: ${reading.source || 'Unknown'}`,
    `Status: ${reading.status || 'Not classified'}`
  ].join(' | ');
}

function requestedCount(message: string, fallback = 5): number {
  const match = normalize(message).match(
    /(?:latest|last|show|display)\s+(\d{1,2})/
  );

  if (!match) return fallback;

  return Math.max(1, Math.min(20, Number(match[1])));
}

function getStudyContext(study: any) {
  if (!study || typeof study !== 'object') return null;

  return {
    title: safeText(study.title, 500),
    abstract: safeText(
      study.abstract || study.summary || study.description,
      5000
    ),
    authors: safeText(
      Array.isArray(study.authors)
        ? study.authors.join(', ')
        : study.authors,
      1000
    ),
    journal: safeText(study.journal || study.source, 500),
    year: safeText(study.year, 30),
    doi: safeText(study.doi, 300),
    url: safeText(study.url || study.link, 1000),
    category: safeText(study.category, 200)
  };
}

function getAlerts(db: AstramedDatabase) {
  try {
    return evaluateAlerts(db.readings || [], db.settings || {});
  } catch (error) {
    console.error('Alert evaluation failed:', error);
    return [];
  }
}

// ============================================================
// GEMINI CONFIGURATION â€” OPTIONAL
// ============================================================

const hasGeminiKey = Boolean(
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
);

let ai: GoogleGenAI | null = null;

if (hasGeminiKey) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });
}

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ============================================================
// SYSTEM STATUS
// ============================================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    geminiConfigured: hasGeminiKey,
    model: hasGeminiKey ? GEMINI_MODEL : 'offline-space-medicine-engine',
    storage: 'persistent-fs-json'
  });
});

// ============================================================
// CREW
// ============================================================

app.get('/api/crew', (_req: Request, res: Response) => {
  const db = readDb();
  res.json(db.crew);
});

// ============================================================
// HEALTH READINGS
// ============================================================

app.get('/api/readings', (req: Request, res: Response) => {
  const db = readDb();

  let readings = [...db.readings];

  const crewId = String(req.query.crewId || '');
  const category = String(req.query.category || '');
  const parameter = String(req.query.parameter || '');

  if (crewId) {
    readings = readings.filter(r => r.crewId === crewId);
  }

  if (category) {
    readings = readings.filter(
      r => normalize(r.category) === normalize(category)
    );
  }

  if (parameter) {
    readings = readings.filter(
      r => normalize(r.parameter) === normalize(parameter)
    );
  }

  res.json(newestFirst(readings));
});

app.post('/api/readings', (req: Request, res: Response) => {
  const reading = req.body as HealthReading;

  if (
    !reading ||
    !reading.crewId ||
    !reading.parameter ||
    reading.value === undefined ||
    reading.value === null
  ) {
    res.status(400).json({
      error: 'Missing required fields: crewId, parameter, value'
    });
    return;
  }

  const db = readDb();

  const newReading: HealthReading = {
    ...reading,
    id: reading.id || `rd_user_${Date.now()}`,
    timestamp: reading.timestamp || new Date().toISOString(),
    source: reading.source || 'manual_entry',
    status: reading.status || 'normal',
    isBuiltIn: false
  };

  db.readings.push(newReading);

  const event: HealthEvent = {
    id: `ev_${Date.now()}`,
    crewId: newReading.crewId,
    type: 'reading',
    title: `New ${newReading.parameter.replace(/_/g, ' ')} reading`,
    description:
      `Recorded ${newReading.value} ${newReading.unit || ''} ` +
      `via ${newReading.source}`,
    timestamp: newReading.timestamp,
    severity:
      newReading.status === 'critical'
        ? 'critical'
        : newReading.status === 'attention'
          ? 'warning'
          : 'normal',
    source: newReading.source
  };

  db.events.unshift(event);

  if (!writeDb(db)) {
    res.status(500).json({ error: 'Could not save reading' });
    return;
  }

  res.status(201).json(newReading);
});

// ============================================================
// DATA IMPORT
// ============================================================

app.post('/api/import', (req: Request, res: Response) => {
  const {
    datasetName,
    filename,
    format,
    readings
  } = req.body as {
    datasetName?: string;
    filename?: string;
    format?: 'csv' | 'json';
    readings?: HealthReading[];
  };

  if (!Array.isArray(readings) || readings.length === 0) {
    res.status(400).json({
      error: 'No valid readings provided in import payload'
    });
    return;
  }

  const invalid = readings.filter(
    r =>
      !r ||
      !r.crewId ||
      !r.parameter ||
      r.value === undefined ||
      r.value === null
  );

  if (invalid.length > 0) {
    res.status(400).json({
      error: 'Some imported readings are missing required fields',
      invalidCount: invalid.length
    });
    return;
  }

  const db = readDb();
  const datasetId = `ds_${Date.now()}`;

  const crewIds = Array.from(
    new Set(readings.map(r => r.crewId))
  );

  const parameters = Array.from(
    new Set(readings.map(r => r.parameter))
  );

  const taggedReadings = readings.map((reading, index) => ({
    ...reading,
    id: `imp_${Date.now()}_${index}`,
    datasetId,
    isBuiltIn: false
  }));

  const dataset: ImportedDataset = {
    id: datasetId,
    name:
      datasetName ||
      filename ||
      `Import_${new Date().toLocaleDateString()}`,
    filename: filename || 'uploaded_data',
    format: format || 'csv',
    recordCount: taggedReadings.length,
    importedAt: new Date().toISOString(),
    crewIdsAffected: crewIds,
    parametersIncluded: parameters
  };

  db.readings.push(...taggedReadings);
  db.importedDatasets.unshift(dataset);

  db.events.unshift({
    id: `ev_${Date.now()}`,
    type: 'import',
    title: `Dataset Imported: ${dataset.name}`,
    description:
      `Stored ${taggedReadings.length} records across ` +
      `${crewIds.length} crew profiles.`,
    timestamp: dataset.importedAt,
    severity: 'normal',
    source: 'Data Importer'
  } as HealthEvent);

  if (!writeDb(db)) {
    res.status(500).json({ error: 'Could not save imported dataset' });
    return;
  }

  res.status(201).json({
    success: true,
    dataset,
    importedCount: taggedReadings.length
  });
});

app.get('/api/datasets', (_req: Request, res: Response) => {
  const db = readDb();
  res.json(db.importedDatasets);
});

app.delete('/api/datasets/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = readDb();

  const index = db.importedDatasets.findIndex(
    dataset => dataset.id === id
  );

  if (index === -1) {
    res.status(404).json({ error: 'Dataset not found' });
    return;
  }

  const dataset = db.importedDatasets[index];
  db.importedDatasets.splice(index, 1);

  const initialCount = db.readings.length;

  db.readings = db.readings.filter(
    reading => reading.datasetId !== id
  );

  const deletedCount = initialCount - db.readings.length;

  if (!writeDb(db)) {
    res.status(500).json({ error: 'Could not delete dataset' });
    return;
  }

  res.json({
    success: true,
    message:
      `Removed ${dataset.name} and ${deletedCount} imported readings.`
  });
});

app.delete('/api/datasets', (_req: Request, res: Response) => {
  const db = readDb();

  const initialCount = db.readings.length;

  // Preserve all baseline records and records not tied to an import.
  db.readings = db.readings.filter(
    reading => reading.isBuiltIn === true || !reading.datasetId
  );

  const deletedReadings = initialCount - db.readings.length;
  const deletedDatasets = db.importedDatasets.length;

  db.importedDatasets = [];

  db.events.unshift({
    id: `ev_${Date.now()}`,
    type: 'import',
    title: 'Imported Data Cleared',
    description:
      `Removed ${deletedDatasets} datasets and ${deletedReadings} readings.`,
    timestamp: new Date().toISOString(),
    severity: 'normal',
    source: 'Data Importer'
  } as HealthEvent);

  if (!writeDb(db)) {
    res.status(500).json({ error: 'Could not clear imported data' });
    return;
  }

  res.json({
    success: true,
    deletedDatasets,
    deletedReadings,
    message: 'Imported data cleared. Baseline records were retained.'
  });
});

// ============================================================
// ALERTS AND EVENTS
// ============================================================

app.get('/api/alerts', (_req: Request, res: Response) => {
  const db = readDb();
  res.json(getAlerts(db));
});

app.get('/api/events', (_req: Request, res: Response) => {
  const db = readDb();
  res.json(db.events);
});

// ============================================================
// SETTINGS
// ============================================================

app.get('/api/settings', (_req: Request, res: Response) => {
  const db = readDb();
  res.json(db.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  const newSettings = req.body as Partial<MissionSettings>;
  const db = readDb();

  db.settings = {
    ...db.settings,
    ...newSettings
  };

  if (!writeDb(db)) {
    res.status(500).json({ error: 'Could not save settings' });
    return;
  }

  res.json(db.settings);
});

// ============================================================
// RESEARCH SEARCH
// ============================================================

app.get('/api/research/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '');
    const category = String(req.query.category || 'All');
    const studyType = String(req.query.studyType || 'All');

    const results = await searchResearchStudies(
      query,
      category,
      studyType
    );

    res.json(results);
  } catch (error) {
    console.error('Research search failed:', error);
    res.status(500).json({
      error: 'Research search is currently unavailable'
    });
  }
});

// ============================================================
// OFFLINE SPACE MEDICINE ENGINE
// ============================================================

function buildOfflineAnswer(
  message: string,
  db: AstramedDatabase,
  crewMember: any,
  selectedStudy: any,
  activeSection?: string,
  activeParam?: string
) {
  const lower = normalize(message);
  const crewName = crewMember?.name || 'the selected crew member';
  const crewId = crewMember?.id;

  const readings = getCrewReadings(db, crewId);
  const alerts = getAlerts(db);
  const crewAlerts = alerts.filter(
    (alert: any) => alert.crewId === crewId
  );

  const parameter = detectParameter(message, activeParam);
  const parameterReadings = parameter
    ? getCrewReadings(db, crewId, parameter)
    : [];

  const study = getStudyContext(selectedStudy);

  let text = '';
  let suggestedAction: any = undefined;
  let evidenceType = 'database_observation';

  // Navigation commands.
  if (
    lower.includes('navigate') ||
    lower.includes('open') ||
    lower.includes('show') ||
    lower.includes('go to') ||
    lower.includes('take me')
  ) {
    if (lower.includes('trend')) {
      text = `Opening Health Trends for ${crewName}.`;
      suggestedAction = {
        type: 'navigate',
        targetSection: 'trends',
        label: 'Open Health Trends',
        params: { crewId }
      };
    } else if (
      lower.includes('research') ||
      lower.includes('study') ||
      lower.includes('paper')
    ) {
      text = 'Opening the Research Library.';
      suggestedAction = {
        type: 'navigate',
        targetSection: 'research',
        label: 'Open Research Library'
      };
    } else if (
      lower.includes('reading') ||
      lower.includes('enter') ||
      lower.includes('log')
    ) {
      text = 'Opening the Enter Readings console.';
      suggestedAction = {
        type: 'navigate',
        targetSection: 'enter_readings',
        label: 'Open Enter Readings'
      };
    } else if (
      lower.includes('body') ||
      lower.includes('muscle') ||
      lower.includes('3d')
    ) {
      text = 'Opening the Crew & Body Monitor.';
      suggestedAction = {
        type: 'navigate',
        targetSection: 'crew_body',
        label: 'Open Body Monitor'
      };
    }
  }

  // Selected study questions.
  if (!text && study && (
    lower.includes('study') ||
    lower.includes('article') ||
    lower.includes('research') ||
    lower.includes('clinical significance') ||
    lower.includes('countermeasure') ||
    lower.includes('findings') ||
    lower.includes('abstract') ||
    lower.includes('explain')
  )) {
    evidenceType = 'research_abstract';

    if (!study.abstract) {
      text =
        `**Selected study:** ${study.title || 'Untitled study'}\n\n` +
        'The selected study metadata was received, but its abstract ' +
        'or summary is missing. I cannot responsibly describe its ' +
        'findings or claim that it supports a countermeasure.\n\n' +
        'Please check whether the Research Library has retrieved the ' +
        'full abstract.';
    } else {
      text =
        `**Selected research study**\n\n` +
        `**Title:** ${study.title || 'Title unavailable'}\n` +
        `**Authors:** ${study.authors || 'Not supplied'}\n` +
        `**Year:** ${study.year || 'Not supplied'}\n` +
        `**Source:** ${study.journal || 'Not supplied'}\n\n` +
        `**What the supplied abstract says:**\n${study.abstract}\n\n` +
        '**Clinical interpretation:** The abstract can help identify ' +
        'potentially relevant physiological mechanisms and research ' +
        'questions. It does not, by itself, establish that a particular ' +
        'countermeasure is effective or appropriate for an individual ' +
        'astronaut. The full study, population, methods and limitations ' +
        'must be reviewed before drawing protocol conclusions.\n\n' +
        `**Evidence boundary:** This response is based on the abstract ` +
        `and metadata supplied by the Research Library, not an independent ` +
        `verification of the full paper.`;
    }

    if (study.url) {
      text += `\n\n**Source link:** ${study.url}`;
    }

  // Historical readings and latest readings.
  } else if (!text && (
    lower.includes('latest') ||
    lower.includes('last') ||
    lower.includes('history') ||
    lower.includes('historical') ||
    lower.includes('readings') ||
    lower.includes('measurements')
  )) {
    const count = requestedCount(message, 5);
    const selectedReadings = parameter
      ? parameterReadings
      : readings;

    evidenceType = 'telemetry_observation';

    if (selectedReadings.length === 0) {
      text =
        `No stored readings were found for ${crewName}` +
        `${parameter ? ` for ${parameter}` : ''}. ` +
        'I will not substitute example or estimated values.';
    } else {
      text =
        `**Stored readings for ${crewName}**\n\n` +
        selectedReadings
          .slice(0, count)
          .map((reading, index) =>
            `${index + 1}. ${formatReading(reading)}`
          )
          .join('\n\n') +
        '\n\nThese are stored records, not a diagnosis. ' +
        'The timestamps and acquisition sources are shown where available.';
    }

  // Crew comparison.
  } else if (!text && (
    lower.includes('compare') ||
    lower.includes('comparison')
  )) {
    evidenceType = 'telemetry_comparison';

    const comparison = db.crew.map((member: any) => {
      const memberReadings = getCrewReadings(
        db,
        member.id,
        parameter
      );

      const latest = memberReadings[0];

      return latest
        ? `${member.name}: ${formatReading(latest)}`
        : `${member.name}: No matching stored reading`;
    });

    text =
      `**Crew comparison${parameter ? ` â€” ${parameter}` : ''}**\n\n` +
      comparison.join('\n\n') +
      '\n\nOnly the latest stored matching reading for each crew member ' +
      'is shown. This is not a clinical ranking.';
  
  // Active alerts.
  } else if (!text && (
    lower.includes('alert') ||
    lower.includes('warning') ||
    lower.includes('critical') ||
    lower.includes('elevated')
  )) {
    evidenceType = 'alert_evaluation';

    if (crewAlerts.length === 0) {
      text = `No active alerts are currently returned for ${crewName}.`;
    } else {
      text =
        `**Active alerts for ${crewName}**\n\n` +
        crewAlerts.map((alert: any, index: number) =>
          `${index + 1}. **${alert.title || 'Alert'}**\n` +
          `Severity: ${alert.severity || 'Not supplied'}\n` +
          `Explanation: ${alert.explanation || alert.description || 'No explanation supplied'}`
        ).join('\n\n');
    }

  // Parameter-specific telemetry.
  } else if (!text && parameter) {
    evidenceType = 'telemetry_observation';

    if (parameterReadings.length === 0) {
      text =
        `No stored ${parameter.replace(/_/g, ' ')} readings were ` +
        `found for ${crewName}.`;
    } else {
      const latest = parameterReadings[0];

      text =
        `**${parameter.replace(/_/g, ' ')} â€” ${crewName}**\n\n` +
        `Latest stored measurement:\n${formatReading(latest)}\n\n` +
        `Stored records available for this parameter: ` +
        `${parameterReadings.length}.\n\n` +
        'This is a record summary. Clinical interpretation requires ' +
        'appropriate reference ranges, measurement conditions and ' +
        'Flight Surgeon review.';
    }

  // General physiology explanation.
  } else if (!text && (
    lower.includes('microgravity') ||
    lower.includes('atrophy') ||
    lower.includes('physiology') ||
    lower.includes('why')
  )) {
    evidenceType = 'general_scientific_explanation';

    text =
      '**Spaceflight physiology â€” general explanation**\n\n' +
      'Microgravity changes the mechanical loading experienced by ' +
      'the human body. Reduced loading can contribute to loss of ' +
      'muscle strength and bone mass, while fluid redistribution ' +
      'toward the upper body can affect cardiovascular adaptation.\n\n' +
      'These are general scientific mechanisms. They are not proof ' +
      'that a particular crew member is experiencing a specific ' +
      'condition. To assess an individual, the assistant must use ' +
      'that personâ€™s actual stored measurements and relevant research.';
  
  } else if (!text) {
    evidenceType = 'mission_context';

    text =
      `**ASTRAMED Offline Space Medicine Engine**\n\n` +
      `Selected crew member: ${crewName}\n` +
      `Active section: ${activeSection || 'Mission Overview'}\n` +
      `Stored readings for this crew member: ${readings.length}\n` +
      `Active alerts for this crew member: ${crewAlerts.length}\n\n` +
      'I can summarise stored readings, show recent history, list ' +
      'active alerts, compare crew measurements or explain a selected ' +
      'research abstract when the frontend supplies its content.\n\n' +
      '**Limitation:** This offline engine uses deterministic rules. ' +
      'It is not a general-purpose language model or a medical diagnostic system.';
  }

  return {
    text,
    suggestedAction,
    evidenceType
  };
}

// ============================================================
// LOCAL OLLAMA RUNTIME BRIDGE
// ============================================================

const OLLAMA_BASE_URL = (() => {
  const configured = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  try {
    const url = new URL(configured);
    const allowedHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
    if (url.protocol !== 'http:' || !allowedHosts.has(url.hostname)) {
      console.warn('OLLAMA_HOST must be a loopback HTTP URL; using localhost.');
      return 'http://127.0.0.1:11434';
    }
    return url.origin;
  } catch {
    return 'http://127.0.0.1:11434';
  }
})();

async function ollamaFetch(endpoint: string, init?: RequestInit) {
  return fetch(`${OLLAMA_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    signal: init?.signal || AbortSignal.timeout(120_000)
  });
}

app.get('/api/local-ai/status', async (_req: Request, res: Response) => {
  try {
    const response = await ollamaFetch('/api/tags', { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      res.json({ provider: 'ollama', state: 'error', message: `Ollama returned HTTP ${response.status}` });
      return;
    }
    const payload = await response.json() as { models?: Array<{ name: string }> };
    const models = Array.isArray(payload.models) ? payload.models : [];
    res.json({
      provider: 'ollama',
      state: models.length ? 'ready' : 'model-missing',
      models: models.map(model => model.name),
      message: models.length ? 'Local Ollama runtime is reachable.' : 'Ollama is running, but no models are installed.'
    });
  } catch {
    res.json({
      provider: 'ollama',
      state: 'unavailable',
      models: [],
      message: 'Ollama is not reachable on this device. Start Ollama locally to use on-device AI.'
    });
  }
});

app.get('/api/local-ai/models', async (_req: Request, res: Response) => {
  try {
    const response = await ollamaFetch('/api/tags', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      res.status(502).json({ error: `Ollama returned HTTP ${response.status}` });
      return;
    }
    const payload = await response.json() as { models?: Array<{ name: string; size?: number; details?: { family?: string; quantization_level?: string } }> };
    res.json((payload.models || []).map(model => ({
      id: model.name,
      displayName: model.name,
      family: model.details?.family || 'unknown',
      quantization: model.details?.quantization_level,
      sizeBytes: model.size,
      isDownloaded: true,
      supportedPlatforms: ['desktop']
    })));
  } catch {
    res.status(503).json({ error: 'Local Ollama runtime is unavailable.' });
  }
});

app.post('/api/local-ai/chat', async (req: Request, res: Response) => {
  const model = String(req.body?.model || '').trim();
  const messages = req.body?.messages;
  if (!model || !Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    res.status(400).json({ error: 'A model and between 1 and 40 chat messages are required.' });
    return;
  }
  const safeMessages = messages.filter((item: any) =>
    item && ['system', 'user', 'assistant'].includes(item.role) &&
    typeof item.content === 'string' && item.content.length <= 12000
  );
  if (safeMessages.length !== messages.length) {
    res.status(400).json({ error: 'Chat messages contain an invalid role or content.' });
    return;
  }
  try {
    const response = await ollamaFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: safeMessages,
        stream: false,
        options: {
          temperature: Math.min(1, Math.max(0, Number(req.body?.temperature ?? 0.2)))
        }
      }),
      signal: AbortSignal.timeout(180_000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(502).json({ error: payload.error || `Ollama returned HTTP ${response.status}` });
      return;
    }
    res.json({
      text: payload.message?.content || '',
      modelId: model,
      provider: 'ollama',
      durationMs: typeof payload.total_duration === 'number' ? Math.round(payload.total_duration / 1e6) : undefined
    });
  } catch {
    res.status(503).json({ error: 'Local AI request failed. Check that Ollama and the selected model are available.' });
  }
});

// ============================================================
// AI ASSISTANT CHAT
// ============================================================

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      activeSection,
      activeCrewId,
      activeParam,
      selectedStudy
    } = req.body as {
      message: string;
      activeSection?: string;
      activeCrewId?: string;
      activeParam?: string;
      selectedStudy?: any;
    };

    if (!message || !String(message).trim()) {
      res.status(400).json({
        error: 'Message cannot be empty'
      });
      return;
    }

    const db = readDb();

    const crewMember = findCrewFromMessage(
      db,
      message,
      activeCrewId
    );

    const readings = getCrewReadings(
      db,
      crewMember?.id
    );

    const alerts = getAlerts(db);

    const crewAlerts = alerts.filter(
      (alert: any) => alert.crewId === crewMember?.id
    );

    const study = getStudyContext(selectedStudy);

    // Structured evidence sent to Gemini when it is configured.
    if (ai) {
      try {
        const systemInstruction = `
You are ASTRAMED, an astronaut health-monitoring decision-support prototype.

You must follow these rules:

1. Never invent health readings, timestamps, alerts, research findings,
   authors, publication years, DOI values or citations.
2. Use only the supplied database context for claims about this mission.
3. Clearly distinguish:
   - TELEMETRY OBSERVATION: actual stored measurement.
   - ALERT EVALUATION: output returned by the application's alert engine.
   - RESEARCH ABSTRACT FINDING: information explicitly present in the supplied abstract.
   - GENERAL SCIENTIFIC EXPLANATION: general background knowledge.
4. If requested data is missing, say it is missing.
5. Do not diagnose or prescribe treatment.
6. Do not claim that a research abstract proves clinical effectiveness.
7. Do not treat an alert as a confirmed medical diagnosis.
8. Use the selected crew member and selected research study when provided.
9. Do not confuse measurements from different crew members.
10. Keep answers concise, structured and transparent.

NAVIGATION:
If navigation is requested, append exactly one action tag:
<<<ACTION:{"type":"navigate","targetSection":"trends","params":{}}>>>

Only use supported targets:
overview, crew_body, trends, ai_assistant, research, enter_readings.

MISSION CONTEXT:
${JSON.stringify({
  activeSection: activeSection || 'overview',
  activeCrew: crewMember
    ? {
        id: crewMember.id,
        name: crewMember.name,
        callsign: crewMember.callsign,
        role: crewMember.role
      }
    : null,
  selectedParameter: activeParam || null,
  readings: readings.slice(0, 30).map(formatReading),
  alerts: crewAlerts.map((alert: any) => ({
    title: alert.title,
    severity: alert.severity,
    explanation: alert.explanation,
    category: alert.category
  })),
  selectedStudy: study
})}
`;

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: String(message),
          config: {
            systemInstruction,
            temperature: 0.2
          } as any
        });

        const responseText =
          response.text ||
          'The AI service returned an empty response.';

        let cleanText = responseText;
        let suggestedAction: any = undefined;

        const actionMatch = responseText.match(
          /<<<ACTION:(.*?)>>>/s
        );

        if (actionMatch) {
          try {
            const parsedAction = JSON.parse(actionMatch[1]);

            const allowedTargets = [
              'overview',
              'crew_body',
              'trends',
              'ai_assistant',
              'research',
              'enter_readings'
            ];

            if (allowedTargets.includes(parsedAction.targetSection)) {
              suggestedAction = {
                ...parsedAction,
                label:
                  parsedAction.label ||
                  `Open ${parsedAction.targetSection}`
              };
            }

            cleanText = responseText
              .replace(actionMatch[0], '')
              .trim();
          } catch {
            console.warn('Invalid AI action tag ignored.');
          }
        }

        res.json({
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: cleanText,
          timestamp: new Date().toISOString(),
          suggestedAction,
          evidenceType: 'gemini_response',
          isLiveGemini: true
        });

        return;
      } catch (error) {
        console.error(
          'Gemini request failed; using offline engine:',
          error
        );
      }
    }

    const offlineResult = buildOfflineAnswer(
      String(message),
      db,
      crewMember,
      selectedStudy,
      activeSection,
      activeParam
    );

    res.json({
      id: `ai_${Date.now()}`,
      sender: 'assistant',
      text: offlineResult.text,
      timestamp: new Date().toISOString(),
      suggestedAction: offlineResult.suggestedAction,
      evidenceType: offlineResult.evidenceType,
      isLiveGemini: false,
      note: hasGeminiKey
        ? 'Gemini was unavailable for this request. Offline engine used.'
        : 'Running in offline Space Medicine Engine mode. No Gemini API key is configured.'
    });

  } catch (error) {
    console.error('AI chat endpoint failed:', error);

    res.status(500).json({
      error: 'AI assistant request failed',
      message: 'The server could not process this request.'
    });
  }
});

// ============================================================
// AI HEALTH BRIEFING â€” DATABASE-GROUNDED
// ============================================================

app.post('/api/ai/briefing', async (_req: Request, res: Response) => {
  try {
    const db = readDb();
    const alerts = getAlerts(db);

    const criticals = alerts.filter(
      (alert: any) => alert.severity === 'critical'
    );

    const attentions = alerts.filter(
      (alert: any) => alert.severity === 'attention'
    );

    const crewSummary = db.crew.map((member: any) => {
      const readings = getCrewReadings(db, member.id);

      const memberAlerts = alerts.filter(
        (alert: any) => alert.crewId === member.id
      );

      return {
        crewId: member.id,
        crewName: member.name,
        role: member.role,
        readingCount: readings.length,
        latestReadings: readings.slice(0, 5).map(formatReading),
        activeAlerts: memberAlerts.map((alert: any) => ({
          title: alert.title,
          severity: alert.severity,
          explanation: alert.explanation
        }))
      };
    });

    const briefing = {
      generatedAt: new Date().toISOString(),
      missionName:
        db.settings?.missionName ||
        db.settings?.missionIdentifier ||
        'Mission name not configured',
      monitoredCrewCount: db.crew.length,
      activeAlertsSummary: {
        total: alerts.length,
        criticalCount: criticals.length,
        attentionCount: attentions.length,
        topAlerts: alerts.slice(0, 5)
      },
      crewSummary,
      limitations:
        'This briefing summarises records stored in the ASTRAMED ' +
        'database and alerts returned by the configured alert engine. ' +
        'It is not a diagnosis or an independently validated medical assessment.'
    };

    res.json(briefing);
  } catch (error) {
    console.error('Briefing generation failed:', error);

    res.status(500).json({
      error: 'Could not generate mission briefing'
    });
  }
});

// ============================================================
// VITE / PRODUCTION STATIC FILES
// ============================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');

    const vite = await createServer({
      server: {
        middlewareMode: true
      },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(
        path.join(__dirname, 'dist', 'index.html')
      );
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `ASTRAMED mission server running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch(error => {
  console.error('ASTRAMED server failed to start:', error);
  process.exit(1);
});


