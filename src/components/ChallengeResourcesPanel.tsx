import React from 'react';
import { ExternalLink, BookOpen, ShieldAlert, Microscope, RadioTower, Orbit } from 'lucide-react';

export const CHALLENGE_RESOURCES = [
  {
    id: 'nasa-hazards',
    agency: 'NASA',
    title: '5 Hazards of Human Spaceflight',
    description: 'NASA HRP overview of space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments.',
    use: 'Research Library, AI Assistant, Mission Overview',
    feature: 'Scientific context for the five hazard categories; not a live sensor feed.',
    url: 'https://www.nasa.gov/hrp/hazards/'
  },
  {
    id: 'nasa-risks',
    agency: 'NASA',
    title: 'Risks of Human Spaceflight',
    description: 'NASA HRP overview of specific physiological, behavioral-performance, human-factors, and space-radiation risks.',
    use: 'Research Library, AI Assistant, Health Trends, Mission Health Report',
    feature: 'Research context for interpreting recorded readings; does not create or validate a reading.',
    url: 'https://www.nasa.gov/hrp/risks/'
  },
  {
    id: 'nasa-hrp-research',
    agency: 'NASA',
    title: 'Ongoing HRP Research in Space',
    description: 'NASA Human Research Program investigations studying astronaut health and performance in space.',
    use: 'Research Library, AI Assistant',
    feature: 'Links users to ongoing investigations and their original NASA descriptions.',
    url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/'
  },
  {
    id: 'csa-radiation',
    agency: 'Canadian Space Agency (CSA)',
    title: 'Monitoring Radiation for Astronaut Health',
    description: 'CSA overview of radiation-monitoring research and technologies, including development of the Canadian Active Neutron Spectrometer.',
    use: 'Space Environment Monitor, Mission Overview, AI Assistant',
    feature: 'Scientific reference for radiation monitoring; the article is not a live dosimeter or a source of current crew dose values.',
    url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp'
  },
  {
    id: 'csa-space-science',
    agency: 'Canadian Space Agency (CSA)',
    title: 'Why Do We Conduct Science Experiments in Space?',
    description: 'Explains how the unique space environment supports research that advances human spaceflight and can benefit life on Earth.',
    use: 'Research Library, AI Assistant, Mission Health Report',
    feature: 'Background on why space-based experiments matter; not astronaut telemetry.',
    url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp'
  }
] as const;

interface ChallengeResourcesPanelProps {
  compact?: boolean;
}

export const ChallengeResourcesPanel: React.FC<ChallengeResourcesPanelProps> = ({ compact = false }) => (
  <section className="rounded-xl border border-cyan-900/70 bg-slate-950/70 p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[.2em] text-cyan-400">NASA Space Apps Challenge • Challenge Resources</div>
        <h2 className="mt-1 text-sm font-bold text-white">NASA &amp; Space Agency Partner Resources</h2>
        <p className="mt-1 text-xs text-slate-400">Official scientific background used by ASTRAMED. Open the source pages for full details.</p>
      </div>
      <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-mono text-slate-300">5 OFFICIAL SOURCES</span>
    </div>
    <div className={compact ? 'space-y-2' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
      {CHALLENGE_RESOURCES.map((resource, index) => {
        const Icon = index === 0 ? ShieldAlert : index === 1 ? BookOpen : index === 2 ? Microscope : index === 3 ? RadioTower : Orbit;
        return (
          <article key={resource.id} className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-cyan-300">{resource.agency}</div>
                <h3 className="text-xs font-semibold text-white">{resource.title}</h3>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">{resource.description}</p>
            <div className="text-[10px] text-slate-400"><span className="text-slate-300 font-semibold">Used in:</span> {resource.use}</div>
            {!compact && <p className="text-[10px] leading-relaxed text-amber-300/90">{resource.feature}</p>}
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-cyan-200">
              Open official source <ExternalLink className="h-3 w-3" />
            </a>
          </article>
        );
      })}
    </div>
    {!compact && (
      <div className="space-y-2 border-t border-slate-800 pt-3">
        <p className="text-[10px] leading-relaxed text-slate-400">NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.</p>
        <p className="text-[10px] leading-relaxed text-amber-300">Data integrity: these resources provide research and explanatory context. They are not live astronaut telemetry, sensor readings, or proof that a particular crew member has a condition. ASTRAMED keeps them separate from measured mission records.</p>
      </div>
    )}
  </section>
);
