import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Activity, Bluetooth, ChevronRight, ShieldCheck, Watch, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface WearableStartGateProps {
  onConnect: () => void;
  onVirtual: () => void;
  onContinue: () => void;
}

const GREETING = "Hello, astronaut. I'm Mrs. Space, your mission guide. Welcome to ASTRAMED. Let's prepare your mission workspace.";

export const WearableStartGate: React.FC<WearableStartGateProps> = ({ onConnect, onVirtual, onContinue }) => {
  const reduceMotion = useReducedMotion();
  const [introComplete, setIntroComplete] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [voiceState, setVoiceState] = useState<'speaking' | 'ready' | 'unavailable'>('ready');
  const [speechFinished, setSpeechFinished] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const words = GREETING.split(' ');

  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === 'suspended') void audioContextRef.current.resume();
    } catch {
      // Browser audio may be unavailable; the visual typewriter still works.
    }
  }, []);

  const playTypewriterTick = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || context.state !== 'running') return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(920, now);
      oscillator.frequency.exponentialRampToValueAtTime(560, now + 0.025);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.014, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.034);
    } catch {
      // Sound effects are optional and must never block the intro.
    }
  }, []);

  const speakGreeting = useCallback(() => {
    unlockAudio();
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setVoiceState('unavailable');
      setSpeechFinished(true);
      return;
    }
    window.speechSynthesis.cancel();
    setSpeechFinished(false);
    const utterance = new SpeechSynthesisUtterance(GREETING);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => /en-US/i.test(voice.lang) && /female|samantha|aria|jenny/i.test(voice.name))
      || voices.find(voice => /en/i.test(voice.lang));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onstart = () => setVoiceState('speaking');
    utterance.onend = () => { setVoiceState('ready'); setSpeechFinished(true); };
    utterance.onerror = () => { setVoiceState('unavailable'); setSpeechFinished(true); };
    window.speechSynthesis.speak(utterance);
  }, [unlockAudio]);

  useEffect(() => {
    speakGreeting();
    const interval = window.setInterval(() => {
      setVisibleWords(current => {
        if (current >= words.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, reduceMotion ? 1 : 105);
    const fallback = window.setTimeout(() => setIntroComplete(true), reduceMotion ? 900 : 11000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(fallback);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [reduceMotion, speakGreeting, words.length]);

  useEffect(() => {
    if (visibleWords > 0) playTypewriterTick();
  }, [visibleWords, playTypewriterTick]);

  useEffect(() => {
    if (visibleWords >= words.length && speechFinished) {
      const delay = window.setTimeout(() => setIntroComplete(true), 650);
      return () => window.clearTimeout(delay);
    }
  }, [visibleWords, words.length, speechFinished]);

  const reveal = (delay: number) => reduceMotion
    ? { initial: false, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.24, delay, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div onPointerDownCapture={unlockAudio} onKeyDownCapture={unlockAudio} className="fixed inset-0 z-[100] overflow-y-auto bg-[#030914] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(8,145,178,0.17),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgba(30,64,175,0.12),transparent_45%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(56,189,248,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.22)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <motion.div aria-hidden="true" className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-cyan-400/10" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}>
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_5px_rgba(34,211,238,0.6)]" />
          <div className="absolute inset-7 rounded-full border border-dashed border-cyan-300/10" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {!introComplete ? (
          <motion.div key="mrs-space-intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.025, filter: 'blur(8px)' }} transition={{ duration: 0.55 }} className="relative mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col items-center justify-center px-5 py-10 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.72, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 115, damping: 16 }} className="relative mb-7 flex h-36 w-36 items-center justify-center rounded-[2.2rem] border border-cyan-300/35 bg-slate-900/80 text-7xl shadow-[0_0_75px_rgba(8,145,178,0.22)]">
              <span role="img" aria-label="Mrs. Space astronaut guide">👩🏻‍🚀</span>
              <motion.span aria-hidden="true" className="absolute -inset-3 rounded-[2.8rem] border border-cyan-300/20" animate={reduceMotion ? undefined : { opacity: [0.25, 0.8, 0.25], scale: [0.98, 1.04, 0.98] }} transition={{ duration: 2.8, repeat: Infinity }} />
              <span className="absolute -bottom-2 -right-2 rounded-full border-4 border-[#030914] bg-emerald-400 p-2"><Sparkles className="h-4 w-4 text-slate-950" /></span>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-mono text-[10px] tracking-[0.38em] text-cyan-300">ASTRAMED · MISSION GUIDE</motion.p>
            <h1 className="mt-3 text-3xl font-black tracking-[0.12em] text-white sm:text-5xl">MRS. <span className="text-cyan-300">SPACE</span></h1>
            <div className="mt-7 min-h-[116px] max-w-2xl rounded-2xl border border-cyan-900/70 bg-slate-950/75 px-5 py-5 shadow-[0_15px_55px_rgba(8,145,178,0.12)] sm:px-8">
              <p aria-live="polite" className="text-base font-medium leading-8 text-cyan-50 sm:text-xl">
                {words.slice(0, visibleWords).map((word, index) => <React.Fragment key={index}>{word}{index < visibleWords - 1 ? ' ' : ''}</React.Fragment>)}
                {visibleWords < words.length && <span className="ml-1 inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-cyan-300" />}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-[10px] font-mono tracking-[0.18em] text-slate-500">
              {voiceState === 'speaking' ? <Volume2 className="h-4 w-4 animate-pulse text-cyan-300" /> : voiceState === 'unavailable' ? <VolumeX className="h-4 w-4 text-amber-300" /> : <Activity className="h-4 w-4 text-cyan-400" />}
              {voiceState === 'speaking' ? 'MRS. SPACE IS SPEAKING' : voiceState === 'unavailable' ? 'VOICE NOT AVAILABLE · TEXT INTRO CONTINUES' : 'INITIALIZING MISSION GUIDE'}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={speakGreeting} className="rounded-full border border-cyan-800 bg-cyan-950/50 px-4 py-2 text-xs text-cyan-200 hover:bg-cyan-900/70"><Volume2 className="mr-2 inline h-3.5 w-3.5" /> Enable sound + replay voice</button>
              <button onClick={() => { setVisibleWords(words.length); setIntroComplete(true); }} className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-400 hover:border-cyan-700 hover:text-cyan-200">Skip intro</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="mission-options" initial={{ opacity: 0, y: 18, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center px-5 py-10 sm:px-8">
            <motion.div {...reveal(0.05)} className="mb-7 flex items-center gap-2 rounded-full border border-cyan-300/20 bg-slate-900/60 px-4 py-2 font-mono text-[10px] tracking-[0.24em] text-cyan-200 shadow-[0_0_30px_rgba(8,145,178,0.1)]">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" /></span>
              MISSION SYSTEMS · INITIALIZATION
            </motion.div>
            <motion.div {...reveal(0.18)} className="relative z-10 mb-5 mt-1 text-center">
              <div className="mb-3 flex items-center justify-center gap-2 text-cyan-300"><Activity className="h-4 w-4" /><span className="font-mono text-[10px] tracking-[0.35em]">HUMAN SPACEFLIGHT HEALTH SYSTEM</span></div>
              <h1 className="text-5xl font-black tracking-[0.12em] text-white drop-shadow-[0_0_24px_rgba(34,211,238,0.24)] sm:text-7xl">ASTRA<span className="text-cyan-300">MED</span></h1>
              <p className="mt-3 text-sm tracking-[0.2em] text-slate-400 sm:text-base">CREW HEALTH. MISSION CONFIDENCE.</p>
            </motion.div>
            <motion.div {...reveal(0.3)} className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500"><span className="h-px w-8 bg-cyan-400/40" /> Secure workspace ready <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> <span className="h-px w-8 bg-cyan-400/40" /></motion.div>
            <motion.div {...reveal(0.42)} className="w-full max-w-3xl">
              <div className="mb-4 text-center"><h2 className="text-xl font-semibold text-white sm:text-2xl">Initialize your mission workspace</h2><p className="mt-2 text-sm text-slate-400">Choose how you want to connect. You can also enter without a device.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <motion.button whileHover={reduceMotion ? undefined : { y: -4 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }} onClick={onConnect} className="group rounded-2xl border border-cyan-400/30 bg-slate-900/75 p-5 text-left shadow-[0_12px_50px_rgba(8,145,178,0.08)] backdrop-blur-xl transition-colors hover:border-cyan-300/70 hover:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                  <div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"><Bluetooth className="h-6 w-6" /></div><ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300" /></div>
                  <div className="mt-5 text-lg font-semibold">Connect smartwatch</div><p className="mt-2 text-sm leading-6 text-slate-400">Connect a compatible Bluetooth Low Energy device exposing the standard Heart Rate Service. Browser and device support are required.</p><div className="mt-5 font-mono text-[10px] tracking-[0.15em] text-cyan-300">BLUETOOTH DEVICE LINK</div>
                </motion.button>
                <motion.button whileHover={reduceMotion ? undefined : { y: -4 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }} onClick={onVirtual} className="group rounded-2xl border border-amber-400/25 bg-slate-900/75 p-5 text-left shadow-[0_12px_50px_rgba(217,119,6,0.06)] backdrop-blur-xl transition-colors hover:border-amber-300/60 hover:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-200"><Watch className="h-6 w-6" /></div><ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-amber-200" /></div>
                  <div className="mt-5 text-lg font-semibold">Virtual neckband demo</div><p className="mt-2 text-sm leading-6 text-slate-400">Explore the 12-minute demonstration with fictional sample metrics and demo alerts. It does not measure your body.</p><div className="mt-5 font-mono text-[10px] tracking-[0.15em] text-amber-200">SIMULATION ENVIRONMENT</div>
                </motion.button>
              </div>
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-center text-xs leading-5 text-amber-100/75">DEMO NOTICE: Virtual values are fictional. They are not medical monitoring and are never saved as astronaut health readings.</div>
              <div className="mt-6 text-center"><button onClick={onContinue} className="rounded-full border border-slate-700/80 px-5 py-2.5 text-xs text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400">Continue without connecting a device <span aria-hidden="true">→</span></button></div>
            </motion.div>
            <motion.div {...reveal(0.65)} className="mt-8 font-mono text-[9px] tracking-[0.18em] text-slate-600">ASTRAMED · MISSION CONTROL INTERFACE</motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
