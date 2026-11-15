import React, { useEffect, useRef, useState } from 'react';
import { Camera, Copy, Link2, Smartphone, Volume2, Wifi } from 'lucide-react';

interface Props {
  onCameraStream: (stream: MediaStream | null) => void;
  onSpeakReady?: (speak: ((text: string) => boolean) | null) => void;
  onNeckbandStateSender?: (send: ((state: any) => void) | null) => void;
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

export const PhonePairingPanel: React.FC<Props> = ({ onCameraStream, onSpeakReady, onNeckbandStateSender }) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const hostTokenRef = useRef('');
  const pollRef = useRef<number | null>(null);
  const [pairId, setPairId] = useState('');
  const [pin, setPin] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<'idle' | 'preparing' | 'waiting' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  function stopPolling() {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function disconnect() {
    stopPolling();
    const activePairId = pairId;
    const activeHostToken = hostTokenRef.current;
    if (activePairId && activeHostToken) void fetch(`/api/phone-pairing/${activePairId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${activeHostToken}` } }).catch(() => undefined);
    channelRef.current?.close();
    pcRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;
    hostTokenRef.current = '';
    onCameraStream(null);
    onSpeakReady?.(null);
    onNeckbandStateSender?.(null);
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
    onSpeakReady?.(null);
    onNeckbandStateSender?.(null);
  }, []);

  async function createPairing() {
    disconnect();
    setError('');
    setStatus('preparing');
    let created: any = null;
    let pc: RTCPeerConnection | null = null;
    try {
      created = await readJson(await fetch('/api/phone-pairing/create', { method: 'POST' }));
      hostTokenRef.current = created.hostToken;
      pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      pc.addTransceiver('video', { direction: 'sendrecv' });
      const channel = pc.createDataChannel('astramed-control');
      channelRef.current = channel;
      channel.onopen = () => {
        onSpeakReady?.(speakOnPhone);
        onNeckbandStateSender?.((state: any) => {
          if (channel.readyState === 'open') channel.send(JSON.stringify({ type: 'neckband-state', state }));
        });
        setStatus('connected');
        channel.send(JSON.stringify({ type: 'speak', text: 'Hello. ASTRAMED phone companion is connected. YOMA is ready to use your phone camera and speaker.' }));
      };
      channel.onclose = () => {
        onNeckbandStateSender?.(null);
        if (pc && pcRef.current === pc && pc.connectionState !== 'closed' && pc.connectionState !== 'failed') setStatus('waiting');
      };
      pc.ontrack = event => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        onCameraStream(stream);
        if (pc?.connectionState === 'connected') setStatus('connected');
      };
      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === 'failed') {
          setError('Phone connection failed. Try pairing again; some networks block direct WebRTC connections.');
          setStatus('error');
        } else if (pc?.connectionState === 'disconnected') {
          setError('Phone connection was interrupted. Waiting for the network to recover…');
          setStatus('connecting');
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
      // Reveal the QR/PIN only after the host offer is available to the phone.
      setPairId(created.pairId);
      setPin(created.pin);
      setExpiresAt(created.expiresAt);
      setStatus('waiting');
      let attempts = 0;
      pollRef.current = window.setInterval(async () => {
        if (++attempts > 90 || pcRef.current !== pc) {
          stopPolling();
          if (pc?.connectionState !== 'connected') setError('Pairing expired. Create a new phone session and PIN.');
          return;
        }
        try {
          const response = await fetch(`/api/phone-pairing/${created.pairId}/answer`, {
            headers: { Authorization: `Bearer ${hostTokenRef.current}` }
          });
          if (response.status === 204) return;
          const answer = await readJson(response);
          if (!pc?.currentRemoteDescription) {
            setStatus('connecting');
            await pc?.setRemoteDescription(answer.sdp);
            stopPolling();
          }
        } catch (err: any) {
          setError(err.message || 'Could not complete phone connection.');
          setStatus('error');
          stopPolling();
        }
      }, 1000);
    } catch (err: any) {
      stopPolling();
      pc?.close();
      if (pcRef.current === pc) pcRef.current = null;
      channelRef.current = null;
      if (created?.pairId && created?.hostToken) void fetch(`/api/phone-pairing/${created.pairId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${created.hostToken}` }
      }).catch(() => undefined);
      hostTokenRef.current = '';
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

  return (
    <section className="rounded-xl border border-cyan-800/70 bg-slate-950/80 p-4 space-y-3">
      <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono"><Smartphone className="w-4 h-4" /> PHONE CAMERA + SPEAKER COMPANION</div>
      <p className="text-xs text-slate-400">Pair your phone to use its camera as YOMA's video source and its speaker for spoken greetings and instructions. Video is sent peer-to-peer; it is not uploaded to the ASTRAMED server.</p>
      {status === 'idle' || status === 'error' ? (
        <button type="button" onClick={createPairing} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold flex items-center gap-2"><Link2 className="w-4 h-4" /> Create phone connection</button>
      ) : status === 'preparing' ? (
        <div className="flex items-center gap-2 text-xs text-cyan-200"><Link2 className="w-4 h-4 animate-pulse" /> Preparing secure connection. The phone link and PIN will appear when ready…</div>
      ) : (
        <div className="min-w-0 space-y-3">
          <div className="text-[10px] text-slate-400 font-mono">OPEN THIS LINK ON YOUR PHONE</div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-cyan-200 break-all select-all">{companionUrl}</div>
          <button type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(companionUrl);
              setLinkCopied(true);
            } catch {
              setLinkCopied(false);
              setError('Clipboard access unavailable. Select and copy the phone link above manually.');
            }
          }} className="px-3 py-2 rounded-lg border border-cyan-700 text-cyan-200 text-xs flex items-center gap-2"><Copy className="w-4 h-4" /> {linkCopied ? 'Link copied' : 'Copy phone link'}</button>
          <div className="text-[10px] text-slate-400 font-mono">ONE-TIME PAIRING PIN</div>
          <div className="text-3xl tracking-[0.25em] font-mono text-white">{pin}</div>
          <div className="text-[11px] text-slate-400">Open the link in Chrome on your phone, then enter this PIN. Expires at {new Date(expiresAt).toLocaleTimeString()}.</div>
          <div className="flex items-center gap-2 text-xs">
            {status === 'connected' ? <Wifi className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-amber-300" />}
            <span className={status === 'connected' ? 'text-emerald-300' : 'text-amber-200'}>{status === 'connected' ? 'Phone connected — camera and speaker ready' : status === 'connecting' ? 'Negotiating WebRTC connection…' : 'Waiting for phone to open the link and approve'}</span>
          </div>
          <button type="button" onClick={disconnect} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs">Disconnect phone</button>
        </div>
      )}
      {status === 'connected' && <div className="flex items-center gap-2 text-[11px] text-emerald-300"><Camera className="w-4 h-4" /><Volume2 className="w-4 h-4" /> Phone camera is available to YOMA; phone speech is enabled after phone-side audio permission.</div>}
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <p className="text-[10px] text-slate-500">Security: the phone link contains a temporary session ID; the separate six-digit PIN is required to join. No QR code or third-party QR service is used. WebRTC uses STUN for direct connectivity; restrictive networks may prevent connection because no TURN relay is configured.</p>
    </section>
  );
};
