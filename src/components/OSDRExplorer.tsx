import React, { useState } from 'react';
import { Search, Database, ExternalLink, FileDown, Info, Loader2 } from 'lucide-react';

type Study = { id: string; title: string; description: string; organism: string; source: any };
type StudyFile = { name: string; url: string; type: string; size: string; source: any };

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

function normalizeFiles(payload: any): StudyFile[] {
  const raw = findArrays(payload, ['study_files', 'files', 'results', 'items']);
  return raw.map((item: any) => {
    const remote = textOf(item.remote_url, item.download_url, item.url, item.href);
    const url = remote ? (remote.startsWith('http') ? remote : `https://osdr.nasa.gov${remote.startsWith('/') ? '' : '/'}${remote}`) : '';
    return {
      name: textOf(item.file_name, item.filename, item.name, item.label, item.remote_url) || 'NASA OSDR file',
      url,
      type: textOf(item.category, item.file_type, item.data_type, item.type, item.file_category),
      size: (() => { const bytes = Number(item.file_size ?? item.size); return Number.isFinite(bytes) && bytes > 0 ? (bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(1)} GB` : bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`) : textOf(item.file_size, item.size); })(),
      source: item
    };
  }).filter((file: StudyFile) => file.url || file.name);
}

export const OSDRExplorer: React.FC = () => {
  const [term, setTerm] = useState('human spaceflight physiology');
  const [studies, setStudies] = useState<Study[]>([]);
  const [selected, setSelected] = useState<Study | null>(null);
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    if (!term.trim()) return;
    setLoadingSearch(true);
    setError('');
    setSelected(null);
    setFiles([]);
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

  const openFiles = async (study: Study) => {
    setSelected(study);
    setFiles([]);
    setLoadingFiles(true);
    setError('');
    try {
      const response = await fetch(`/api/osdr/studies/${encodeURIComponent(study.id.replace('OSD-', ''))}/files`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not retrieve NASA study files');
      setFiles(normalizeFiles(payload));
      if (!normalizeFiles(payload).length) setError('No downloadable file records were found in the API response. Open the study page and use its Files panel.');
    } catch (err: any) {
      setError(err.message || 'Could not retrieve study files.');
    } finally {
      setLoadingFiles(false);
    }
  };

  return (
    <section className="rounded-xl border border-cyan-900/60 bg-slate-950/80 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-cyan-950 p-2 text-cyan-300"><Database className="w-5 h-5" /></div>
        <div className="min-w-0">
          <div className="text-xs font-mono text-cyan-300">NASA OPEN SCIENCE DATA REPOSITORY</div>
          <h2 className="text-base font-bold text-white mt-1">NASA OSDR Data Explorer</h2>
          <p className="text-xs text-slate-400 mt-1">Search studies and inspect original NASA files. Research datasets are kept separate from live crew telemetry.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input value={term} onChange={e => setTerm(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') search(); }} placeholder="Search e.g. human astronaut bone loss" className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
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
            <button onClick={() => openFiles(study)} className="shrink-0 rounded-md border border-cyan-800 px-3 py-1.5 text-[11px] text-cyan-300 hover:bg-cyan-950">Browse files</button>
          </div>
          {study.description && <p className="text-xs text-slate-400 line-clamp-3">{study.description}</p>}
          <a className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300" href={`https://osdr.nasa.gov/bio/repo/data/studies/${study.id}`} target="_blank" rel="noreferrer">Open NASA study <ExternalLink className="w-3 h-3" /></a>
        </div>)}
      </div>}

      {selected && <div className="rounded-lg border border-cyan-900/60 bg-slate-900 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div><div className="text-[10px] font-mono text-cyan-300">FILE CATALOG</div><div className="text-sm font-bold text-white">{selected.id} · {selected.title}</div></div>
          <a href={`https://osdr.nasa.gov/bio/repo/data/studies/${selected.id}`} target="_blank" rel="noreferrer" className="text-cyan-300"><ExternalLink className="w-4 h-4" /></a>
        </div>
        {loadingFiles ? <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading file catalog…</div> : files.length > 0 ? files.map((file, index) => <div key={index} className="flex items-start justify-between gap-3 border-t border-slate-800 pt-2">
          <div className="min-w-0"><div className="text-xs text-slate-200 break-all">{file.name}</div><div className="text-[10px] text-slate-500 mt-1">{file.type}{file.size ? ` · ${file.size}` : ''}</div></div>
          {file.url && <a href={file.url} target="_blank" rel="noreferrer" className="shrink-0 text-cyan-300" title="Open original NASA file"><FileDown className="w-4 h-4" /></a>}
        </div>) : !loadingFiles && <p className="text-xs text-slate-400">Open the NASA study page's Files panel to inspect the full file catalog and download the original archive. Extract it locally if it is ZIP/TAR before reviewing any CSV.</p>}
      </div>}

      <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400">
        <Info className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
        <p>OSDR files are not automatically imported as crew telemetry. Many are ZIP, TAR, FASTQ or gene-expression files—not vital-sign CSVs. Download the original file, inspect its documentation, and only use the existing CSV importer for a genuinely compatible table. Never map a research subject to a live crew member unless the study explicitly supports that identity.</p>
      </div>
      <a href="https://osdr.nasa.gov/bio/repo/search" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200">Open full NASA OSDR search portal <ExternalLink className="w-3 h-3" /></a>
    </section>
  );
};
