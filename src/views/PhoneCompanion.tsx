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
  const [phoneToken, setPhoneToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState('Connect this phone to provide YOMA camera video and spoken guidance.');
  const [speakerEnabled, setSpeakerEnabled] = useState(false);

  function cleanup() {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }
  useEffect(() => () => cleanup(), []);

  async function connect() {
    if (!pairId) { setStatus('error'); setMessage('This pairing link is missing its temporary session ID. Scan a fresh QR code.'); return; }
    if (!/^\d{6}$/.test(pin)) { setStatus('error'); setMessage('Enter the six-digit PIN shown on the computer.'); return; }
    setStatus('connecting'); setMessage('Requesting camera permission and connecting securely…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS and a supported browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }

      const joined = await json(await fetch(`/api/phone-pairing/${encodeURIComponent(pairId)}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin })
      }));
      setPhoneToken(joined.phoneToken);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.ondatachannel = event => {
        event.channel.onmessage = messageEvent => {
          try {
            const command = JSON.parse(messageEvent.data);
            if (command.type === 'speak' && typeof command.text === 'string' && speakerEnabled && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(command.text.slice(0, 400)));
            }
          } catch { /* Ignore malformed remote control messages. */ }
        };
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') { setStatus('connected'); setMessage('Connected. Keep this page open; your phone camera is feeding YOMA.'); }
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus('error'); setMessage('Connection lost. Return to the computer and create a new pairing session.');
        }
      };
      await pc.setRemoteDescription(joined.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await new Promise<void>((resolve, reject) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const timeout = window.setTimeout(() => reject(new Error('Network setup timed out. Try another network.')), 12000);
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            window.clearTimeout(timeout);
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
      });
      await json(await fetch(`/api/phone-pairing/${encodeURIComponent(pairId)}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${joined.phoneToken}` },
        body: JSON.stringify({ sdp: pc.localDescription })
      }));
      setMessage('WebRTC answer sent. Waiting for the computer to finish connecting…');
    } catch (error: any) {
      cleanup(); setStatus('error'); setMessage(error.message || 'Could not connect this phone.');
    }
  }

  function enableSpeaker() {
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
        <button onClick={enableSpeaker} disabled={speakerEnabled} className="w-full rounded-lg border border-slate-700 p-3 text-sm flex items-center justify-center gap-2 disabled:text-emerald-300"><Volume2 className="w-4 h-4" /> {speakerEnabled ? 'Phone speaker enabled' : 'Enable phone speaker & test greeting'}</button>
        <div className="flex items-center gap-2 text-xs text-slate-300">{status === 'connected' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}{message}</div>
        {status === 'error' && <button onClick={() => { cleanup(); setStatus('idle'); }} className="text-xs text-cyan-300 underline">Try again</button>}
        <p className="text-[10px] text-slate-500">Camera video is peer-to-peer and is not recorded or uploaded by this companion page. The pairing PIN expires after five minutes and the session accepts one phone. Keep this page open during YOMA.</p>
      </section>
    </main>
  );
};
