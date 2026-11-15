import React, { useEffect, useRef, useState } from 'react';
import { Activity, Camera, CheckCircle2, Clock3, Loader2, Play, RefreshCw, ShieldAlert, StopCircle, VideoOff } from 'lucide-react';
import { YOLO } from '@ultralytics/yolo';
import { MovementAssessment, CrewMember } from '../types/astramed';

const MODEL_URL = 'https://huggingface.co/unileon-robotics/YOLO26-ONNX/resolve/b2ac4fc/yolo26n-pose.onnx';
const MODEL_NAME = 'YOLO26n-Pose';
const MODEL_VERSION = 'COCO-17-keypoint pretrained; not microgravity validated';
const PHASES = [
  { name: 'Camera setup', start: 0, end: 30, instruction: 'Position the camera so the full body is visible. Check lighting and keep joints unobstructed.' },
  { name: 'Neutral calibration', start: 30, end: 60, instruction: 'Hold a comfortable neutral position. Keep shoulders, hips, knees and ankles visible.' },
  { name: 'Shoulder movement', start: 60, end: 110, instruction: 'Slowly raise and lower both arms within a comfortable range. Do not force the movement.' },
  { name: 'Elbow movement', start: 110, end: 160, instruction: 'Bend and extend both elbows slowly while keeping the upper arms as steady as possible.' },
  { name: 'Knee movement', start: 160, end: 210, instruction: 'Perform slow knee flexion and extension while keeping hips and ankles visible.' },
  { name: 'Coordination', start: 210, end: 260, instruction: 'Move both arms through a comfortable range together, then alternate sides.' },
  { name: 'Quality review', start: 260, end: 300, instruction: 'Return to neutral and remain visible while the assessment checks its data quality.' }
];
const SKELETON: Array<[number, number]> = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12],
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [0, 1], [0, 2],
  [1, 3], [2, 4], [0, 5], [0, 6]
];
type Point = [number, number, number];
type PhaseSamples = Record<string, number[]>;

