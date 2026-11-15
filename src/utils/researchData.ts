import { ResearchStudy } from '../types/astramed';

// No bundled studies are labelled verified until every identifier and metadata field has been checked against its source.
export const VERIFIED_SPACE_RESEARCH: ResearchStudy[] = [];

const NASA_OSDR_SEARCH = 'https://osdr.nasa.gov/osdr/data/search';

function cleanText(value: unknown, maxLength = 5000): string {
  if (Array.isArray(value)) return value.map(item => cleanText(item, maxLength)).filter(Boolean).join(', ').slice(0, maxLength);
  if (value && typeof value === 'object') return '';
  return String(value ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function readField(record: Record<string, unknown>, aliases: string[]): unknown {
  const wanted = new Set(aliases.map(normalizedKey));
  for (const [key, value] of Object.entries(record)) {
    if (wanted.has(normalizedKey(key)) && value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function collectOsdrRecords(payload: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const seen = new Set<object>();
  const visit = (value: unknown, depth = 0, inheritedAccession = '') => {
    if (!value || typeof value !== 'object' || depth > 8 || seen.has(value as object)) return;
    seen.add(value as object);
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, depth + 1, inheritedAccession));
      return;
    }
    const record = value as Record<string, unknown>;
    const directAccession = Object.keys(record).find(key => /^OSD-?\\d+(?:\\.\\d+)?$/i.test(key));
    const accession = directAccession || inheritedAccession;
    const hasTitle = readField(record, ['Study Title', 'title', 'study_title']) !== undefined;
    const hasId = readField(record, ['Accession', 'Study Identifier', 'osdId', 'id']) !== undefined || Boolean(accession);
    if (hasTitle && hasId) {
      found.push(accession && !readField(record, ['Accession', 'Study Identifier', 'osdId', 'id'])
        ? { ...record, Accession: accession }
        : record);
    }
    for (const [key, child] of Object.entries(record)) {
      const childAccession = /^OSD-?\\d+(?:\\.\\d+)?$/i.test(key) ? key : accession;
      visit(child, depth + 1, childAccession);
    }
  };
  visit(payload);
  return found;
}
function classifyCategory(title: string, abstract: string): ResearchStudy['category'] {
  const text = `${title} ${abstract}`.toLowerCase();
  if (/cardio|heart|vascular|blood pressure/.test(text)) return 'Cardiovascular Health';
  if (/muscle|atrophy|musculoskeletal|strength/.test(text)) return 'Musculoskeletal Health';
  if (/bone|density|osteopenia|skeletal/.test(text)) return 'Bone Loss';
  if (/radiation|cosmic ray|ionizing/.test(text)) return 'Radiation';
  if (/sleep|circadian/.test(text)) return 'Sleep and Circadian Rhythm';
  if (/microgravity|sans|ocular|vestibular/.test(text)) return 'Microgravity';
  if (/psych|confinement|behavior/.test(text)) return 'Psychological Health';
  return 'General Spaceflight Medicine';
}

function mapOsdrRecord(record: Record<string, unknown>, index: number): ResearchStudy | null {
  const title = cleanText(readField(record, ['Study Title', 'title', 'study_title']), 500);
  const accessionRaw = cleanText(readField(record, ['Accession', 'Study Identifier', 'osdId', 'id']), 100);
  const accession = (accessionRaw.match(/OSD-?\d+(?:\.\d+)?/i)?.[0] || Object.keys(record).find(key => /^OSD-\d+/i.test(key)) || '').replace(/^OSD(?=\d)/i, 'OSD-').toUpperCase();
  if (!title || !accession) return null;

  const abstract = cleanText(readField(record, ['Study Description', 'description', 'summary', 'Study Summary']), 5000) || 'NASA OSDR study record. Open the original repository record for the full study description, methods, files and access conditions.';
  const authorText = cleanText(readField(record, ['Study Publication Author List', 'authors', 'author']), 1000);
  const authors = authorText ? authorText.split(/,|;/).map(item => item.trim()).filter(Boolean) : [];
  const yearRaw = readField(record, ['Study Publication Date', 'publication_date', 'pubYear', 'year', 'Study Public Release Date']);
  const yearText = cleanText(yearRaw);
  let year = /^\\d{4}/.test(yearText) ? Number(yearText.slice(0, 4)) : 0;
  if (!year && Number.isFinite(Number(yearRaw)) && Number(yearRaw) > 1000000000) year = new Date(Number(yearRaw) * 1000).getUTCFullYear();
  const journal = cleanText(readField(record, ['Study Publication Title', 'journal', 'publication']), 500) || 'NASA Open Science Data Repository';
  const lower = `${title} ${abstract}`.toLowerCase();
  const studyType: ResearchStudy['studyType'] = /review|meta-analysis/.test(lower) ? 'Review' : /cohort|observational/.test(lower) ? 'Observational Study' : /experiment|spaceflight|flight study/.test(lower) ? 'Experimental Study' : 'Unknown';

  return {
    id: `nasa-osdr-${accession.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
    title,
    authors,
    year,
    journal,
    abstract,
    osdrId: accession,
    source: 'NASA OSDR',
    category: classifyCategory(title, abstract),
    studyType,
    url: `https://osdr.nasa.gov/bio/repo/search?q=${encodeURIComponent(accession)}&data_source=cgene`
  };
}

async function searchNasaOsdr(query: string, categoryFilter?: string): Promise<ResearchStudy[]> {
  const params = new URLSearchParams();
  const terms = [query.trim() || 'astronaut spaceflight health', categoryFilter && categoryFilter !== 'All' ? categoryFilter : ''].filter(Boolean);
  params.set('term', terms.join(' '));
  params.set('from', '0');
  params.set('size', '15');
  params.set('type', 'cgene');

  const response = await fetch(`${NASA_OSDR_SEARCH}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`NASA OSDR returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  return collectOsdrRecords(payload)
    .map(mapOsdrRecord)
    .filter((study): study is ResearchStudy => Boolean(study))
    .filter((study, index, all) => all.findIndex(item => item.osdrId === study.osdrId) === index);
}

async function searchEuropePmc(query: string, categoryFilter?: string): Promise<ResearchStudy[]> {
  const params = new URLSearchParams();
  let q = query ? `${query} (astronaut OR spaceflight OR microgravity)` : 'astronaut spaceflight health';
  if (categoryFilter && categoryFilter !== 'All') q += ` "${categoryFilter}"`;
  params.set('query', q);
  params.set('format', 'json');
  params.set('pageSize', '15');
  params.set('resultType', 'core');

  const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Europe PMC returned HTTP ${response.status}`);
  const data = await response.json();
  const items = data.resultList?.result || [];
  return items.map((it: Record<string, unknown>, idx: number): ResearchStudy => {
    const title = cleanText(it.title || 'Untitled Space Medicine Study', 500);
    const abstract = cleanText(it.abstractText || 'Abstract unavailable from repository index.');
    const authors = it.authorString ? String(it.authorString).split(',').map(s => s.trim()).filter(Boolean) : [];
    const year = Number(it.pubYear) || 0;
    const journal = cleanText(it.journalTitle || 'Journal unavailable', 500);
    const doi = it.doi ? String(it.doi) : undefined;
    const pmid = it.pmid ? String(it.pmid) : undefined;
    const lower = `${title} ${abstract}`.toLowerCase();
    let studyType: ResearchStudy['studyType'] = 'Unknown';
    if (lower.includes('systematic review') || lower.includes('meta-analysis')) studyType = 'Systematic Review / Meta-analysis';
    else if (lower.includes('clinical trial')) studyType = 'Clinical Trial';
    else if (lower.includes('review')) studyType = 'Review';
    else if (lower.includes('observational') || lower.includes('cohort')) studyType = 'Observational Study';
    else if (lower.includes('experiment')) studyType = 'Experimental Study';

    return {
      id: `epmc-${it.id || idx}`,
      title,
      authors,
      year,
      journal,
      abstract,
      doi,
      pmid,
      source: 'Europe PMC',
      category: classifyCategory(title, abstract),
      studyType,
      url: doi ? `https://doi.org/${doi}` : (pmid ? `https://europepmc.org/article/MED/${pmid}` : `https://europepmc.org/search?query=${encodeURIComponent('EXT_ID:' + String(it.id || ''))}`)
    };
  });
}

export async function searchResearchStudies(
  query: string,
  categoryFilter?: string,
  studyTypeFilter?: string
): Promise<ResearchStudy[]> {
  const results = await Promise.allSettled([
    searchNasaOsdr(query, categoryFilter),
    searchEuropePmc(query, categoryFilter)
  ]);

  const nasaStudies = results[0].status === 'fulfilled' ? results[0].value : [];
  const europeStudies = results[1].status === 'fulfilled' ? results[1].value : [];
  const combined = [...nasaStudies, ...europeStudies];
  const filtered = studyTypeFilter && studyTypeFilter !== 'All'
    ? combined.filter(study => study.studyType === studyTypeFilter)
    : combined;

  if (filtered.length > 0) return filtered;
  if (results.every(result => result.status === 'rejected')) {
    throw new Error('NASA OSDR and Europe PMC are both unavailable. Please retry when repository access is restored.');
  }

  return [...VERIFIED_SPACE_RESEARCH];
}
