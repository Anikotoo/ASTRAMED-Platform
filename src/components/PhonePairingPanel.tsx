import React, { useEffect, useRef, useState } from 'react';
import { Camera, Link2, QrCode, Smartphone, Volume2, Wifi, WifiOff } from 'lucide-react';

interface Props {
  onCameraStream: (stream: MediaStream | null) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Network setup timed out. Check both devices are online and retry.')), 12000);
    const done = () => {
      if (pc.iceGatheringState === 'complete') {
        window.clearTimeout(timeout);
        pc.removeEventListener('icegatheringstatechange', done);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', done);
    done();
  });
}

async function readJson(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Phone pairing request failed.');
  return data;
}

export const PhonePairingPanel: React.FC<Props> = ({ onCameraStream, onSpeakReady }) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const hostTokenRef = useRef('');
  const pollRef = useRef<number | null>(null);
  const [pairId, setPairId] = useState('');
  const [pin, setPin] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState('');

  function stopPolling() {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function disconnect() {
    stopPolling();
    channelRef.current?.close();
    pcRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;
    hostTokenRef.current = '';
    onCameraStream(null);
    setStatus('idle');
    setPairId('');
    setPin('');
    setExpiresAt('');
  }

  useEffect(() => () => {
    stopPolling();
    channelRef.current?.close();
    pcRef.current?.close();
    onCameraStream(null);
  }, []);

  async function createPairing() {
    disconnect();
    setError('');
    try {
      const created = await readJson(await fetch('/api/phone-pairing/create', { method: 'POST' }));
      setPairId(created.pairId);
      setPin(created.pin);
      setExpiresAt(created.expiresAt);
      hostTokenRef.current = created.hostToken;
      setStatus('waiting');

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      pc.addTransceiver('video', { direction: 'sendrecv' });
      const channel = pc.createDataChannel('astramed-control');
      channelRef.current = channel;
      channel.onopen = () => {
        setStatus('connected');
        channel.send(JSON.stringify({ type: 'speak', text: 'Hello. ASTRAMED phone companion is connected. YOMA is ready to use your phone camera and speaker.' }));
      };
      channel.onclose = () => {
        if (pc.connectionState !== 'closed') setStatus('waiting');
      };
      pc.ontrack = event => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        onCameraStream(stream);
        setStatus('connected');
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Phone connection lost. Try pairing again; some networks block direct WebRTC connections.');
          setStatus('error');
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      await readJson(await fetch(`/api/phone-pairing/${created.pairId}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${created.hostToken}` },
        body: JSON.stringify({ sdp: pc.localDescription })
      }));

      let attempts = 0;
      pollRef.current = window.setInterval(async () => {
        if (++attempts > 90 || !pcRef.current) {
          stopPolling();
          if (pc.connectionState !== 'connected') setError('Pairing expired. Generate a new QR code and PIN.');
          return;
        }
        try {
          const response = await fetch(`/api/phone-pairing/${created.pairId}/answer`, {
            headers: { Authorization: `Bearer ${hostTokenRef.current}` }
          });
          if (response.status === 204) return;
          const answer = await readJson(response);
          if (!pc.currentRemoteDescription) {
            await pc.setRemoteDescription(answer.sdp);
            stopPolling();
          }
        } catch (err: any) {
          setError(err.message || 'Could not complete phone connection.');
          setStatus('error');
          stopPolling();
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Could not create a secure phone pairing.');
      setStatus('error');
    }
  }

  function speakOnPhone(text: string) {
    if (channelRef.current?.readyState === 'open') {
      channelRef.current.send(JSON.stringify({ type: 'speak', text }));
      return true;
    }
    return false;
  }

  const companionUrl = pairId ? `${window.location.origin}/phone-companion?pair=${encodeURIComponent(pairId)}` : '';
  const qrUrl = companionUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(companionUrl)}`
    : '';

  return (
    <section className="rounded-xl border border-cyan-800/70 bg-slate-950/80 p-4 space-y-3">
      <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono"><Smartphone className="w-4 h-4" /> PHONE CAMERA + SPEAKER COMPANION</div>
      <p className="text-xs text-slate-400">Pair your phone to use its camera as YOMA's video source and its speaker for spoken greetings and instructions. Video is sent peer-to-peer; it is not uploaded to the ASTRAMED server.</p>
      {status === 'idle' || status === 'error' ? (
        <button type="button" onClick={createPairing} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold flex items-center gap-2"><QrCode className="w-4 h-4" /> Generate secure QR pairing</button>
      ) : (
        <div className="flex flex-wrap gap-3 items-start">
          <div className="bg-white p-2 rounded-lg">
            <img src={qrUrl} alt="QR code containing the temporary phone companion link" width="160" height="160" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="text-[10px] text-slate-400 font-mono">ONE-TIME PAIRING PIN</div>
            <div className="text-3xl tracking-[0.25em] font-mono text-white">{pin}</div>
            <div className="text-[11px] text-slate-400">Scan the QR on your phone, then enter this PIN. Expires at {new Date(expiresAt).toLocaleTimeString()}.</div>
            <div className="flex items-center gap-2 text-xs">
              {status === 'connected' ? <Wifi className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-amber-300" />}
              <span className={status === 'connected' ? 'text-emerald-300' : 'text-amber-200'}>{status === 'connected' ? 'Phone connected — camera and speaker ready' : status === 'connecting' ? 'Negotiating WebRTC connection…' : 'Waiting for phone to scan and approve'}</span>
            </div>
            <button type="button" onClick={disconnect} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs">Disconnect phone</button>
          </div>
        </div>
      )}
      {status === 'connected' && <div className="flex items-center gap-2 text-[11px] text-emerald-300"><Camera className="w-4 h-4" /><Volume2 className="w-4 h-4" /> Phone camera is available to YOMA; phone speech is enabled after phone-side audio permission.</div>}
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <p className="text-[10px] text-slate-500">Security: the QR contains only a random temporary session ID; the separate PIN is required to join. The QR image is rendered by a third-party QR service, which receives the opaque session link but not the PIN. WebRTC uses STUN for direct connectivity; restrictive networks may prevent connection because no TURN relay is configured.</p>
    </section>
  );
};
