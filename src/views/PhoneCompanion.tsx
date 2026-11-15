import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Mic, Smartphone, Volume2 } from 'lucide-react';

const ICE_SERVERS: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function json(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Phone pairing failed.');
  return data;
}

export const PhoneCompanion: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [pin, setPin] = useState('');
  const [pairId] = useState(() => new URLSearchParams(window.location.search).get('pair') || '');
  const [joinClientId] = useState(() => {
    const key = `astramed-phone-pair-client:${new URLSearchParams(window.location.search).get('pair') || 'unknown'}`;
    try {
      const existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
      const created = window.crypto.randomUUID();
      window.sessionStorage.setItem(key, created);
      return created;
    } catch {
      return window.crypto.randomUUID();
    }
  });
  const [phoneToken, setPhoneToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState('Connect this phone to provide YOMA camera video and spoken guidance.');
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [neckbandState, setNeckbandState] = useState<any>(null);
  const speakerEnabledRef = useRef(false);
  const connectLockRef = useRef(false);

  function cleanup() {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }
  useEffect(() => () => cleanup(), []);

  async function connect() {
    if (connectLockRef.current || status === 'connected') return;
    connectLockRef.current = true;
    if (!pairId) { setStatus('error'); setMessage('This pairing link is missing its temporary session ID. Scan a fresh QR code.'); connectLockRef.current = false; return; }
    if (!/^\d{6}$/.test(pin)) { setStatus('error'); setMessage('Enter the six-digit PIN shown on the computer.'); connectLockRef.current = false; return; }
    setStatus('connecting'); setMessage('Requesting camera permission…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS and a supported browser.');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      } catch (cameraError: any) {
        if (cameraError?.name === 'OverconstrainedError' || cameraError?.name === 'NotFoundError') stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        else throw cameraError;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Preview autoplay is best-effort; it must not block the actual WebRTC connection.
        void videoRef.current.play().catch(() => setMessage('Camera permission granted. Establishing secure phone connection…'));
      }
      setMessage('Camera ready. Approving the secure pairing…');
      let joined: any;
      for (let attempt = 0; attempt < 10; attempt++) {
        const response = await fetch(`/api/phone-pairing/${encodeURIComponent(pairId)}/join`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, clientId: joinClientId })
        });
        if (response.status === 409) {
          const payload = await response.json().catch(() => ({}));
          if (/computer is not ready yet/i.test(String(payload.error || '')) && attempt < 9) {
            await new Promise(resolve => window.setTimeout(resolve, 600));
            continue;
          }
          throw new Error(payload.error || 'This pairing session cannot be used. Generate a fresh QR code.');
        }
        joined = await json(response);
        break;
      }
      if (!joined) throw new Error('The computer did not finish preparing the pairing. Generate a fresh QR code and try again.');
      setPhoneToken(joined.phoneToken);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.ondatachannel = event => {
        event.channel.onmessage = messageEvent => {
          try {
            const command = JSON.parse(messageEvent.data);
            if (command.type === 'neckband-state' && command.state && typeof command.state === 'object') { setNeckbandState(command.state); return; }
            if (command.type === 'speak' && typeof command.text === 'string' && speakerEnabledRef.current && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(command.text.slice(0, 400)));
            }
          } catch { /* Ignore malformed remote control messages. */ }
        };
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('connected');
          setMessage('Connected. Keep this page open; your phone camera is feeding YOMA.');
        } else if (pc.connectionState === 'failed') {
          setStatus('error');
          setMessage('WebRTC connection failed. Try another network or ask the computer to generate a fresh pairing.');
        } else if (pc.connectionState === 'disconnected') setMessage('Connection interrupted. Trying to reconnect…');
      };
      await pc.setRemoteDescription(joined.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await new Promise<void>((resolve, reject) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const timeout = window.setTimeout(() => reject(new Error('Network setup timed out. Try another network and generate a fresh pairing.')), 20000);
        const check = () => {
          if (pc.iceGatheringState === 'complete') { window.clearTimeout(timeout); pc.removeEventListener('icegatheringstatechange', check); resolve(); }
        };
        pc.addEventListener('icegatheringstatechange', check);
        check();
      });
      await json(await fetch(`/api/phone-pairing/${encodeURIComponent(pairId)}/answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${joined.phoneToken}` },
        body: JSON.stringify({ sdp: pc.localDescription })
      }));
      setMessage('Secure answer sent. Waiting for the computer to finish connecting…');
    } catch (error: any) {
      cleanup(); setStatus('error'); setMessage(error.message || 'Could not connect this phone.');
    } finally {
      connectLockRef.current = false;
    }
  }
  function enableSpeaker() {
    speakerEnabledRef.current = true;
    setSpeakerEnabled(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance('Hello. ASTRAMED phone speaker is ready.'));
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-5 flex items-center justify-center">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-cyan-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono"><Smartphone className="w-4 h-4" /> ASTRAMED PHONE COMPANION</div>
        <h1 className="text-2xl font-bold">Connect to mission control</h1>
        <p className="text-sm text-slate-400">This phone can provide a live camera feed to YOMA and play spoken greetings and movement instructions.</p>
        <label className="block text-xs text-slate-400">SIX-DIGIT PIN FROM THE COMPUTER</label>
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-center text-2xl tracking-[0.4em] font-mono" placeholder="000000" />
        <button onClick={connect} disabled={status === 'connecting' || status === 'connected'} className="w-full rounded-lg bg-cyan-700 disabled:opacity-50 p-3 font-semibold text-sm flex items-center justify-center gap-2"><Camera className="w-4 h-4" /> {status === 'connected' ? 'Phone connected' : status === 'connecting' ? 'Connecting…' : 'Approve & connect camera'}</button>
        <div className="aspect-video rounded-lg bg-black overflow-hidden">
          <video ref={videoRef} muted playsInline autoPlay className="w-full h-full object-contain" />
        </div>
        <section className="rounded-xl border border-amber-700/70 bg-amber-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-mono font-bold tracking-wider text-amber-200">VIRTUAL NECKBAND · PC MIRROR</div>
            <span className="rounded-full border border-amber-700 px-2 py-1 text-[10px] text-amber-200">DEMO ONLY</span>
          </div>
          {neckbandState ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{neckbandState.isRunning ? 'Simulation running' : neckbandState.sessionFinished ? 'Demo completed' : 'Simulation paused / idle'}</span>
                <span className="font-mono">{String(Math.floor((neckbandState.elapsedSeconds || 0) / 60)).padStart(2, '0')}:{String((neckbandState.elapsedSeconds || 0) % 60).padStart(2, '0')} / 12:00</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-950 p-3"><div className="text-[10px] text-slate-400">Heart rate</div><div className="text-2xl font-mono">{neckbandState.metrics?.heartRate ?? '—'} <span className="text-xs text-slate-500">bpm</span></div></div>
                <div className="rounded-lg bg-slate-950 p-3"><div className="text-[10px] text-slate-400">SpO₂</div><div className="text-2xl font-mono">{neckbandState.metrics?.spo2 ?? '—'}<span className="text-xs text-slate-500">%</span></div></div>
                <div className="rounded-lg bg-slate-950 p-3"><div className="text-[10px] text-slate-400">Skin temperature</div><div className="text-xl font-mono">{neckbandState.metrics?.skinTemperature ?? '—'}<span className="text-xs text-slate-500"> °C</span></div></div>
                <div className="rounded-lg bg-slate-950 p-3"><div className="text-[10px] text-slate-400">Steps</div><div className="text-xl font-mono">{neckbandState.metrics?.steps?.toLocaleString?.() ?? '—'}</div></div>
              </div>
              {neckbandState.alert && <div role="alert" className="rounded-lg border border-rose-700 bg-rose-950/60 p-3 text-xs text-rose-200">{neckbandState.alert}</div>}
            </>
          ) : <p className="text-xs text-slate-400">Waiting for the PC virtual neckband demo. Start the demo on the computer after pairing.</p>}
          <p className="text-[10px] text-amber-100/60">These are the same fictional demo values shown on the PC. They are not live body measurements or medical telemetry.</p>
        </section>
        <button onClick={enableSpeaker} disabled={speakerEnabled} className="w-full rounded-lg border border-slate-700 p-3 text-sm flex items-center justify-center gap-2 disabled:text-emerald-300"><Volume2 className="w-4 h-4" /> {speakerEnabled ? 'Phone speaker enabled' : 'Enable phone speaker & test greeting'}</button>
        <div className="flex items-center gap-2 text-xs text-slate-300">{status === 'connected' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}{message}</div>
        {status === 'error' && <button onClick={() => { cleanup(); setStatus('idle'); }} className="text-xs text-cyan-300 underline">Try again</button>}
        <p className="text-[10px] text-slate-500">Camera video is peer-to-peer and is not recorded or uploaded by this companion page. The pairing PIN expires after five minutes and the session accepts one phone. Keep this page open during YOMA.</p>
      </section>
    </main>
  );
};
