import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, ChevronDown, ChevronUp, Camera, Watch, BookOpen, Sparkles, ArrowRight, HelpCircle, Activity, Database, FileInput, Users, Settings, LineChart, MessageCircle } from 'lucide-react';
import { NavSection } from './Sidebar';

interface MrsSpaceGuideProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

type GuideAction = { label: string; section: NavSection; icon: React.ComponentType<{ className?: string }> };
type GuideContent = { title: string; message: string; tip: string; actions: GuideAction[] };

const GUIDE: Record<NavSection, GuideContent> = {
  overview: {
    title: 'Your mission at a glance',
    message: 'This is mission control. Start by choosing an astronaut, then review available readings, alerts and recent activity.',
    tip: 'A blank or “No data” card means no reading has been received yet. It does not mean the astronaut is healthy or unhealthy.',
    actions: [{ label: 'View crew', section: 'crew_profiles', icon: Users }, { label: 'Enter a reading', section: 'enter_readings', icon: FileInput }, { label: 'Try a camera test', section: 'yoma', icon: Camera }]
  },
  crew_body: {
    title: 'Explore the astronaut body monitor',
    message: 'Choose a crew member and explore the body map. Select a muscle to inspect the available information and related research.',
    tip: 'The 3D body map is an educational and monitoring interface. It does not measure muscle strength by itself.',
    actions: [{ label: 'Run movement test', section: 'yoma', icon: Camera }, { label: 'View health trends', section: 'trends', icon: LineChart }, { label: 'Related research', section: 'research', icon: BookOpen }]
  },
  trends: {
    title: 'Understand health trends',
    message: 'This page plots recorded readings over time. Select a crew member and parameter to see how recorded values change.',
    tip: 'A trend needs actual dated readings. Research papers and demo values are not live crew telemetry.',
    actions: [{ label: 'Enter a reading', section: 'enter_readings', icon: FileInput }, { label: 'Import records', section: 'importer', icon: Database }, { label: 'Ask AI to explain', section: 'ai_assistant', icon: MessageCircle }]
  },
  ai_assistant: {
    title: 'Ask the ASTRAMED AI assistant',
    message: 'Ask a question in everyday language—for example, “What does SpO₂ mean?” or “Summarise this crew member’s recorded readings.”',
    tip: 'The assistant should distinguish measured readings, system alerts and published research. It is not a doctor and cannot invent missing measurements.',
    actions: [{ label: 'Review crew readings', section: 'crew_body', icon: Activity }, { label: 'Explore research', section: 'research', icon: BookOpen }]
  },
  research: {
    title: 'Make sense of space-health research',
    message: 'Search NASA OSDR and Europe PMC studies. Open a study to read its source, accession details and research summary.',
    tip: 'Research datasets describe experiments and populations. They are not automatically the current health readings of your selected astronaut.',
    actions: [{ label: 'Ask AI to explain', section: 'ai_assistant', icon: MessageCircle }, { label: 'View crew monitor', section: 'crew_body', icon: Activity }]
  },
  importer: {
    title: 'Bring in your own records',
    message: 'Use the importer to upload supported CSV or JSON health records. Check the file format and review the imported records before relying on them.',
    tip: 'Imported records are user-provided and may remain unverified. Importing a NASA research dataset does not turn it into an individual crew member’s live telemetry.',
    actions: [{ label: 'Enter one reading', section: 'enter_readings', icon: FileInput }, { label: 'Check trends', section: 'trends', icon: LineChart }]
  },
  enter_readings: {
    title: 'Add a health reading',
    message: 'Choose the astronaut, select the measurement, enter its value, unit and time, then save. Use a real measured or properly documented value.',
    tip: 'Never guess a value to fill an empty card. Include a clear source and notes where available.',
    actions: [{ label: 'View crew monitor', section: 'crew_body', icon: Activity }, { label: 'Import a file', section: 'importer', icon: Database }]
  },
  yoma: {
    title: 'Prepare a camera movement assessment',
    message: 'Allow camera access, position the camera so the full body is visible, then follow each on-screen movement instruction at a comfortable pace.',
    tip: 'YOLO pose estimation tracks visible body keypoints. It cannot measure heart rate, oxygen, blood pressure or radiation, and this model is not validated for microgravity.',
    actions: [{ label: 'View body monitor', section: 'crew_body', icon: Activity }, { label: 'Open wearable devices', section: 'smartwatch', icon: Watch }]
  },
  smartwatch: {
    title: 'Connect a wearable or try the virtual neckband',
    message: 'Try connecting a compatible Bluetooth heart-rate device, or start the clearly labelled virtual neckband demonstration.',
    tip: 'The virtual neckband produces simulated demo values only. Bluetooth support depends on the device and browser; this screen currently reads the standard heart-rate service only.',
    actions: [{ label: 'View recorded trends', section: 'trends', icon: LineChart }, { label: 'Enter a verified reading', section: 'enter_readings', icon: FileInput }]
  },
  crew_profiles: {
    title: 'Manage astronaut profiles',
    message: 'Create or select a crew profile so readings and movement assessments can be associated with the correct person.',
    tip: 'Use real or anonymised information and avoid adding personal details that are not needed for the mission.',
    actions: [{ label: 'Open crew monitor', section: 'crew_body', icon: Activity }, { label: 'Add health reading', section: 'enter_readings', icon: FileInput }]
  },
  settings: {
    title: 'Configure your mission workspace',
    message: 'Review mission settings and available integrations. Only configure services you actually have credentials and permission to use.',
    tip: 'A configured integration does not mean a sensor is connected or that live telemetry is arriving.',
    actions: [{ label: 'Check device lab', section: 'smartwatch', icon: Watch }, { label: 'Back to overview', section: 'overview', icon: Activity }]
  }
};

