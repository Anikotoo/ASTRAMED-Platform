import React from 'react';
import { Bluetooth, ChevronRight, Radio, Watch } from 'lucide-react';

interface WearableStartGateProps {
  onConnect: () => void;
  onVirtual: () => void;
  onContinue: () => void;
}

export const WearableStartGate: React.FC<WearableStartGateProps> = ({ onConnect, onVirtual, onContinue }) => (
  <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
    <div className="w-full max-w-5xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-mono tracking-[0.25em]"><Radio className="w-4 h-4" /> ASTRAMED DEVICE SETUP</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Connect your devices</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">Choose a compatible Bluetooth wearable or continue with the clearly labelled virtual demonstration.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button onClick={onConnect} className="text-left rounded-2xl border border-slate-700 bg-slate-900/70 hover:bg-slate-800 p-6 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-300"><Bluetooth className="w-6 h-6" /></div>
          <div className="mt-5 text-lg font-semibold text-white">Connect smartwatch</div>
          <p className="mt-2 text-sm text-slate-400">Connect a compatible Bluetooth Low Energy device exposing the standard Heart Rate Service. Compatibility and browser support are required.</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Bluetooth setup <ChevronRight className="w-4 h-4" /></div>
        </button>

        <button onClick={onVirtual} className="text-left rounded-2xl border border-amber-700/70 bg-amber-950/20 hover:bg-amber-900/30 p-6 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400">
          <div className="w-12 h-12 rounded-xl bg-amber-900/60 flex items-center justify-center text-amber-200"><Watch className="w-6 h-6" /></div>
          <div className="mt-5 text-lg font-semibold text-white">Virtual neckband demo</div>
          <p className="mt-2 text-sm text-slate-400">Run a 12-minute simulation with fictional sample metrics and demo alerts. It does not measure your body.</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-200">Open virtual demo <ChevronRight className="w-4 h-4" /></div>
        </button>
      </div>

      <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3 text-center text-xs text-amber-100/80">
        VIRTUAL DEMO VALUES ARE FICTIONAL. They are not medical monitoring and are never saved as astronaut health readings.
      </div>
      <div className="text-center">
        <button onClick={onContinue} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4">Continue without connecting a device</button>
      </div>
    </div>
  </div>
);
