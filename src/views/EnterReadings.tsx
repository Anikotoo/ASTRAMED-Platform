import React, { useState } from 'react';
import { CrewMember, HealthCategory, HealthParameter, DataSource, HealthReading } from '../types/astramed';
import { 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Heart, 
  Dumbbell, 
  Moon, 
  Globe2,
  Calendar,
  Save,
  Info
} from 'lucide-react';

interface EnterReadingsProps {
  crewList: CrewMember[];
  selectedCrew: CrewMember | null;
  onReadingAdded: () => void;
}

export const EnterReadings: React.FC<EnterReadingsProps> = ({
  crewList,
  selectedCrew,
  onReadingAdded
}) => {
  const [crewId, setCrewId] = useState<string>(selectedCrew?.id || crewList[0]?.id || 'crew-01');
  const [category, setCategory] = useState<HealthCategory>('cardiovascular');
  const [parameter, setParameter] = useState<HealthParameter>('heart_rate');
  const [value, setValue] = useState<string>('72');
  const [unit, setUnit] = useState<string>('bpm');
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString().slice(0, 16));
  const [source, setSource] = useState<DataSource>('manual_entry');
  const [notes, setNotes] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Parameter configuration map
  const PARAM_CONFIG: Record<HealthParameter, { category: HealthCategory; defaultUnit: string; min: number; max: number; label: string }> = {
    heart_rate: { category: 'cardiovascular', defaultUnit: 'bpm', min: 35, max: 220, label: 'Heart Rate' },
    blood_pressure_sys: { category: 'cardiovascular', defaultUnit: 'mmHg', min: 70, max: 220, label: 'Systolic Blood Pressure' },
    blood_pressure_dia: { category: 'cardiovascular', defaultUnit: 'mmHg', min: 40, max: 130, label: 'Diastolic Blood Pressure' },
    resting_heart_rate: { category: 'cardiovascular', defaultUnit: 'bpm', min: 35, max: 120, label: 'Resting Heart Rate' },
    hrv: { category: 'cardiovascular', defaultUnit: 'ms', min: 10, max: 200, label: 'Heart Rate Variability (HRV)' },
    muscle_strength_quad: { category: 'musculoskeletal', defaultUnit: '% baseline', min: 40, max: 150, label: 'Quadriceps Muscle Strength' },
    muscle_strength_bicep: { category: 'musculoskeletal', defaultUnit: '% baseline', min: 40, max: 150, label: 'Biceps Muscle Strength' },
    muscle_mass: { category: 'musculoskeletal', defaultUnit: 'kg', min: 35, max: 140, label: 'Estimated Muscle Mass' },
    bone_density_tscore: { category: 'musculoskeletal', defaultUnit: 'T-score', min: -4.5, max: 2.5, label: 'Bone Mineral Density (DEXA)' },
    exercise_duration: { category: 'musculoskeletal', defaultUnit: 'min', min: 0, max: 240, label: 'Exercise Duration' },
    body_weight: { category: 'general', defaultUnit: 'kg', min: 40, max: 160, label: 'Body Mass' },
    sleep_duration: { category: 'general', defaultUnit: 'hours', min: 1, max: 16, label: 'Sleep Duration' },
    sleep_efficiency: { category: 'general', defaultUnit: '%', min: 20, max: 100, label: 'Sleep Efficiency' },
    spo2: { category: 'general', defaultUnit: '%', min: 70, max: 100, label: 'Oxygen Saturation (SpO2)' },
    radiation_cumulative: { category: 'environmental', defaultUnit: 'mSv', min: 0, max: 800, label: 'Cumulative Radiation Dose' },
    cabin_co2: { category: 'environmental', defaultUnit: 'mmHg', min: 0, max: 20, label: 'Cabin CO2 Partial Pressure' },
    cabin_pressure: { category: 'environmental', defaultUnit: 'psi', min: 9, max: 16, label: 'Cabin Atmospheric Pressure' }
  };

  const handleParamChange = (p: HealthParameter) => {
    setParameter(p);
    const cfg = PARAM_CONFIG[p];
    if (cfg) {
      setCategory(cfg.category);
      setUnit(cfg.defaultUnit);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessNotice(null);

    const numVal = parseFloat(value);
    if (isNaN(numVal)) {
      setValidationError('Please enter a valid numeric reading value.');
      return;
    }

    const cfg = PARAM_CONFIG[parameter];
    if (cfg && (numVal < cfg.min || numVal > cfg.max)) {
      setValidationError(`Value ${numVal} is outside nominal physiological limits (${cfg.min} - ${cfg.max} ${cfg.defaultUnit}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<HealthReading> = {
        crewId,
        category,
        parameter,
        value: numVal,
        unit,
        timestamp: new Date(timestamp).toISOString(),
        source,
        notes: notes.trim() || undefined
      };

      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to record biometric reading');
      }

      setSuccessNotice(`Successfully recorded ${cfg.label} (${numVal} ${unit}) for astronaut.`);
      setNotes('');
      onReadingAdded();
    } catch (err: any) {
      setValidationError(err.message || 'Error saving reading');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
          <span>BIOMEDICAL CONSOLE • MANUAL TELEMETRY LOGGING</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-wide mt-1">
          Enter Astronaut Health Reading
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Log verified clinical examinations, exercise ergometry parameters, and countermeasure metrics into persistent mission storage.
        </p>
      </div>

      {/* Notices */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs font-mono text-emerald-300 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {validationError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-xs font-mono text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 p-6 rounded-xl space-y-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Crew Member Selection */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
              Astronaut Profile *
            </label>
            <select
              value={crewId}
              onChange={e => setCrewId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            >
              {crewList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.callsign}) — {c.role}
                </option>
              ))}
            </select>
          </div>

          {/* Parameter Selection */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
              Health Parameter *
            </label>
            <select
              value={parameter}
              onChange={e => handleParamChange(e.target.value as HealthParameter)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-semibold"
            >
              {Object.entries(PARAM_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label} ({cfg.defaultUnit})
                </option>
              ))}
            </select>
          </div>

          {/* Reading Value */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
              Measured Value *
            </label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g. 72"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-cyan-500"
            />
          </div>

          {/* Measurement Unit */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
              Unit of Measure
            </label>
            <input
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 outline-none"
            />
          </div>

          {/* Timestamp */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
              Date &amp; Time (UTC) *
            </label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={e => setTimestamp(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-cyan-500"
            />
          </div>

          {/* Data Source */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
              Acquisition Source *
            </label>
            <select
              value={source}
              onChange={e => setSource(e.target.value as DataSource)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
            >
              <option value="manual_entry">Manual Crew Entry</option>
              <option value="clinical_exam">Clinical Medical Examination</option>
              <option value="biomed_telemetry">Bio-Monitor Continuous Telemetry</option>
              <option value="aRED_exercise">aRED Resistive Load Cycle</option>
              <option value="cycle_ergometer">CEVIS Cycle Ergometer</option>
            </select>
          </div>
        </div>

        {/* Clinical Notes */}
        <div>
          <label className="text-[11px] font-mono uppercase text-slate-300 block mb-1">
            Clinical Observations / Protocol Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Context regarding crew state, post-EVA recovery, fluid loading, or exercise resistance setting..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <div className="text-[11px] font-mono text-slate-500">
            Records are persisted to the ASTRAMED mission database.
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'PERSISTING...' : 'SAVE RECORD'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
