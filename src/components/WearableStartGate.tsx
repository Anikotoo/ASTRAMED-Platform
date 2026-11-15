import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Activity, Bluetooth, ChevronRight, ShieldCheck, Watch } from 'lucide-react';

interface WearableStartGateProps {
  onConnect: () => void;
  onVirtual: () => void;
  onContinue: () => void;
}

export const WearableStartGate: React.FC<WearableStartGateProps> = ({ onConnect, onVirtual, onContinue }) => {
  const reduceMotion = useReducedMotion();
  const reveal = (delay: number) => reduceMotion
    ? { initial: false, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#030914] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(8,145,178,0.17),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgba(30,64,175,0.12),transparent_45%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(56,189,248,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.22)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <motion.div aria-hidden="true" className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-cyan-400/10" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}>
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_5px_rgba(34,211,238,0.6)]" />
          <div className="absolute inset-7 rounded-full border border-dashed border-cyan-300/10" />
        </motion.div>
        <motion.div aria-hidden="true" className="absolute left-1/2 top-28 h-44 w-44 -translate-x-1/2 rounded-full border border-cyan-300/20 bg-[radial-gradient(circle_at_35%_30%,rgba(103,232,249,0.5),rgba(14,116,144,0.22)_35%,rgba(2,6,23,0.95)_72%)] shadow-[0_0_80px_rgba(8,145,178,0.18)]" animate={reduceMotion ? undefined : { y: [0, -8, 0], scale: [1, 1.025, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="absolute inset-5 rounded-full border border-cyan-100/10" />
          <div className="absolute left-5 top-9 h-12 w-12 rounded-full bg-cyan-200/10 blur-xl" />
          <div className="absolute bottom-5 left-1/2 h-px w-28 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        </motion.div>
      </div>
      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center px-5 py-10 sm:px-8">
        <motion.div {...reveal(0.1)} className="mb-7 flex items-center gap-2 rounded-full border border-cyan-300/20 bg-slate-900/60 px-4 py-2 font-mono text-[10px] tracking-[0.24em] text-cyan-200 shadow-[0_0_30px_rgba(8,145,178,0.1)]">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" /></span>
          MISSION SYSTEMS · INITIALIZATION
        </motion.div>
        <motion.div {...reveal(0.25)} className="relative z-10 mb-5 mt-1 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-cyan-300"><Activity className="h-4 w-4" /><span className="font-mono text-[10px] tracking-[0.35em]">HUMAN SPACEFLIGHT HEALTH SYSTEM</span></div>
          <h1 className="text-5xl font-black tracking-[0.12em] text-white drop-shadow-[0_0_24px_rgba(34,211,238,0.24)] sm:text-7xl">ASTRA<span className="text-cyan-300">MED</span></h1>
          <p className="mt-3 text-sm tracking-[0.2em] text-slate-400 sm:text-base">CREW HEALTH. MISSION CONFIDENCE.</p>
        </motion.div>
        <motion.div {...reveal(0.42)} className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500"><span className="h-px w-8 bg-cyan-400/40" /> Secure workspace ready <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> <span className="h-px w-8 bg-cyan-400/40" /></motion.div>
        <motion.div {...reveal(0.56)} className="w-full max-w-3xl">
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
        <motion.div {...reveal(0.8)} className="mt-8 font-mono text-[9px] tracking-[0.18em] text-slate-600">ASTRAMED · MISSION CONTROL INTERFACE</motion.div>
      </div>
    </div>
  );
};