export const MrsSpaceGuide: React.FC< MrsSpaceGuideProps > = ({ activeSection, onNavigate }) => {
  const [expanded, setExpanded] = useState(true);
  const guide = GUIDE[activeSection] || GUIDE.overview;

  return (
    <section aria-label="Mrs. Space interactive mission guide" className="relative z-20 border-b border-cyan-900/50 bg-gradient-to-r from-slate-950 via-cyan-950/30 to-slate-950 px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <motion.div animate={{ y: [0, -2, 0], rotate: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/40 bg-slate-900 text-2xl shadow-lg shadow-cyan-950/40">
          <span role="img" aria-label="Mrs. Space astronaut guide">👩🏻‍🚀</span>
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-wide text-cyan-200">MRS. SPACE</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-900 bg-cyan-950/60 px-2 py-0.5 text-[9px] text-cyan-300"><Sparkles className="h-3 w-3" /> YOUR MISSION GUIDE</span>
            <span className="text-[9px] text-slate-500">GUIDE • {activeSection.replace('_', ' ').toUpperCase()}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeSection} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
              <p className="mt-1 text-xs font-semibold text-white sm:text-sm">{guide.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{activeSection === 'overview' ? 'Hello, astronaut! Welcome to ASTRAMED. ' : ''}{guide.message}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={() => setExpanded(value => !value)} className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white" aria-expanded={expanded} aria-label={expanded ? 'Collapse Mrs. Space guide' : 'Expand Mrs. Space guide'}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }} transition={{ duration: 0.2 }} className="mx-auto mt-3 max-w-7xl overflow-hidden sm:pl-[60px]">
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2">
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
              <p className="text-[11px] leading-relaxed text-amber-100/90"><span className="font-semibold">Mrs. Space tip:</span> {guide.tip}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {guide.actions.map(action => {
                const Icon = action.icon;
                return <button key={action.section} onClick={() => onNavigate(action.section)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cyan-900/70 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-cyan-100 transition-colors hover:border-cyan-500/70 hover:bg-cyan-950/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"><Icon className="h-3.5 w-3.5" />{action.label}<ArrowRight className="h-3 w-3 opacity-60" /></button>;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="sr-only"><Bot /> Mrs. Space provides contextual navigation and educational tips. She does not perform tests, connect devices or provide medical diagnoses.</div>
    </section>
  );
};
