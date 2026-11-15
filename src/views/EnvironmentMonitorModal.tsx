import React, { useCallback, useEffect, useState } from 'react';
import { ChallengeResourcesPanel } from '../components/ChallengeResourcesPanel';
import { Globe2, X, Activity, AlertCircle, Radio, RefreshCw, ExternalLink, Satellite, Sun } from 'lucide-react';

interface EnvironmentMonitorModalProps { onClose: () => void; }
interface SpaceWeatherEvent {
  type: string;
  issuedAt: string;
  body: string;
  url: string;
}
interface SpaceWeatherData {
  fetchedAt: string;
  nasa: { status: 'online' | 'unavailable'; events: SpaceWeatherEvent[]; source: string; sourceUrl: string; error: string | null };
  noaa: {
    status: 'online' | 'unavailable';
    kpIndex: number | null;
    kpTimestamp: string;
    solarWindSpeed: number | null;
    windTimestamp: string;
    kpSourceUrl: string;
    windSourceUrl: string;
    error: string | null;
  };
  dataBoundary: string;
}

const formatTime = (value?: string) => {
  if (!value) return 'Timestamp unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const Status = ({ online }: { online: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-mono ${online ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
    {online ? 'SOURCE ONLINE' : 'SOURCE UNAVAILABLE'}
  </span>
);

