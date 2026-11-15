import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Battery, Bluetooth, Clock3, Heart, Pause, Play, RotateCcw, ShieldAlert, Watch, Wifi } from 'lucide-react';
import { CrewMember } from '../types/astramed';

interface VirtualSmartwatchProps {
  crewList: CrewMember[];
  selectedCrew: CrewMember | null;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export const VirtualSmartwatch: React.FC<VirtualSmartwatchProps> = ({ crewList, selectedCrew }) => {
  const [crewId, setCrewId] = useState(selectedCrew?.id || crewList[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (selectedCrew?.id) setCrewId(selectedCrew.id);
  }, [selectedCrew?.id]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setElapsedSeconds(seconds => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const activeCrew = crewList.find(crew => crew.id === crewId) || null;

  // These values are intentionally generated in the browser for a visual demo only.
  // They are never posted to /api/sensors/ingest or /api/readings.
  const metrics = useMemo(() => ({
    heartRate: Math.round(72 + Math.sin(elapsedSeconds / 8) * 4 + Math.sin(elapsedSeconds / 19) * 2),
    spo2: 97 + (Math.sin(elapsedSeconds / 17) > 0.25 ? 1 : 0),
    skinTemperature: (36.4 + Math.sin(elapsedSeconds / 24) * 0.2).toFixed(1),
    steps: 1240 + Math.floor(elapsedSeconds / 5) * 3,
    battery: Math.max(85, 86 - Math.floor(elapsedSeconds / 180))
  }), [elapsedSeconds]);

  const start = () => {
    if (!activeCrew) return;
    setIsRunning(true);
  };

  const reset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-xl border border-amber-700/70 bg-amber-950/30 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-mono font-bold tracking-wider text-amber-200">SIMULATION MODE — NOT LIVE TELEMETRY</div>
          <p className="text-xs text-amber-100/80 mt-1">All watch values on this screen are generated locally for demonstration. They are not measured from a person, are not medically meaningful, and are never saved to the mission database or sent to the sensor gateway.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400"><Watch className="w-4 h-4" /> WEARABLE DEVICE LAB</div>
          <h1 className="text-2xl font-bold text-white mt-1">Virtual Smartwatch</h1>
          <p className="text-sm text-slate-400 mt-1">Preview the wearable-monitoring interface without fabricating real astronaut health records.</p>
        </div>
        <div className="min-w-56">
          <label htmlFor="watch-crew" className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Demo subject</label>
          <select id="watch-crew" value={crewId} onChange={event => setCrewId(event.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {crewList.map(crew => <option key={crew.id} value={crew.id}>{crew.name} ({crew.callsign})</option>)}
          </select>
        </div>
      </div>

      {!activeCrew ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">Create a crew profile before starting the virtual watch demonstration.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] gap-5">
          <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30 p-5 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-slate-400">ASTRAMED WEARABLE / DEMO UNIT 01</div>
                <div className="text-lg font-semibold text-white mt-1">{activeCrew.name}</div>
                <div className="text-xs text-slate-500">{activeCrew.callsign} · {activeCrew.role}</div>
              </div>
              <div className="rounded-full border border-amber-700/70 bg-amber-950/50 px-3 py-1 text-[10px] font-mono text-amber-200">VIRTUAL DEVICE</div>
            </div>

            <div className="flex justify-center py-8">
              <div className="relative w-64 h-72 rounded-[3rem] border-[10px] border-slate-700 bg-slate-950 shadow-2xl shadow-cyan-950/50 flex flex-col items-center justify-center">
                <div className="absolute -left-5 top-16 w-3 h-12 rounded-l bg-slate-600" />
                <div className="absolute -right-5 top-20 w-3 h-16 rounded-r bg-slate-600" />
                <div className="text-[9px] font-mono tracking-[0.25em] text-cyan-400">ASTRAMED</div>
                <div className="flex items-center gap-2 mt-5 text-rose-400"><Heart className="w-5 h-5 fill-rose-500/20" /><span className="text-4xl font-mono font-bold text-white tabular-nums">{metrics.heartRate}</span></div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">BPM · SIMULATED</div>
                <div className="w-36 border-t border-slate-800 my-4" />
                <div className="text-2xl font-mono text-cyan-300">{metrics.spo2}%</div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">SpO₂ · SIMULATED</div>
                <div className="absolute bottom-5 text-[9px] font-mono text-slate-600">{isRunning ? 'DEMO STREAM ACTIVE' : 'DEMO STREAM PAUSED'}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isRunning ? (
                <button onClick={start} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white"><Play className="w-4 h-4" /> Start demo</button>
              ) : (
                <button onClick={() => setIsRunning(false)} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white"><Pause className="w-4 h-4" /> Pause demo</button>
              )}
              <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-300"><RotateCcw className="w-4 h-4" /> Reset</button>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500 mt-4"><Clock3 className="w-3.5 h-3.5" /> DEMO ELAPSED {formatDuration(elapsedSeconds)}</div>
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="text-[10px] font-mono tracking-widest text-slate-400 mb-3">SIMULATED METRICS</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="flex items-center gap-2 text-xs text-slate-400"><Heart className="w-3.5 h-3.5 text-rose-400" /> Heart rate</div><div className="text-2xl font-mono text-white mt-2">{metrics.heartRate} <span className="text-xs text-slate-500">bpm</span></div></div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="flex items-center gap-2 text-xs text-slate-400"><Activity className="w-3.5 h-3.5 text-cyan-400" /> SpO₂</div><div className="text-2xl font-mono text-white mt-2">{metrics.spo2}<span className="text-xs text-slate-500">%</span></div></div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="text-xs text-slate-400">Skin temperature</div><div className="text-2xl font-mono text-white mt-2">{metrics.skinTemperature}<span className="text-xs text-slate-500"> °C</span></div></div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="text-xs text-slate-400">Step counter</div><div className="text-2xl font-mono text-white mt-2">{metrics.steps.toLocaleString()}</div></div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400"><span className="flex items-center gap-2"><Battery className="w-4 h-4" /> Virtual battery</span><span className="font-mono text-slate-200">{metrics.battery}%</span></div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
              <div className="text-[10px] font-mono tracking-widest text-slate-400">REAL DEVICE CONNECTION</div>
              <div className="flex items-center gap-3"><Bluetooth className="w-5 h-5 text-slate-500" /><div><div className="text-sm text-white">Bluetooth smartwatch</div><div className="text-[11px] text-slate-500">Not connected · integration not implemented</div></div></div>
              <button disabled className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-500 cursor-not-allowed">Bluetooth pairing — coming later</button>
              <p className="text-[10px] leading-relaxed text-slate-500">Real-device pairing requires a supported watch protocol or companion Android app. This demo does not scan for or connect to nearby devices.</p>
            </div>

            <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><Wifi className="w-4 h-4" /> Data isolation</div>
              <p className="text-[11px] text-cyan-100/70 mt-2">Simulation runs only in this browser tab. No API request is made, no record is stored, and no simulated value enters alerts, Health Trends, or AI Assistant context.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
