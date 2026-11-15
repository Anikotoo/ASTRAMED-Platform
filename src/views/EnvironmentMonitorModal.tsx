import React from 'react';
import { Globe2, X, Activity, AlertCircle, Radio } from 'lucide-react';

interface EnvironmentMonitorModalProps { onClose: () => void; }

export const EnvironmentMonitorModal: React.FC<EnvironmentMonitorModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5">
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2"><Globe2 className="w-5 h-5 text-cyan-400" /><div><h2 className="text-base font-bold text-white font-mono">Space Environment &amp; Life Support</h2><p className="text-xs text-slate-400">Environmental telemetry connection status</p></div></div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" aria-label="Close Environment Monitor"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-4 rounded-xl border border-amber-800/70 bg-amber-950/30 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-400 shrink-0" /><div><div className="text-sm font-semibold text-amber-200">No environmental sensor feed connected</div><p className="text-xs text-slate-300 mt-1">ASTRAMED is not currently receiving live spacecraft environmental telemetry. No cabin or radiation values are being fabricated or displayed.</p></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          ['Cabin CO₂ partial pressure','mmHg','Major Constituent Analyzer (MCA)'],
          ['Cabin pressure','kPa / psi','Environmental Control & Life Support System'],
          ['Radiation dose','mSv','Crew Personal Dosimeter / radiation telemetry'],
          ['Acceleration / microgravity','m/s² or g','Space Acceleration Measurement System']
        ].map(([label, unit, source]) => <div key={label} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"><div className="flex items-center justify-between"><span className="text-xs text-slate-300">{label}</span><Activity className="w-4 h-4 text-slate-500" /></div><div className="text-xl font-mono text-slate-500">— <span className="text-xs">{unit}</span></div><div className="text-[10px] text-slate-500">Expected source: {source}</div><div className="text-[10px] text-amber-400 flex items-center gap-1"><Radio className="w-3 h-3" /> NOT CONNECTED</div></div>)}
      </div>
      <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">Connect a real sensor gateway or import a source-identified dataset to populate these fields. Historical research values must not be displayed as current spacecraft conditions.</div>
    </div>
  </div>
);