export const EnvironmentMonitorModal: React.FC<EnvironmentMonitorModalProps> = ({ onClose }) => {
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSpaceWeather = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/space-weather', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Space-weather service returned HTTP ${response.status}`);
      const data = await response.json() as SpaceWeatherData;
      setSpaceWeather(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load external space-weather data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSpaceWeather(); }, [loadSpaceWeather]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-5 sm:p-6 text-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2"><Globe2 className="w-5 h-5 text-cyan-400" /><div><h2 className="text-base font-bold text-white font-mono">Space Environment &amp; Life Support</h2><p className="text-xs text-slate-400">External space weather and spacecraft sensor status</p></div></div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white" aria-label="Close Environment Monitor"><X className="w-5 h-5" /></button>
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Satellite className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-bold text-white">Live Space Weather — External Data</h3></div>
            <button onClick={() => void loadSpaceWeather()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-800 bg-cyan-950/60 px-3 py-1.5 text-[11px] font-mono text-cyan-200 hover:bg-cyan-900 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'UPDATING' : 'REFRESH'}
            </button>
          </div>

          {loadError && <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-200">{loadError} External source values are not available right now.</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-white"><Sun className="h-4 w-4 text-amber-300" /> Planetary K-index</div>{spaceWeather && <Status online={spaceWeather.noaa.status === 'online'} />}</div>
              <div className="text-3xl font-mono text-cyan-200">{loading && !spaceWeather ? '…' : spaceWeather?.noaa.kpIndex ?? '—'} <span className="text-xs text-slate-500">Kp</span></div>
              <p className="text-[10px] text-slate-500">Global geomagnetic activity indicator. Not an astronaut's personal radiation dose.</p>
              <p className="text-[10px] text-slate-500">Observation: {formatTime(spaceWeather?.noaa.kpTimestamp)}</p>
              <a className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200" href={spaceWeather?.noaa.kpSourceUrl || 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'} target="_blank" rel="noreferrer">NOAA SWPC source <ExternalLink className="h-3 w-3" /></a>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-white"><Activity className="h-4 w-4 text-cyan-300" /> Solar wind speed</div>{spaceWeather && <Status online={spaceWeather.noaa.status === 'online'} />}</div>
              <div className="text-3xl font-mono text-cyan-200">{loading && !spaceWeather ? '…' : spaceWeather?.noaa.solarWindSpeed ?? '—'} <span className="text-xs text-slate-500">km/s</span></div>
              <p className="text-[10px] text-slate-500">Solar-wind speed near the upstream monitoring spacecraft; not a cabin or crew measurement.</p>
              <p className="text-[10px] text-slate-500">Observation: {formatTime(spaceWeather?.noaa.windTimestamp)}</p>
              <a className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200" href={spaceWeather?.noaa.windSourceUrl || 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json'} target="_blank" rel="noreferrer">NOAA SWPC source <ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>
          {spaceWeather?.noaa.error && <p className="text-[11px] text-amber-300">{spaceWeather.noaa.error}</p>}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Satellite className="h-4 w-4 text-cyan-300" /><h3 className="text-sm font-bold text-white">NASA DONKI — Recent Space Weather Events</h3></div>{spaceWeather && <Status online={spaceWeather.nasa.status === 'online'} />}</div>
          <p className="text-[11px] text-slate-400">NASA event notices and analyses from the last seven days. These describe solar and heliophysics events, not individual crew exposure.</p>
          {loading && !spaceWeather ? <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-cyan-300">Retrieving NASA event notices…</div> :
            spaceWeather?.nasa.events.length ? <div className="space-y-2">{spaceWeather.nasa.events.map((event, index) => (
              <article key={`${event.issuedAt}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded bg-cyan-950 px-2 py-1 text-[10px] font-mono text-cyan-200">{event.type}</span><span className="text-[10px] text-slate-500">{formatTime(event.issuedAt)}</span></div>
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">{event.body}</p>
                <a href={event.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200">Open NASA event <ExternalLink className="h-3 w-3" /></a>
              </article>
            ))}</div> : <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">{spaceWeather?.nasa.status === 'online' ? 'No NASA DONKI event notices were returned for this seven-day window.' : spaceWeather?.nasa.error || 'NASA event feed unavailable.'}</div>}
          <a href={spaceWeather?.nasa.sourceUrl || 'https://ccmc.gsfc.nasa.gov/DONKI/'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200">NASA DONKI repository <ExternalLink className="h-3 w-3" /></a>
        </section>

        <div className="rounded-lg border border-cyan-900/70 bg-cyan-950/20 p-3 text-[11px] leading-relaxed text-cyan-100/80">
          <strong className="text-cyan-200">Data boundary:</strong> {spaceWeather?.dataBoundary || 'NASA and NOAA space-weather data are external environmental context only. They never replace or modify crew sensor readings.'}
          {spaceWeather?.fetchedAt && <div className="mt-1 text-[10px] text-slate-500">Dashboard fetched: {formatTime(spaceWeather.fetchedAt)}</div>}
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-bold text-white">Crew / Spacecraft Sensor Telemetry</h3></div>
          <div className="rounded-xl border border-amber-800/70 bg-amber-950/30 p-4 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-amber-400 shrink-0" /><div><div className="text-sm font-semibold text-amber-200">No environmental sensor feed connected</div><p className="text-xs text-slate-300 mt-1">ASTRAMED is not currently receiving live spacecraft environmental telemetry. NASA and NOAA external data do not fill these sensor fields.</p></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['Cabin CO₂ partial pressure','mmHg','Major Constituent Analyzer (MCA)'],
              ['Cabin pressure','kPa / psi','Environmental Control & Life Support System'],
              ['Personal radiation dose','mSv','Crew Personal Dosimeter'],
              ['Acceleration / microgravity','m/s² or g','Space Acceleration Measurement System']
            ].map(([label, unit, source]) => <div key={label} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"><div className="flex items-center justify-between"><span className="text-xs text-slate-300">{label}</span><Activity className="w-4 h-4 text-slate-500" /></div><div className="text-xl font-mono text-slate-500">— <span className="text-xs">{unit}</span></div><div className="text-[10px] text-slate-500">Expected source: {source}</div><div className="text-[10px] text-amber-400 flex items-center gap-1"><Radio className="w-3 h-3" /> NOT CONNECTED</div></div>)}
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">NASA does not endorse any non-U.S. Government entity and is not responsible for information on non-U.S. Government websites. Follow each source's data-use parameters.</p>
        </div>
        <ChallengeResourcesPanel compact />
      </div>
    </div>
  );
};