function angle(a: Point, b: Point, c: Point): number {
  const v1 = [a[0] - b[0], a[1] - b[1]];
  const v2 = [c[0] - b[0], c[1] - b[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag = Math.hypot(...v1) * Math.hypot(...v2);
  if (!mag) return NaN;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
}
function mean(values: number[]): number | null {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : null;
}
function range(values: number[]): number | null {
  return values.length ? Number((Math.max(...values) - Math.min(...values)).toFixed(1)) : null;
}

interface Props {
  assessments: MovementAssessment[];
  crewList: CrewMember[];
  onRefresh: () => Promise<void> | void;
}

export const YomaMovement: React.FC<Props> = ({ assessments, crewList, onRefresh }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const startMsRef = useRef<number>(0);
  const startedAtRef = useRef<string>('');
  const intervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const samplesRef = useRef<PhaseSamples>({ shoulder: [], elbow: [], knee: [], coordination: [] });
  const phaseCountsRef = useRef<Record<string, number>>({});
  const confidenceRef = useRef<number[]>([]);
  const validFramesRef = useRef(0);
  const rejectedFramesRef = useRef(0);
  const [subjectId, setSubjectId] = useState(crewList[0]?.id || 'crew-anonymous-01');
  const [subjectLabel, setSubjectLabel] = useState(crewList[0]?.name || 'Anonymous crew member');
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'saving' | 'done' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const inferenceIntervalRef = useRef<number | null>(null);
  const [message, setMessage] = useState('');
  const [modelDevice, setModelDevice] = useState('');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [liveAngles, setLiveAngles] = useState({ shoulder: null as number | null, elbow: null as number | null, knee: null as number | null });
  const [lastSaved, setLastSaved] = useState<MovementAssessment | null>(null);\n  const [voiceEnabled, setVoiceEnabled] = useState(false);\n  const lastAnnouncedPhaseRef = useRef<string>('');\n\n  function speakInstruction(text: string) {\n    if (!voiceEnabled || !('speechSynthesis' in window)) return;\n    window.speechSynthesis.cancel();\n    const utterance = new SpeechSynthesisUtterance(text);\n    utterance.rate = 0.92;\n    utterance.onstart = () => undefined;\n    window.speechSynthesis.speak(utterance);\n  }\n\n  useEffect(() => {\n    if (status !== 'running') return;\n    if (lastAnnouncedPhaseRef.current === activePhase.name) return;\n    lastAnnouncedPhaseRef.current = activePhase.name;\n    speakInstruction(activePhase.instruction);\n  }, [activePhase.name, status, voiceEnabled]);\n\n  useEffect(() => {\n    if (status === 'running' && elapsed >= 300) speakInstruction('The five minute movement test is complete. Please review and save the assessment.');\n  }, [elapsed, status, voiceEnabled]);

  const activePhase = PHASES.find(phase => elapsed >= phase.start && elapsed < phase.end) || PHASES[PHASES.length - 1];
  const subjectAssessments = assessments.filter(item => item.subjectId === subjectId.trim());
  const accepted = subjectAssessments.filter(item => item.qualityStatus === 'accepted' && !item.simulated && Date.now() - new Date(item.completedAt).getTime() <= 30 * 86400000);
  const rejected = subjectAssessments.filter(item => item.qualityStatus === 'rejected' && Date.now() - new Date(item.completedAt).getTime() <= 30 * 86400000);
  const chronological = [...accepted].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  const first = chronological[0];
  const latest = chronological[chronological.length - 1];

  useEffect(() => {
    void navigator.mediaDevices?.enumerateDevices().then(devices => setCameraDevices(devices.filter(device => device.kind === 'videoinput'))).catch(() => undefined);
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    if (inferenceIntervalRef.current !== null) window.clearInterval(inferenceIntervalRef.current);
    intervalRef.current = null;
    inferenceIntervalRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    processingRef.current = false;
  }

  function drawPose(points: Point[], width: number, height: number) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = Math.max(2, width / 320);
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#f8fafc';
    for (const [a, b] of SKELETON) {
      if (points[a]?.[2] >= 0.35 && points[b]?.[2] >= 0.35) {
        ctx.beginPath(); ctx.moveTo(points[a][0], points[a][1]); ctx.lineTo(points[b][0], points[b][1]); ctx.stroke();
      }
    }
    for (const point of points) {
      if (point[2] < 0.35) continue;
      ctx.beginPath(); ctx.arc(point[0], point[1], Math.max(3, width / 180), 0, Math.PI * 2); ctx.fill();
    }
  }

  async function inferFrame() {
    const video = videoRef.current;
    const model = modelRef.current;
    if (!video || !model || video.readyState < 2 || processingRef.current) return;
    processingRef.current = true;
    try {
      const result: any = await model.predict(video, { conf: 0.25, iou: 0.7 });
      const raw: Point[] | undefined = result?.keypoints?.[0]?.points;
      if (!raw || raw.length < 17) {
        rejectedFramesRef.current += 1;
        setLiveConfidence(0);
        return;
      }
      const points = raw.map(point => [Number(point[0]), Number(point[1]), Number(point[2])] as Point);
      const elapsedSeconds = Math.min(300, Math.floor((Date.now() - startMsRef.current) / 1000));
      const phase = PHASES.find(item => elapsedSeconds >= item.start && elapsedSeconds < item.end)?.name || 'Quality review';
      const relevant = phase === 'Shoulder movement' ? [5, 6, 7, 8, 11, 12] :
        phase === 'Elbow movement' ? [5, 6, 7, 8, 9, 10] :
        phase === 'Knee movement' ? [11, 12, 13, 14, 15, 16] : [5, 6, 11, 12];
      const confidences = relevant.map(index => points[index]?.[2] || 0);
      const frameConfidence = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
      setLiveConfidence(frameConfidence);
      drawPose(points, Number(result.width || video.videoWidth), Number(result.height || video.videoHeight));

      if (frameConfidence < 0.55) {
        rejectedFramesRef.current += 1;
        return;
      }
      validFramesRef.current += 1;
      confidenceRef.current.push(frameConfidence);
      phaseCountsRef.current[phase] = (phaseCountsRef.current[phase] || 0) + 1;

      const shoulderLeft = angle(points[11], points[5], points[7]);
      const shoulderRight = angle(points[12], points[6], points[8]);
      const elbowLeft = angle(points[5], points[7], points[9]);
      const elbowRight = angle(points[6], points[8], points[10]);
      const kneeLeft = angle(points[11], points[13], points[15]);
      const kneeRight = angle(points[12], points[14], points[16]);
      const avg = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : (Number.isFinite(a) ? a : b);
      const shoulder = avg(shoulderLeft, shoulderRight);
      const elbow = avg(elbowLeft, elbowRight);
      const knee = avg(kneeLeft, kneeRight);
      if (phase === 'Shoulder movement' && Number.isFinite(shoulder)) samplesRef.current.shoulder.push(shoulder);
      if (phase === 'Elbow movement' && Number.isFinite(elbow)) samplesRef.current.elbow.push(elbow);
      if (phase === 'Knee movement' && Number.isFinite(knee)) samplesRef.current.knee.push(knee);
      if (phase === 'Coordination' && Number.isFinite(shoulderLeft) && Number.isFinite(shoulderRight)) samplesRef.current.coordination.push(Math.abs(shoulderLeft - shoulderRight));
      setLiveAngles({
        shoulder: Number.isFinite(shoulder) ? Number(shoulder.toFixed(1)) : null,
        elbow: Number.isFinite(elbow) ? Number(elbow.toFixed(1)) : null,
        knee: Number.isFinite(knee) ? Number(knee.toFixed(1)) : null
      });
    } catch (error) {
      console.error('YOMA pose inference failed:', error);
      rejectedFramesRef.current += 1;
    } finally {
      processingRef.current = false;
    }
  }

  async function startAssessment() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error'); setMessage('Camera access is unavailable. Open ASTRAMED over HTTPS or localhost in a supported browser.'); return;
    }
    if (!subjectId.trim()) { setStatus('error'); setMessage('Enter an anonymous subject ID before starting.'); return; }
    setStatus('loading'); setMessage('Requesting camera permission and loading the YOLO26 nano pose model. The model downloads once and is cached by your browser.');
    try {
      const videoConstraints: MediaTrackConstraints = {
        ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: 'user' }),
        width: { ideal: 640 },
        height: { ideal: 480 }
      };
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      streamRef.current = stream;
      const activeCameraId = stream.getVideoTracks()[0]?.getSettings().deviceId || '';
      if (activeCameraId) setSelectedCameraId(activeCameraId);
      const availableCameras = await navigator.mediaDevices.enumerateDevices();
      setCameraDevices(availableCameras.filter(device => device.kind === 'videoinput'));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!modelRef.current) modelRef.current = await YOLO.load(MODEL_URL, { device: 'auto' });
      setModelDevice(modelRef.current.device || 'browser runtime');
      samplesRef.current = { shoulder: [], elbow: [], knee: [], coordination: [] };
      phaseCountsRef.current = {};
      confidenceRef.current = [];
      validFramesRef.current = 0;
      rejectedFramesRef.current = 0;
      startMsRef.current = Date.now();
      startedAtRef.current = new Date().toISOString();
      setElapsed(0); setLastSaved(null); setLiveConfidence(0);
      setStatus('running'); setMessage('YOMA is processing camera frames locally in this browser. Video is not uploaded to the ASTRAMED server.');
      intervalRef.current = window.setInterval(() => {
        const seconds = Math.min(300, Math.floor((Date.now() - startMsRef.current) / 1000));
        setElapsed(seconds);
        if (seconds >= 300 && intervalRef.current !== null) {
          window.clearInterval(intervalRef.current); intervalRef.current = null;
        }
      }, 250);
      inferenceIntervalRef.current = window.setInterval(() => {
        if (Date.now() - startMsRef.current >= 300000) {
          if (inferenceIntervalRef.current !== null) window.clearInterval(inferenceIntervalRef.current);
          inferenceIntervalRef.current = null;
          return;
        }
        void inferFrame();
      }, 500);
    } catch (error: any) {
      stopCamera(); setStatus('error'); setMessage(error?.message || 'Could not start the camera or load the YOLO pose model.');
    }
  }

  async function saveAssessment() {
    if (elapsed < 300 || status !== 'running') return;
    setStatus('saving'); setMessage('Validating pose coverage and saving the completed YOMA assessment.');
    const shoulderCount = samplesRef.current.shoulder.length;
    const elbowCount = samplesRef.current.elbow.length;
    const kneeCount = samplesRef.current.knee.length;
    const measurements: Record<string, number> = {};
    const shoulderRom = range(samplesRef.current.shoulder);
    const elbowRom = range(samplesRef.current.elbow);
    const kneeRom = range(samplesRef.current.knee);
    const coordination = mean(samplesRef.current.coordination);
    if (shoulderRom !== null) measurements.shoulder_rom_deg = shoulderRom;
    if (elbowRom !== null) measurements.elbow_rom_deg = elbowRom;
    if (kneeRom !== null) measurements.knee_rom_deg = kneeRom;
    if (coordination !== null) measurements.shoulder_asymmetry_deg = coordination;
    const meanConfidence = mean(confidenceRef.current) ?? 0;
    const payload = {
      subjectId: subjectId.trim(),
      subjectLabel: subjectLabel.trim() || 'Anonymous crew member',
      startedAt: startedAtRef.current,
      completedAt: new Date().toISOString(),
      durationSeconds: Math.floor((Date.now() - startMsRef.current) / 1000),
      modelName: MODEL_NAME,
      modelVersion: MODEL_VERSION,
      cameraLabel: streamRef.current?.getVideoTracks()[0]?.label || 'Browser camera',
      source: 'camera_yolo_pose',
      simulated: false,
      measurements,
      quality: {
        validFrames: validFramesRef.current,
        rejectedFrames: rejectedFramesRef.current,
        meanConfidence,
        phaseFrameCounts: { ...phaseCountsRef.current, shoulderSamples: shoulderCount, elbowSamples: elbowCount, kneeSamples: kneeCount }
      }
    };
    try {
      const response = await fetch('/api/movement-assessments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the YOMA assessment.');
      setLastSaved(result);
      setStatus('done');
      setMessage(result.qualityStatus === 'accepted'
        ? 'Assessment saved. Measurements passed the basic pose-quality gate; this is a prototype movement estimate, not a clinical result.'
        : 'Assessment saved as rejected because tracking quality was insufficient. It will not be included in progress comparisons.');
      await onRefresh();
    } catch (error: any) {
      setStatus('error'); setMessage(error?.message || 'Assessment save failed.');
    } finally {
      stopCamera();
    }
  }

  function reset() {
    stopCamera(); setStatus('idle'); setElapsed(0); setMessage(''); setLiveConfidence(0);
    setLiveAngles({ shoulder: null, elbow: null, knee: null });
  }

  const progress = Math.min(100, (elapsed / 300) * 100);
  const metrics = ['shoulder_rom_deg', 'elbow_rom_deg', 'knee_rom_deg', 'shoulder_asymmetry_deg'] as const;
  const labels: Record<string, string> = {
    shoulder_rom_deg: 'Shoulder movement range',
    elbow_rom_deg: 'Elbow movement range',
    knee_rom_deg: 'Knee movement range',
    shoulder_asymmetry_deg: 'Mean shoulder side-to-side angle difference'
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400"><Activity className="w-4 h-4" /> YOMA • CAMERA-BASED MOBILITY ASSESSMENT</div>
        <h1 className="text-xl font-bold text-white mt-1">Five-minute movement test</h1>
        <p className="text-xs text-slate-400 mt-1">YOLO26 nano pose estimation runs in the browser. No wearable movement markers and no video upload are required. Any camera exposed to this browser can be selected; raw RTSP streams need a separate WebRTC gateway.</p>
        <div className="mt-3 p-3 rounded-lg border border-amber-800/70 bg-amber-950/30 text-[11px] text-amber-200">
          Model licence: the browser inference package and YOLO weights are published under AGPL-3.0; check licensing before any closed-source or commercial distribution. Prototype limitation: the pretrained model uses ordinary human COCO poses. It has not been validated for spacesuits, microgravity, restraint systems, occlusion or clinical range-of-motion measurement. This is a ground-prototype assessment only.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white font-mono">CAMERA FEED &amp; POSE TRACKING</h2>
            <span className="text-[10px] font-mono text-slate-400">{modelDevice ? `INFERENCE: ${modelDevice.toUpperCase()}` : 'MODEL NOT LOADED'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => {
              const enabled = !voiceEnabled;
              setVoiceEnabled(enabled);
              if (enabled && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('YOMA voice instructions enabled.');
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
              }
            }} className={voiceEnabled ? "px-3 py-2 rounded-lg bg-cyan-900/60 border border-cyan-700 text-cyan-200 text-xs" : "px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs"}>
              {voiceEnabled ? 'Voice instructions: ON' : 'Enable voice instructions'}
            </button>
            <span className="text-[10px] text-slate-500">Uses this device's browser speech output. Remote phone-speaker pairing is not implemented yet.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] text-slate-400 font-mono">CAMERA INPUT</label>
            <select value={selectedCameraId} onChange={event => setSelectedCameraId(event.target.value)} disabled={status === 'running' || status === 'loading' || status === 'saving'} className="min-w-0 flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200">
              <option value="">Default browser camera</option>
              {cameraDevices.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
            </select>
            <span className="text-[10px] text-slate-500">{cameraDevices.length} camera(s) detected</span>
          </div>
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-contain" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
            {status !== 'running' && status !== 'saving' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-950/80">
                {status === 'error' ? <VideoOff className="w-8 h-8" /> : <Camera className="w-8 h-8" />}
                <span className="text-xs font-mono">{status === 'done' ? 'ASSESSMENT COMPLETE' : status === 'error' ? 'CAMERA / MODEL ERROR' : 'CAMERA PREVIEW INACTIVE'}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Live pose confidence</span>
            <span className={liveConfidence >= 0.55 ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>{(liveConfidence * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-cyan-400 transition-all" style={{ width: `${liveConfidence * 100}%` }} /></div>
          <div className="flex flex-wrap gap-2">
            {status === 'idle' || status === 'error' ? (
              <button onClick={startAssessment} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2"><Play className="w-4 h-4" /> Start camera test</button>
            ) : status === 'loading' ? (
              <button disabled className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading model</button>
            ) : status === 'running' && elapsed >= 300 ? (
              <button onClick={saveAssessment} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Validate &amp; save assessment</button>
            ) : status === 'running' ? (
              <button onClick={reset} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-2"><StopCircle className="w-4 h-4" /> Cancel test</button>
            ) : status === 'saving' ? (
              <button disabled className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 text-xs flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving</button>
            ) : (
              <button onClick={reset} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-2"><RefreshCw className="w-4 h-4" /> New test</button>
            )}
            {status === 'done' && <span className="text-xs text-emerald-400 self-center">{lastSaved?.qualityStatus?.toUpperCase()} RECORD</span>}
          </div>
          {message && <p className="text-[11px] text-slate-300 bg-slate-950 rounded-lg border border-slate-800 p-3">{message}</p>}
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-white font-mono">ASSESSMENT SUBJECT</h2>
            {crewList.length > 0 && <>
              <label className="block text-[10px] text-slate-400 font-mono">LINK TO CREW PROFILE (OPTIONAL)</label>
              <select value={crewList.some(member => member.id === subjectId) ? subjectId : ''} onChange={event => {
                const member = crewList.find(item => item.id === event.target.value);
                if (member) { setSubjectId(member.id); setSubjectLabel(member.name); }
                else { setSubjectId('crew-anonymous-01'); setSubjectLabel('Anonymous crew member'); }
              }} disabled={status === 'running' || status === 'loading'} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="">Anonymous subject (not linked to crew)</option>
                {crewList.map(member => <option key={member.id} value={member.id}>{member.name} • {member.callsign}</option>)}
              </select>
            </>}
            <label className="block text-[10px] text-slate-400 font-mono">SUBJECT ID</label>
            <input value={subjectId} onChange={event => setSubjectId(event.target.value)} disabled={status === 'running' || status === 'loading'} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            <label className="block text-[10px] text-slate-400 font-mono">DISPLAY LABEL</label>
            <input value={subjectLabel} onChange={event => setSubjectLabel(event.target.value)} disabled={status === 'running' || status === 'loading'} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            <div className="text-[10px] text-slate-500">Use an anonymous ID. Do not enter astronaut names or sensitive personal identifiers.</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-white font-mono">FIVE-MINUTE PROTOCOL</h2><span className="font-mono text-cyan-300 text-sm">{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} / 05:00</span></div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${progress}%` }} /></div>
            <div className="p-3 rounded-lg bg-slate-950 border border-cyan-800/60">
              <div className="text-[10px] text-cyan-400 font-mono">{activePhase.name.toUpperCase()}</div>
              <p className="text-xs text-slate-300 mt-1">{activePhase.instruction}</p>
            </div>
            {PHASES.map(phase => <div key={phase.name} className="flex items-center gap-2 text-[10px]"><span className={elapsed >= phase.end ? 'text-emerald-400' : activePhase.name === phase.name ? 'text-cyan-300' : 'text-slate-500'}>{elapsed >= phase.end ? '✓' : '•'}</span><span className={activePhase.name === phase.name ? 'text-white' : 'text-slate-400'}>{phase.name}</span><span className="ml-auto text-slate-500 font-mono">{phase.end - phase.start}s</span></div>)}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <h2 className="text-sm font-bold text-white font-mono">LIVE JOINT ANGLES</h2>
            {Object.entries(liveAngles).map(([key, value]) => <div key={key} className="flex justify-between text-xs"><span className="text-slate-400 capitalize">{key}</span><span className="font-mono text-white">{value === null ? '—' : `${value}°`}</span></div>)}
            <p className="text-[10px] text-slate-500">2D image-plane angles only. These are not 3D anatomical joint angles.</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-sm font-bold text-white font-mono">30-DAY MOBILITY TIMELINE</h2><p className="text-[11px] text-slate-400">Only quality-accepted, non-simulated camera assessments for this subject appear in comparisons. Suggested cadence: Day 1 baseline, then Days 7, 14, 21 and 30.</p></div><span className="text-xs font-mono text-cyan-300">{chronological.length} accepted • {rejected.length} rejected</span></div>
        {chronological.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-700 rounded-lg"><Clock3 className="w-7 h-7 text-slate-500 mx-auto mb-2" /><p className="text-sm text-slate-300">No accepted YOMA assessments yet</p><p className="text-xs text-slate-500 mt-1">Complete a five-minute camera test to establish the first baseline.</p></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {metrics.map(key => {
                const initial = first?.measurements?.[key];
                const current = latest?.measurements?.[key];
                const delta = initial !== undefined && current !== undefined ? Number((current - initial).toFixed(1)) : null;
                return <div key={key} className="bg-slate-950 border border-slate-800 rounded-lg p-3"><div className="text-[10px] text-slate-400">{labels[key]}</div><div className="text-lg text-white font-mono mt-1">{current === undefined ? '—' : `${current}°`}</div><div className="text-[10px] text-slate-500 mt-1">{delta === null ? 'Baseline / comparison pending' : `${delta > 0 ? '+' : ''}${delta}° from first accepted test`}</div></div>;
              })}
            </div>
            <div className="space-y-2">
              {chronological.map((item, index) => {
                const dayNumber = Math.max(1, Math.floor((new Date(item.completedAt).getTime() - new Date(first!.completedAt).getTime()) / 86400000) + 1);
                return <div key={item.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs"><span className="text-cyan-300 font-mono">DAY {dayNumber} • TEST {index + 1}</span><span className="text-slate-300">{new Date(item.completedAt).toLocaleString()}</span><span className="text-slate-500">{item.subjectId}</span><span className="ml-auto text-emerald-400">{item.quality.validFrames} valid frames • {(item.quality.meanConfidence * 100).toFixed(0)}% confidence</span></div>;
              })}
            </div>
          </>
        )}
        {rejected.length > 0 && <div className="text-[10px] text-amber-300 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> {rejected.length} low-quality assessment(s) retained for audit but excluded from progress calculations.</div>}
      </div>
    </div>
  );
};
