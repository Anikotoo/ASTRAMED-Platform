import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Battery, Bluetooth, CheckCircle2, Clock3, Heart, Pause, Play, Radio, RotateCcw, ShieldAlert, Watch, Wifi, Volume2, VolumeX, XCircle } from 'lucide-react';
import { CrewMember } from '../types/astramed';

interface VirtualSmartwatchProps {
  crewList: CrewMember[];
  selectedCrew: CrewMember | null;
  onDemoStateChange?: (state: any) => void;
}

interface BluetoothDeviceLike {
  name?: string;
  gatt?: {
    connect: () => Promise<{ getPrimaryService: (service: string) => Promise<{ getCharacteristic: (characteristic: string) => Promise<any> }> }>;
    disconnect: () => void;
  };
  addEventListener: (event: string, listener: () => void) => void;
}

type NavigatorWithBluetooth = Navigator & {
  bluetooth?: {
    requestDevice: (options: { acceptAllDevices: boolean; optionalServices: string[] }) => Promise<BluetoothDeviceLike>;
  };
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export const VirtualSmartwatch: React.FC<VirtualSmartwatchProps> = ({ crewList, selectedCrew, onDemoStateChange }) => {
  const [crewId, setCrewId] = useState(selectedCrew?.id || crewList[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(null);
  const [liveHeartRate, setLiveHeartRate] = useState<number | null>(null);
  const [bluetoothStatus, setBluetoothStatus] = useState('Not connected');
  const [bluetoothError, setBluetoothError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [demoAlert, setDemoAlert] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAlarmRef = useRef(false);
  const heartRateCharacteristicRef = useRef<any>(null);
  const bluetoothDeviceRef = useRef<BluetoothDeviceLike | null>(null);

  useEffect(() => {
    if (selectedCrew?.id) setCrewId(selectedCrew.id);
  }, [selectedCrew?.id]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setElapsedSeconds(seconds => Math.min(720, seconds + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (elapsedSeconds >= 720 && isRunning) {
      setIsRunning(false);
      setSessionFinished(true);
      setDemoAlert('');
    }
  }, [elapsedSeconds, isRunning]);

  useEffect(() => () => {
    try { bluetoothDeviceRef.current?.gatt?.disconnect(); } catch { /* ignore disconnect during unmount */ }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
    }
  }, []);

  const activeCrew = crewList.find(crew => crew.id === crewId) || null;

  // Fictional data for the 12-minute virtual neckband demonstration only.
  // Low-value episodes are scripted solely to demonstrate the local DEMO ALERT.
  const metrics = useMemo(() => {
    const lowOxygenDemo = elapsedSeconds >= 150 && elapsedSeconds <= 165;
    const lowHeartRateDemo = elapsedSeconds >= 330 && elapsedSeconds <= 345;
    return {
      heartRate: lowHeartRateDemo ? 48 : Math.round(72 + Math.sin(elapsedSeconds / 8) * 4 + Math.sin(elapsedSeconds / 19) * 2),
      spo2: lowOxygenDemo ? 89 : 97 + (Math.sin(elapsedSeconds / 17) > 0.25 ? 1 : 0),
      skinTemperature: (36.4 + Math.sin(elapsedSeconds / 24) * 0.2).toFixed(1),
      steps: 1240 + Math.floor(elapsedSeconds / 5) * 3,
      battery: Math.max(85, 86 - Math.floor(elapsedSeconds / 180)),
      lowOxygenDemo,
      lowHeartRateDemo
    };
  }, [elapsedSeconds]);

  const activeDemoAlert = isRunning
    ? (metrics.lowOxygenDemo ? 'DEMO ALERT: Simulated SpO₂ is below the demo threshold.' : metrics.lowHeartRateDemo ? 'DEMO ALERT: Simulated heart rate is below the demo threshold.' : '')
    : '';

  // Mirror the exact PC demo state to the paired phone over the WebRTC data channel.
  useEffect(() => {
    onDemoStateChange?.({ elapsedSeconds, isRunning, sessionFinished, metrics, alert: activeDemoAlert });
  }, [onDemoStateChange, elapsedSeconds, isRunning, sessionFinished, metrics, activeDemoAlert]);

  const playAlarm = async () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
      }
      const context = audioContextRef.current;
      if (context.state === 'suspended') await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.34);
    } catch (error) {
      console.warn('Demo alert sound could not play:', error);
    }
  };

  useEffect(() => {
    const isAlerting = Boolean(activeDemoAlert);
    if (isAlerting && !lastAlarmRef.current) void playAlarm();
    lastAlarmRef.current = isAlerting;
    setDemoAlert(activeDemoAlert);
  }, [activeDemoAlert]);

  const startDemo = async () => {
    if (!activeCrew) return;
    try {
      const AudioContextClass = window.AudioContext;
      if (soundEnabled && AudioContextClass) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') audioContextRef.current = new AudioContextClass();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      }
    } catch { /* sound remains optional */ }
    setElapsedSeconds(0);
    setSessionFinished(false);
    setDemoAlert('');
    lastAlarmRef.current = false;
    setIsRunning(true);
  };

  const resetDemo = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setSessionFinished(false);
    setDemoAlert('');
    lastAlarmRef.current = false;
  };

  const connectBluetooth = async () => {
    setBluetoothError('');
    const bluetooth = (navigator as NavigatorWithBluetooth).bluetooth;
    if (!bluetooth) {
      setBluetoothError('Web Bluetooth is unavailable in this browser. Try a supported Chromium browser on HTTPS, or use the virtual neckband demo.');
      return;
    }
    setIsConnecting(true);
    try {
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['heart_rate']
      });
      if (!device.gatt) throw new Error('This device does not expose a Bluetooth GATT server.');
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      await characteristic.startNotifications();
      const onMeasurement = (event: Event) => {
        const target = event.target as EventTarget & { value?: DataView };
        const data = target.value;
        if (!data || data.byteLength < 2) return;
        const flags = data.getUint8(0);
        const bpm = flags & 0x01 ? data.getUint16(1, true) : data.getUint8(1);
        setLiveHeartRate(bpm);
      };
      characteristic.addEventListener('characteristicvaluechanged', onMeasurement);
      heartRateCharacteristicRef.current = characteristic;
      bluetoothDeviceRef.current = device;
      device.addEventListener('gattserverdisconnected', () => {
        setBluetoothDeviceName(null);
        setLiveHeartRate(null);
        setBluetoothStatus('Disconnected');
      });
      setBluetoothDeviceName(device.name || 'Compatible BLE heart-rate device');
      setBluetoothStatus('Connected · receiving heart-rate notifications');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bluetooth connection failed.';
      setBluetoothError(message.includes('cancel') ? 'Bluetooth selection was cancelled.' : message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectBluetooth = () => {
    try { bluetoothDeviceRef.current?.gatt?.disconnect(); } catch { /* ignore */ }
    bluetoothDeviceRef.current = null;
    setBluetoothDeviceName(null);
    setLiveHeartRate(null);
    setBluetoothStatus('Disconnected');
  };

  const progress = Math.min(100, (elapsedSeconds / 720) * 100);
  const isBluetoothConnected = Boolean(bluetoothDeviceName);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-xl border border-amber-700/70 bg-amber-950/30 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-mono font-bold tracking-wider text-amber-200">DEMO DATA IS NOT MEDICAL TELEMETRY</div>
          <p className="text-xs text-amber-100/80 mt-1">Virtual neckband values are fictional and local to this browser. They are never uploaded, stored as health readings, used by Health Trends or passed to the AI Assistant. Demo alarms are not medical alerts.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400"><Watch className="w-4 h-4" /> WEARABLE DEVICE LAB</div>
          <h1 className="text-2xl font-bold text-white mt-1">Smartwatch & Virtual Neckband</h1>
          <p className="text-sm text-slate-400 mt-1">Connect a compatible BLE heart-rate device or run a 12-minute simulation.</p>
        </div>
        <div className="min-w-56">
          <label htmlFor="watch-crew" className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Demo subject</label>
          <select id="watch-crew" value={crewId} onChange={event => setCrewId(event.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            {crewList.map(crew => <option key={crew.id} value={crew.id}>{crew.name} ({crew.callsign})</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-cyan-900/70 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center gap-2 text-cyan-300"><Bluetooth className="w-5 h-5" /><h2 className="font-semibold text-white">Real Bluetooth device</h2></div>
          <div className="text-xs text-slate-400">Scans for devices that support the standard Bluetooth Heart Rate Service. Many consumer watches use private protocols and will not expose this service to a website.</div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="text-xs text-slate-500">Connection</div>
            <div className="text-sm text-white mt-1">{bluetoothDeviceName || bluetoothStatus}</div>
            {liveHeartRate !== null && <div className="flex items-center gap-2 mt-3 text-rose-300"><Heart className="w-4 h-4" /><span className="text-2xl font-mono">{liveHeartRate}</span><span className="text-xs text-slate-400">bpm · LIVE BLE</span></div>}
          </div>
          {!isBluetoothConnected ? (
            <button onClick={connectBluetooth} disabled={isConnecting} className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white">{isConnecting ? 'Waiting for device selection…' : 'Scan & connect via Bluetooth'}</button>
          ) : (
            <button onClick={disconnectBluetooth} className="w-full rounded-lg border border-rose-800 text-rose-300 hover:bg-rose-950/40 px-4 py-2.5 text-sm">Disconnect device</button>
          )}
          {bluetoothError && <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900 rounded-lg p-3">{bluetoothError}</div>}
          <p className="text-[10px] text-slate-500">Requires HTTPS, a browser with Web Bluetooth support, user permission and a compatible BLE device. This prototype reads only the standard heart-rate characteristic. It does not read SpO₂, blood pressure or temperature from the watch.</p>
        </section>

        <section className="rounded-2xl border border-amber-800/70 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-200"><Watch className="w-5 h-5" /><h2 className="font-semibold text-white">Virtual neckband · 12-minute demo</h2></div>
          <div className="flex items-center justify-center py-2">
            <div className="relative w-44 h-36">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-24 h-28 border-[9px] border-slate-500 rounded-[45%] opacity-80" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-24 h-8 rounded-xl border border-amber-500 bg-amber-950 shadow-lg shadow-amber-900/40 flex items-center justify-center text-[9px] font-mono text-amber-200">ASTRAMED</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="text-xs text-slate-400 flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> Heart rate</div><div className="text-2xl font-mono text-white mt-2">{metrics.heartRate}<span className="text-xs text-slate-500"> bpm</span></div></div>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="text-xs text-slate-400">SpO₂</div><div className="text-2xl font-mono text-white mt-2">{metrics.spo2}<span className="text-xs text-slate-500">%</span></div></div>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="text-xs text-slate-400">Skin temperature</div><div className="text-2xl font-mono text-white mt-2">{metrics.skinTemperature}<span className="text-xs text-slate-500"> °C</span></div></div>
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-3"><div className="text-xs text-slate-400">Steps</div><div className="text-2xl font-mono text-white mt-2">{metrics.steps.toLocaleString()}</div></div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400"><span className="flex items-center gap-2"><Battery className="w-4 h-4" /> Virtual battery {metrics.battery}%</span><span className="font-mono">{formatDuration(elapsedSeconds)} / 12:00</span></div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} /></div>
          {activeDemoAlert && <div role="alert" className="rounded-lg border border-rose-600 bg-rose-950/70 p-3 flex items-start gap-2 text-rose-100"><ShieldAlert className="w-5 h-5 shrink-0" /><div className="text-xs font-bold">{activeDemoAlert} SOUNDING DEMO ALARM.</div></div>}
          {sessionFinished && <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-3 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="w-4 h-4" /> 12-minute demo completed. No readings were saved.</div>}
          <div className="flex flex-wrap gap-2">
            {!isRunning ? (
              <button onClick={startDemo} disabled={!activeCrew} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 px-4 py-2.5 text-sm font-semibold text-white"><Play className="w-4 h-4" /> {sessionFinished || elapsedSeconds > 0 ? 'Restart 12-minute demo' : 'Start 12-minute demo'}</button>
            ) : (
              <button onClick={() => setIsRunning(false)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Pause className="w-4 h-4" /> Pause</button>
            )}
            <button onClick={resetDemo} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-3 py-2.5 text-sm text-slate-300"><RotateCcw className="w-4 h-4" /> Reset</button>
          </div>
          <button onClick={() => setSoundEnabled(enabled => !enabled)} className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-1">{soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}{soundEnabled ? 'Demo alarm sound enabled' : 'Demo alarm sound muted'}</button>
          <p className="text-[10px] leading-relaxed text-amber-100/60">Scripted low SpO₂ and heart-rate episodes occur during this fictional demonstration to test the on-screen warning and sound. Thresholds are demo triggers only, not clinical thresholds.</p>
        </section>
      </div>

      {isBluetoothConnected && (
        <div className="rounded-lg border border-emerald-800/70 bg-emerald-950/20 p-3 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="w-4 h-4" /> Live Bluetooth heart-rate notifications are being received locally. They are not yet forwarded to the authenticated mission sensor gateway.</div>
      )}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500 flex items-start gap-2"><Wifi className="w-4 h-4 shrink-0 mt-0.5" /> Data provenance: Bluetooth heart rate is device-reported and displayed locally; virtual neckband values are simulated. Neither source is currently stored in the mission database by this screen.</div>
    </div>
  );
};
