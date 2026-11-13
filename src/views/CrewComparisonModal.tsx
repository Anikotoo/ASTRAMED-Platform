import React, { useState } from 'react';
import { CrewMember, HealthReading } from '../types/astramed';
import { Scale, X, Heart, Dumbbell, Moon, Shield, Award } from 'lucide-react';

interface CrewComparisonModalProps {
  crewList: CrewMember[];
  readings: HealthReading[];
  onClose: () => void;
}

export const CrewComparisonModal: React.FC<CrewComparisonModalProps> = ({
  crewList,
  readings,
  onClose
}) => {
  const [crewAId, setCrewAId] = useState<string>(crewList[0]?.id || 'crew-01');
  const [crewBId, setCrewBId] = useState<string>(crewList[1]?.id || 'crew-02');

  const crewA = crewList.find(c => c.id === crewAId) || crewList[0];
  const crewB = crewList.find(c => c.id === crewBId) || crewList[1];

  const getMetric = (crewId: string, param: string) => {
    const list = readings.filter(r => r.crewId === crewId && r.parameter === param);
    return list.length > 0 ? list[0].value : null;
  };

  const METRICS = [
    { label: 'Resting Heart Rate', param: 'heart_rate', unit: 'bpm', icon: Heart },
    { label: 'Systolic Blood Pressure', param: 'blood_pressure_sys', unit: 'mmHg', icon: Heart },
    { label: 'Quadriceps Peak Force', param: 'muscle_strength_quad', unit: '%', icon: Dumbbell },
    { label: 'Sleep Rest Cycle', param: 'sleep_duration', unit: 'hrs', icon: Moon },
    { label: 'Oxygen Saturation (SpO2)', param: 'spo2', unit: '%', icon: Shield },
    { label: 'Body Mass Tracking', param: 'body_weight', unit: 'kg', icon: Scale },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 text-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white font-mono">Astronaut Telemetry Comparison</h2>
              <p className="text-xs text-slate-400">Evaluate physiological adaptation differences across flight roles.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            aria-label="Close Comparison Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crew Selectors */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-cyan-800/60">
            <label className="text-[10px] font-mono uppercase text-cyan-400 block mb-1">Subject A</label>
            <select
              value={crewAId}
              onChange={e => setCrewAId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none"
            >
              {crewList.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
              ))}
            </select>
            <div className="mt-2 text-[11px] font-mono text-slate-400">
              Age: {crewA?.age} • Days in Orbit: {crewA?.daysInOrbit} • {crewA?.evaCount} EVAs
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-800/60">
            <label className="text-[10px] font-mono uppercase text-amber-400 block mb-1">Subject B</label>
            <select
              value={crewBId}
              onChange={e => setCrewBId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none"
            >
              {crewList.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
              ))}
            </select>
            <div className="mt-2 text-[11px] font-mono text-slate-400">
              Age: {crewB?.age} • Days in Orbit: {crewB?.daysInOrbit} • {crewB?.evaCount} EVAs
            </div>
          </div>
        </div>

        {/* Metrics Table */}
        <div className="space-y-2">
          {METRICS.map(m => {
            const Icon = m.icon;
            const valA = getMetric(crewA.id, m.param);
            const valB = getMetric(crewB.id, m.param);
            const diff = (valA !== null && valB !== null) ? Number((valA - valB).toFixed(1)) : null;

            return (
              <div
                key={m.param}
                className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2.5 w-1/3">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-300 font-semibold">{m.label}</span>
                </div>

                <div className="w-1/4 text-center font-bold text-cyan-400">
                  {valA !== null ? `${valA} ${m.unit}` : '--'}
                </div>

                <div className="w-1/4 text-center font-bold text-amber-400">
                  {valB !== null ? `${valB} ${m.unit}` : '--'}
                </div>

                <div className="w-1/6 text-right text-[11px] font-bold">
                  {diff !== null ? (
                    <span className={diff === 0 ? 'text-slate-400' : (diff > 0 ? 'text-cyan-300' : 'text-amber-300')}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  ) : '--'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 text-center">
          Note: Individual baselines, flight specializations, and suit differentials must be accounted for in comparative medical assessments.
        </div>
      </div>
    </div>
  );
};
