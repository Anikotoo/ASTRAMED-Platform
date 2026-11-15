import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, ChevronDown, ChevronUp, Camera, Watch, BookOpen, Sparkles } from 'lucide-react';
import { NavSection } from './Sidebar';

interface MrsSpaceGuideProps {
  onNavigate: (section: NavSection) => void;
}

export const MrsSpaceGuide: React.FC<MrsSpaceGuideProps> = ({ onNavigate }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <section aria-label="Mrs. Space navigation guide" className="relative z-20 border-b border-cyan-900/50 bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/40 bg-slate-900 text-2xl shadow-lg shadow-cyan-950/40">
          <span role="img" aria-label="Astronaut guide">👩🏻‍🚀</span>
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-wide text-cyan-200">MRS. SPACE</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-900 bg-cyan-950/60 px-2 py-0.5 text-[9px] text-cyan-300"><Sparkles className="h-3 w-3" /> YOUR MISSION GUIDE</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-200 sm:text-sm">Hello, astronaut! Welcome to ASTRAMED. I’ll help you find tests, connect devices, and understand the research—one step at a time.</p>
        </div>
        <button onClick={() => setExpanded(value => !value)} className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white" aria-expanded={expanded} aria-label={expanded ? 'Hide Mrs. Space quick actions' : 'Show Mrs. Space quick actions'}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }} transition={{ duration: 0.2 }} className="mx-auto mt-3 flex max-w-7xl flex-wrap gap-2 overflow-hidden pl-0 sm:pl-[60px]">
            <button onClick={() => onNavigate('yoma')} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cyan-800/70 bg-cyan-950/40 px-3 py-2 text-[11px] font-medium text-cyan-100 hover:bg-cyan-900/60"><Camera className="h-4 w-4" /> Sir, you can run a movement test</button>
            <button onClick={() => onNavigate('smartwatch')} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-800/70 bg-amber-950/30 px-3 py-2 text-[11px] font-medium text-amber-100 hover:bg-amber-900/50"><Watch className="h-4 w-4" /> Set up a neckband or device</button>
            <button onClick={() => onNavigate('research')} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-medium text-slate-200 hover:border-cyan-800"><BookOpen className="h-4 w-4" /> Explain NASA research simply</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="sr-only"><Bot /> Mrs. Space is a navigation helper. She does not run tests or connect devices automatically.</div>
    </section>
  );
};
