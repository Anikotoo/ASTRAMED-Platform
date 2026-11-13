import React, { useState } from 'react';
import { ImportedDataset, HealthReading } from '../types/astramed';
import { parseCSV, parseJSON, ParseResult } from '../utils/dataParser';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Download, 
  Database,
  History,
  Info,
  ShieldAlert
} from 'lucide-react';

interface DataImporterProps {
  importedDatasets: ImportedDataset[];
  onImportComplete: () => void;
  onClearAllImported: () => Promise<void>;
  onDeleteDataset: (id: string) => Promise<void>;
}

export const DataImporter: React.FC<DataImporterProps> = ({
  importedDatasets,
  onImportComplete,
  onClearAllImported,
  onDeleteDataset
}) => {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [datasetName, setDatasetName] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Sample CSV template
  const SAMPLE_CSV = `crew_id,parameter,value,unit,timestamp,source,notes
crew-01,heart_rate,72,bpm,2026-05-04T08:00:00Z,biomed_telemetry,Morning baseline check
crew-01,blood_pressure_sys,122,mmHg,2026-05-04T08:30:00Z,clinical_exam,Sphygmomanometer cross-check
crew-02,heart_rate,105,bpm,2026-05-04T08:00:00Z,biomed_telemetry,Post-translation resting pulse
crew-02,muscle_strength_quad,81.5,% baseline,2026-05-04T15:00:00Z,aRED_exercise,Max voluntary isometric test
crew-03,sleep_duration,7.4,hours,2026-05-04T06:00:00Z,biomed_telemetry,Nominal sleep cycle
crew-04,spo2,97,%,2026-05-04T08:00:00Z,biomed_telemetry,Pulse oximetry check`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setDatasetName(file.name.replace(/\.[^/.]+$/, ''));
    const isJson = file.name.endsWith('.json');
    const isCsv = file.name.endsWith('.csv');
    const selectedFormat = isJson ? 'json' : 'csv';
    setFormat(selectedFormat);

    const reader = new FileReader();
    reader.onload = evt => {
      const text = String(evt.target?.result || '');
      setFileContent(text);
      validateData(text, selectedFormat);
    };
    reader.readAsText(file);
  };

  const validateData = (content: string, fmt: 'csv' | 'json') => {
    setStatusMessage(null);
    let result: ParseResult;
    if (fmt === 'csv') {
      result = parseCSV(content);
    } else {
      result = parseJSON(content);
    }
    setParseResult(result);
  };

  const handleLoadSample = () => {
    setFileName('astronaut_telemetry_sample.csv');
    setDatasetName('Expedition 75 Telemetry Sample');
    setFormat('csv');
    setFileContent(SAMPLE_CSV);
    validateData(SAMPLE_CSV, 'csv');
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: datasetName || fileName || 'Imported Dataset',
          filename: fileName || 'manual_entry',
          format,
          readings: parseResult.valid
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import dataset');
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${parseResult.valid.length} health telemetry records to persistent database.`
      });
      setFileContent('');
      setParseResult(null);
      setFileName('');
      setDatasetName('');
      onImportComplete();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error occurred during import.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>DATA INGESTION ENGINE • CSV &amp; JSON PARSER</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide mt-1">
              Astronaut Health Data Importer
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingest biometric datasets with strict physiological validation, error checking, and persistent server storage.
            </p>
          </div>

          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-800 text-xs font-mono transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Load Sample CSV</span>
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            : 'bg-rose-950/60 border-rose-800 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Import Interface: File Select & Validation Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload / Paste (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
            <h2 className="text-xs font-bold text-white font-mono uppercase">1. Select Data File</h2>

            {/* File Drop Area */}
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40">
              <UploadCloud className="w-8 h-8 text-cyan-400 mb-2" />
              <div className="text-xs font-semibold text-white">Click to browse or drop file</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Supports .CSV and .JSON formats</div>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Direct Paste / Edit Area */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Or Paste Raw Text:</span>
                <span className="uppercase">{format} Format</span>
              </div>
              <textarea
                value={fileContent}
                onChange={e => {
                  setFileContent(e.target.value);
                  validateData(e.target.value, format);
                }}
                placeholder="Paste CSV headers & rows or JSON array..."
                rows={8}
                className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Import Validation Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white font-mono uppercase">2. Validation Summary</h2>
              {parseResult && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">{parseResult.summary.validCount} Valid</span>
                  <span className="text-slate-600">•</span>
                  <span className={parseResult.summary.errorCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                    {parseResult.summary.errorCount} Errors
                  </span>
                </div>
              )}
            </div>

            {!parseResult ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Select a file or paste data to view real-time physiological validation breakdown.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Dataset metadata inputs */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="text-[10px] text-slate-400 block">DATASET NAME</label>
                    <input
                      type="text"
                      value={datasetName}
                      onChange={e => setDatasetName(e.target.value)}
                      placeholder="e.g. Expedition 75 Week 8 Biometrics"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">AFFECTED CREW PROFILES</label>
                    <div className="text-xs font-bold text-cyan-300 mt-1">
                      {parseResult.summary.crewIds.join(', ') || 'None identified'}
                    </div>
                  </div>
                </div>

                {/* Validation Errors Table if any */}
                {parseResult.errors.length > 0 && (
                  <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-lg text-xs font-mono text-amber-200">
                    <div className="font-bold mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Errors Found ({parseResult.errors.length} records rejected):</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
                      {parseResult.errors.map((err, i) => (
                        <div key={i} className="text-amber-300">
                          • Row {err.row}: [{err.field}] {err.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Records Preview List */}
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                    Valid Records Preview (First 4 of {parseResult.valid.length}):
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {parseResult.valid.slice(0, 4).map((rec, i) => (
                      <div key={i} className="p-2 bg-slate-950/60 border border-slate-800 rounded font-mono text-[11px] flex items-center justify-between">
                        <div>
                          <strong className="text-cyan-400">{rec.crewId}</strong> • {rec.parameter}
                        </div>
                        <div className="text-slate-300 font-bold">
                          {rec.value} {rec.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Import Button */}
                <button
                  onClick={handleConfirmImport}
                  disabled={parseResult.valid.length === 0 || isImporting}
                  className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isImporting ? 'SAVING TO DATABASE...' : `COMMIT ${parseResult.valid.length} RECORDS TO DATABASE`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dataset History & Deletion Console */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Imported Datasets History ({importedDatasets.length})</span>
            </h2>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              User-imported records stored persistently on server.
            </div>
          </div>

          {/* Remove Imported Data Button (CRITICAL: Preserves original built-in data!) */}
          {importedDatasets.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Remove Imported Data</span>
            </button>
          )}
        </div>

        {importedDatasets.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs font-mono">
            No user datasets imported yet. Default mission baselines and NASA scientific references are active.
          </div>
        ) : (
          <div className="space-y-3">
            {importedDatasets.map(dataset => (
              <div
                key={dataset.id}
                className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between gap-4 text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-white text-sm">{dataset.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    File: <span className="text-slate-300">{dataset.filename}</span> • {dataset.recordCount} records • Imported {new Date(dataset.importedAt).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-cyan-400 mt-1">
                    Crew affected: {dataset.crewIdsAffected.join(', ')}
                  </div>
                </div>

                <button
                  onClick={() => onDeleteDataset(dataset.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                  title="Delete this imported dataset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clearing Imported Data */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Confirm Data Purge</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove all <strong>user-imported datasets</strong>?
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-emerald-400 font-mono">
              <strong>Data Integrity Guarantee:</strong> Original NASA Research Library data, built-in mission baselines, and reference telemetry will NEVER be deleted.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowClearConfirm(false);
                  await onClearAllImported();
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold"
              >
                Purge Imported Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
