import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { YOLO } from '@ultralytics/yolo';
import { Camera, CameraOff, Loader2, ScanFace, ShieldCheck, Wifi } from 'lucide-react';

const MODEL_URL = 'https://huggingface.co/unileon-robotics/YOLO26-ONNX/resolve/b2ac4fc/yolo26n-pose.onnx';

type PosePoint = [number, number, number];

export const NeckbandStudio: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const neckbandRef = useRef<THREE.Group | null>(null);
  const modelRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inferTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('CAMERA STANDBY');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const host = stageRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 0.75, -0.75, 0.1, 20);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const rig = new THREE.Group();
    scene.add(rig);
    const shell = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.045, 18, 96),
      new THREE.MeshPhysicalMaterial({ color: 0x42dcff, metalness: 0.82, roughness: 0.18, emissive: 0x063e63, emissiveIntensity: 1.1, transparent: true, opacity: 0.92, clearcoat: 1 })
    );
    shell.scale.set(1, 0.62, 0.7);
    rig.add(shell);
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.012, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xc8f8ff, transparent: true, opacity: 0.95 })
    );
    inner.scale.set(1, 0.62, 0.7);
    inner.position.z = 0.035;
    rig.add(inner);
    const leftPod = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 24), new THREE.MeshStandardMaterial({ color: 0x0b4161, metalness: 0.9, roughness: 0.2, emissive: 0x087fae, emissiveIntensity: 1.5 }));
    const rightPod = leftPod.clone();
    leftPod.position.set(-0.48, -0.02, 0.02);
    rightPod.position.set(0.48, -0.02, 0.02);
    rig.add(leftPod, rightPod);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 20), new THREE.MeshBasicMaterial({ color: 0xe0fbff }));
    core.position.set(0, -0.29, 0.05);
    rig.add(core);
    const glow = new THREE.PointLight(0x16cfff, 2.2, 2.5);
    glow.position.set(0, 0, 1);
    rig.add(glow);
    rig.visible = false;
    neckbandRef.current = rig;

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.left = -1;
      camera.right = 1;
      camera.top = height / width;
      camera.bottom = -height / width;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    renderer.setAnimationLoop(() => {
      rig.rotation.z = Math.sin(performance.now() * 0.0008) * 0.025;
      renderer.render(scene, camera);
    });
    rendererRef.current = renderer;

    return () => {
      if (inferTimerRef.current !== null) window.clearInterval(inferTimerRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      shell.geometry.dispose(); (shell.material as THREE.Material).dispose();
      inner.geometry.dispose(); (inner.material as THREE.Material).dispose();
      leftPod.geometry.dispose(); (leftPod.material as THREE.Material).dispose();
      core.geometry.dispose(); (core.material as THREE.Material).dispose();
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
    };
  }, []);

  const stopCamera = () => {
    if (inferTimerRef.current !== null) window.clearInterval(inferTimerRef.current);
    inferTimerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (neckbandRef.current) neckbandRef.current.visible = false;
    setActive(false);
    setLoading(false);
    setStatus('CAMERA STANDBY');
    setConfidence(null);
    busyRef.current = false;
  };

  const trackPose = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !modelRef.current || busyRef.current) return;
    busyRef.current = true;
    try {
      const result: any = await modelRef.current.predict(video, { conf: 0.25, iou: 0.7 });
      const people: PosePoint[][] = Array.isArray(result?.keypoints)
        ? result.keypoints.map((person: any) => person?.points)
            .filter((points: any) => Array.isArray(points) && points.length >= 17)
            .map((points: any[]) => points.map(point => [Number(point[0]), Number(point[1]), Number(point[2])] as PosePoint))
        : [];
      const person = people
        .map(points => ({ points, score: [0, 5, 6].reduce((sum, index) => sum + (points[index]?.[2] || 0), 0) / 3 }))
        .sort((a, b) => b.score - a.score)[0];
      const points = person?.points;
      if (!points || person.score < 0.42) {
        setStatus('PERSON NOT IN FRAME');
        setConfidence(null);
        if (neckbandRef.current) neckbandRef.current.visible = false;
        return;
      }
      const width = Number(result.width || video.videoWidth || 640);
      const height = Number(result.height || video.videoHeight || 480);
      const leftShoulder = points[5];
      const rightShoulder = points[6];
      const nose = points[0];
      if (leftShoulder[2] < 0.35 || rightShoulder[2] < 0.35) {
        setStatus('MOVE SHOULDERS INTO VIEW');
        if (neckbandRef.current) neckbandRef.current.visible = false;
        return;
      }
      const shoulderMidX = (leftShoulder[0] + rightShoulder[0]) / 2;
      const shoulderMidY = (leftShoulder[1] + rightShoulder[1]) / 2;
      const noseY = nose?.[2] > 0.25 ? nose[1] : shoulderMidY - height * 0.2;
      const neckY = noseY + (shoulderMidY - noseY) * 0.72;
      const x = (shoulderMidX / width) * 2 - 1;
      const y = (1 - (neckY / height) * 2) * (height / width);
      const shoulderSpan = Math.abs(rightShoulder[0] - leftShoulder[0]) / width;
      const scale = Math.max(0.12, Math.min(0.52, shoulderSpan * 0.78));
      const rig = neckbandRef.current;
      if (rig) {
        rig.position.set(x, y, 0.2);
        rig.scale.set(scale * 1.55, scale * 0.98, scale);
        rig.visible = true;
      }
      setConfidence(person.score);
      setStatus('POSE LOCKED · NECKBAND TRACKING');
    } catch (err) {
      console.error('Neckband pose tracking error:', err);
      setStatus('TRACKING ERROR');
    } finally {
      busyRef.current = false;
    }
  };

  const startCamera = async () => {
    setError('');
    setLoading(true);
    setStatus('REQUESTING CAMERA');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost in a supported browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Camera preview is unavailable.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('LOADING LOCAL POSE MODEL');
      if (!modelRef.current) modelRef.current = await YOLO.load(MODEL_URL, { device: 'auto' });
      setActive(true);
      setLoading(false);
      setStatus('SEARCHING FOR PERSON');
      inferTimerRef.current = window.setInterval(() => { void trackPose(); }, 300);
    } catch (err: any) {
      stopCamera();
      setError(err?.message || 'Unable to start camera and pose tracking.');
      setStatus('CAMERA ERROR');
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950 shadow-[0_0_50px_rgba(8,145,178,.12)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-400/10 bg-slate-900/80 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[.25em] text-cyan-300"><ScanFace className="h-4 w-4" /> AUGMENTED WEARABLE LAB</div>
          <h2 className="mt-1 text-lg font-bold text-white">Virtual Neckband · Live AR Tracking</h2>
          <p className="mt-1 text-xs text-slate-400">Live camera with a pose-tracked 3D neckband overlay.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-mono ${active ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>{active ? 'CAMERA ACTIVE' : 'OFFLINE'}</span>
          {active ? (
            <button onClick={stopCamera} className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-200"><CameraOff className="h-4 w-4" /> Stop camera</button>
          ) : (
            <button onClick={startCamera} disabled={loading} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} {loading ? 'Starting…' : 'Start live camera'}</button>
          )}
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1.5fr_.8fr]">
        <div className="relative min-h-[300px] bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" />
          <div ref={stageRef} className="pointer-events-none absolute inset-0" />
          {!active && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-center"><div className="rounded-full border border-cyan-400/30 bg-cyan-950/40 p-4"><Camera className="h-8 w-8 text-cyan-300" /></div><div className="text-sm font-semibold text-white">Camera is off</div><div className="max-w-xs text-xs text-slate-400">Start the camera to see your live image and the 3D neckband overlay.</div></div>}
          <div className="absolute left-4 top-4 rounded-lg border border-cyan-300/20 bg-slate-950/75 px-3 py-2 text-[10px] font-mono text-cyan-200 backdrop-blur">LIVE OPTICAL TRACKING</div>
          <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 text-[10px] font-mono text-white/80 backdrop-blur">{status}</div>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><Wifi className="h-4 w-4" /> TRACKING TELEMETRY</div>
            <div className="mt-4 text-3xl font-bold text-white">{confidence === null ? '—' : `${Math.round(confidence * 100)}%`}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">Pose confidence · YOLO26n-Pose</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-semibold text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" /> PRIVACY & DATA</div>
            <p>Camera frames and pose inference stay in this browser. Video is not sent to the ASTRAMED backend or saved as health telemetry.</p>
          </div>
          <div className="text-[10px] leading-relaxed text-slate-500">Prototype limitation: the neckband is positioned from 2D shoulder and nose landmarks. It is an AR visual overlay, not depth-accurate 3D body tracking or a physical device measurement.</div>
          {error && <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</div>}
        </div>
      </div>
    </section>
  );
};
