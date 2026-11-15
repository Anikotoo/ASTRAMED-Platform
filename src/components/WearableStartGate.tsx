import React from 'react';
import { Bluetooth, ChevronRight, Radio, Watch } from 'lucide-react';

interface WearableStartGateProps {
  onConnect: () => void;
  onVirtual: () => void;
  onContinue: () => void;
}

export const WearableStartGate: React.FC<WearableStartGateProps> = ({ onConnect, onVirtual, onContinue }) => (
  <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
    <div className="w-full max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-mono tracking-[0.25em]"><Radio className="w-4 h-4" /> ASTRAMED WEARABLE SETUP</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Connect your health wearable</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">Choose a compatible Bluetooth heart-rate device or launch a clearly labelled 12-minute virtual neckband demonstration.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button onClick={onConnect} className="text-left rounded-2xl border border-cyan-700/70 bg-cyan-950/30 hover:bg-cyan-900/40 p-6 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400">
          <div className="w-12 h-12 rounded-xl bg-cyan-900/70 flex items-center justify-center text-cyan-300"><Bluetooth className="w-6 h-6" /></div>
          <div className="mt-5 text-lg font-semibold text-white">Connect smartwatch</div>
          <p className="mt-2 text-sm text-slate-400">Scan for a compatible Bluetooth Low Energy device that exposes the standard Heart Rate Service. Browser support and device compatibility are required.</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Continue to Bluetooth setup <ChevronRight className="w-4 h-4" /></div>
        </button>

        <button onClick={onVirtual} className="text-left rounded-2xl border border-amber-700/70 bg-amber-950/20 hover:bg-amber-900/30 p-6 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400">
          <div className="w-12 h-12 rounded-xl bg-amber-900/60 flex items-center justify-center text-amber-200"><Watch className="w-6 h-6" /></div>
          <div className="mt-5 text-lg font-semibold text-white">No smartwatch? Create a virtual neckband</div>
          <p className="mt-2 text-sm text-slate-400">Open a 12-minute simulation with changing sample metrics and sound-enabled demo alerts. No real measurements are taken.</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-200">Set up virtual neckband <ChevronRight className="w-4 h-4" /></div>
        </button>
      </div>

      <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3 text-center text-xs text-amber-100/80">
        SIMULATION IS NOT MEDICAL MONITORING. Demo values and demo alarms are fictional and are never saved as astronaut health readings.
      </div>
      <div className="text-center">
        <button onClick={onContinue} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4">Continue to ASTRAMED without a wearable</button>
      </div>
    </div>
  </div>
);
