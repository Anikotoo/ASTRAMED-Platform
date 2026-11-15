import React, { useState } from 'react';
import { Search, Database, ExternalLink, Info, Loader2 } from 'lucide-react';

type Study = { id: string; title: string; description: string; organism: string; source: any };
const textOf = (...values: unknown[]) => {
  const value = values.find(v => typeof v === 'string' || typeof v === 'number');
  return value == null ? '' : String(value);
};

function findArrays(value: any, keys: string[]): any[] {
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const child of Object.values(value)) {
    const found = findArrays(child, keys);
    if (found.length) return found;
  }
  return [];
}

function normalizeStudies(payload: any): Study[] {
  const raw = findArrays(payload, ['studies', 'study_hits', 'results', 'items', 'hits']);
  const candidates = raw.flatMap((item: any) => item?._source ? [item._source] : [item]);
  return candidates.map((item: any) => {
    const id = textOf(item.Accession, item.accession, item.osd_accession, item.study_accession, item.osd_id, item.id, item._id).match(/(?:OSD-?)?\d+(?:\.\d+)?/i)?.[0] || '';
    const normalizedId = id ? (id.toUpperCase().startsWith('OSD') ? id.toUpperCase().replace(/^OSD(?=\d)/, 'OSD-') : `OSD-${id}`) : '';
    return {
      id: normalizedId,
      title: textOf(item['Study Title'], item.study_title, item.title, item.name, item.study_name, item.label) || (normalizedId ? `NASA OSDR study ${normalizedId}` : 'Untitled study'),
      description: textOf(item['Study Description'], item.study_description, item.description, item.summary),
      organism: textOf(item.organism, item.organisms, item['study.characteristics.organism']),
      source: item
    };
  }).filter((item: Study) => item.id);
}

export const OSDRExplorer: React.FC = () => {
  const [term, setTerm] = useState('astronaut');
  const [studies, setStudies] = useState<Study[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (!term.trim()) return;
    setLoadingSearch(true);
    setError('');
    try {
      const response = await fetch(`/api/osdr/search?term=${encodeURIComponent(term.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'NASA OSDR search failed');
      const results = normalizeStudies(payload);
      setStudies(results);
      if (!results.length) setError('NASA responded, but no study records could be normalized from this search. Open NASA OSDR Search to inspect the original results.');
    } catch (err: any) {
      setError(err.message || 'Could not reach NASA OSDR.');
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <section className="rounded-xl border border-cyan-900/60 bg-slate-950/80 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-cyan-950 p-2 text-cyan-300"><Database className="w-5 h-5" /></div>
        <div className="min-w-0">
          <div className="text-xs font-mono text-cyan-300">NASA OPEN SCIENCE DATA REPOSITORY</div>
          <h2 className="text-base font-bold text-white mt-1">NASA OSDR Data Explorer</h2>
          <p className="text-xs text-slate-400 mt-1">Search NASA studies and open their official pages to access files manually. Research datasets remain separate from live crew telemetry.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input value={term} onChange={e => setTerm(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search(); }} placeholder="Search e.g. astronaut, bone loss, muscle atrophy" className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
        <button onClick={search} disabled={loadingSearch || !term.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white">
          {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search OSDR
        </button>
      </div>

      {error && <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200">{error}</div>}

      {studies.length > 0 && <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">{studies.length} studies returned</div>
        {studies.map(study => <div key={study.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-cyan-400">{study.id}</div>
              <div className="text-sm font-semibold text-white">{study.title}</div>
              {study.organism && <div className="text-[11px] text-slate-400 mt-1">Organism: {study.organism}</div>}
            </div>
          </div>
          {study.description && <p className="text-xs text-slate-400 line-clamp-3">{study.description}</p>}
          <a className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300" href={`https://osdr.nasa.gov/bio/repo/data/studies/${study.id}`} target="_blank" rel="noreferrer">Open NASA study <ExternalLink className="w-3 h-3" /></a>
        </div>)}
      </div>}

      <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400">
        <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
        <p>Use each study's official NASA page and its Files panel to inspect and download original datasets manually. OSDR files are not automatically imported as crew telemetry. Many are ZIP, TAR, FASTQ or gene-expression files—not vital-sign CSVs. Only use the existing CSV importer for a genuinely compatible table, and never map a research subject to a live crew member unless the study explicitly supports that identity.</p>
      </div>
      <a href="https://osdr.nasa.gov/bio/repo/search" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200">Open full NASA OSDR search portal <ExternalLink className="w-3 h-3" /></a>
    </section>
  );
};
