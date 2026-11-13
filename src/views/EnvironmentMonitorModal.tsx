import React from 'react';
import { Globe2, X, Sun, Wind, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface EnvironmentMonitorModalProps {
  onClose: () => void;
}

export const EnvironmentMonitorModal: React.FC<EnvironmentMonitorModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white font-mono">Space Environment &amp; Life Support Surveillance</h2>
              <p className="text-xs text-slate-400">Onboard environmental sensors &amp; orbital radiation dosimeters.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            aria-label="Close Environment Monitor Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Environmental Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          {/* Microgravity Level */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Orbital Microgravity</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              0.000002 <span className="text-xs text-slate-400">g</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Quasi-steady acceleration on ISS Destiny Lab axis. Free-fall microgravity environment nominal.
            </div>
            <div className="text-[10px] text-cyan-400 pt-1">
              Source: Space Acceleration Measurement System (SAMS)
            </div>
          </div>

          {/* Radiation Dosimetry */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Cumulative Radiation Dose</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">
              54.2 <span className="text-xs text-slate-400">mSv</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Rate: ~0.46 mSv/day. Low solar particle activity. South Atlantic Anomaly (SAA) transit at 14:22 UTC.
            </div>
            <div className="text-[10px] text-cyan-400 pt-1">
              Source: BioSentinel &amp; Crew Personal Dosimeter (CPD)
            </div>
          </div>

          {/* Cabin CO2 Partial Pressure */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Cabin CO2 Partial Pressure</span>
              <Wind className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              2.8 <span className="text-xs text-slate-400">mmHg</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Nominal orbital ceiling is &lt;4.0 mmHg. CDRA scrubbers operating in cyclic desiccant mode.
            </div>
            <div className="text-[10px] text-cyan-400 pt-1">
              Source: Major Constituent Analyzer (MCA)
            </div>
          </div>

          {/* Total Atmospheric Pressure */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
              <span>Atmospheric Pressure</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              14.7 <span className="text-xs text-slate-400">psi (101.3 kPa)</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Sea-level equivalent normobaric mixture: 78.1% N2, 21.0% O2. No depressurization delta detected.
            </div>
            <div className="text-[10px] text-cyan-400 pt-1">
              Source: Environmental Control &amp; Life Support (ECLSS)
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            Environmental variables directly correlate with astronaut physiological adaptation: elevated ambient CO2 accelerates Spaceflight-Associated Neuro-ocular Syndrome (SANS), while cosmic ray fluence requires lifetime dose tracking.
          </span>
        </div>
      </div>
    </div>
  );
};
