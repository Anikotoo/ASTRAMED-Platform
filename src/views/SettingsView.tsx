
import React, { useState } from 'react';
import { MissionSettings } from '../types/astramed';
import {
  Settings,
  Sliders,
  Save,
  CheckCircle2,
  Database,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface SettingsViewProps {
  settings: MissionSettings;
  onUpdateSettings: (newSettings: Partial<MissionSettings>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [formData, setFormData] = useState<MissionSettings>(settings);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleThresholdChange = (key: keyof MissionSettings['thresholds'], val: number) => {
    setFormData(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: val
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onUpdateSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span>MISSION CONTROL CONFIGURATION • CLINICAL LIMITS</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-wide mt-1">
          Platform &amp; Clinical Threshold Settings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure rule-based physiological alert triggers, mission parameters, and biomedical measurement standards.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Mission parameters and alert thresholds updated persistently.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Physiological Alert Limits */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Configurable Physiological Alert Thresholds</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Biomedical Rule Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Heart Rate High Ceiling (bpm)</label>
              <input
                type="number"
                value={formData.thresholds.heartRateHigh}
                onChange={e => handleThresholdChange('heartRateHigh', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Heart Rate Low Floor (bpm)</label>
              <input
                type="number"
                value={formData.thresholds.heartRateLow}
                onChange={e => handleThresholdChange('heartRateLow', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Systolic BP Ceiling (mmHg)</label>
              <input
                type="number"
                value={formData.thresholds.systolicHigh}
                onChange={e => handleThresholdChange('systolicHigh', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Minimum Rest Cycle (hours)</label>
              <input
                type="number"
                step="0.5"
                value={formData.thresholds.sleepMinHours}
                onChange={e => handleThresholdChange('sleepMinHours', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Minimum SpO2 Saturation (%)</label>
              <input
                type="number"
                value={formData.thresholds.spo2MinPercent}
                onChange={e => handleThresholdChange('spo2MinPercent', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Muscle Force Warning (% baseline)</label>
              <input
                type="number"
                value={formData.thresholds.muscleLossWarningPercent}
                onChange={e => handleThresholdChange('muscleLossWarningPercent', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Mission Details & Unit System */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-white uppercase font-mono">
              Mission Parameters &amp; Display Standards
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Mission Identifier</label>
              <input
                type="text"
                value={formData.missionName}
                onChange={e => setFormData({ ...formData, missionName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Unit Display Standard</label>
              <select
                value={formData.units}
                onChange={e => setFormData({ ...formData, units: e.target.value as 'metric' | 'imperial' })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
              >
                <option value="metric">Metric (kg, mmHg, mSv, Celsius)</option>
                <option value="imperial">Imperial (lbs, mmHg, mSv, Fahrenheit)</option>
              </select>
            </div>
          </div>
        </div>

        {/* System Diagnostics & Backend Connectivity */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-3 font-mono text-xs">
          <h2 className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">
            System &amp; Intelligence Subsystems
          </h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Persistent File Storage</span>
              </div>
              <span className="text-emerald-400 font-bold">ONLINE (/data/astramed-db.json)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Europe PMC &amp; NASA OSDR Bridge</span>
              </div>
              <span className="text-emerald-400 font-bold">ACTIVE REST PROXY</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'SAVING...' : 'SAVE SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
