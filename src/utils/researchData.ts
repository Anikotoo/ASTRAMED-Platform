import { ResearchStudy } from '../types/astramed';

// No bundled studies are labelled verified until every identifier and metadata field has been checked against its source.
export const VERIFIED_SPACE_RESEARCH: ResearchStudy[] = [];

export async function searchResearchStudies(
  query: string,
  categoryFilter?: string,
  studyTypeFilter?: string
): Promise<ResearchStudy[]> {
  // First query Europe PMC API via backend proxy or directly
  try {
    const params = new URLSearchParams();
    let q = query ? `${query} (astronaut OR spaceflight OR microgravity)` : 'astronaut spaceflight health';
    if (categoryFilter && categoryFilter !== 'All') {
      q += ` "${categoryFilter}"`;
    }
    params.set('query', q);
    params.set('format', 'json');
    params.set('pageSize', '15');
    params.set('resultType', 'core');

    const res = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      const items = data.resultList?.result || [];
      if (items.length > 0) {
        const liveStudies: ResearchStudy[] = items.map((it: Record<string, unknown>, idx: number) => {
          const title = String(it.title || 'Untitled Space Medicine Study').replace(/<[^>]+>/g, '');
          const abstract = String(it.abstractText || 'Abstract unavailable from repository index.').replace(/<[^>]+>/g, '');
          const authors = it.authorString ? String(it.authorString).split(',').map(s => s.trim()).filter(Boolean) : [];
          const year = Number(it.pubYear) || 0;
          const journal = String(it.journalTitle || 'Journal unavailable');
          const doi = it.doi ? String(it.doi) : undefined;
          const pmid = it.pmid ? String(it.pmid) : undefined;
          
          let studyType: ResearchStudy['studyType'] = 'Unknown';
          const lowerTitle = title.toLowerCase();
          const lowerAbs = abstract.toLowerCase();
          if (lowerTitle.includes('systematic review') || lowerTitle.includes('meta-analysis')) {
            studyType = 'Systematic Review / Meta-analysis';
          } else if (lowerTitle.includes('clinical trial') || lowerAbs.includes('clinical trial')) {
            studyType = 'Clinical Trial';
          } else if (lowerTitle.includes('review') || lowerAbs.includes('literature review')) {
            studyType = 'Review';
          } else if (lowerAbs.includes('observational') || lowerAbs.includes('cohort')) {
            studyType = 'Observational Study';
          }

          let category: ResearchStudy['category'] = 'General Spaceflight Medicine';
          if (lowerTitle.includes('cardio') || lowerTitle.includes('heart') || lowerAbs.includes('vascular')) category = 'Cardiovascular Health';
          else if (lowerTitle.includes('muscle') || lowerTitle.includes('atrophy') || lowerAbs.includes('musculoskeletal')) category = 'Musculoskeletal Health';
          else if (lowerTitle.includes('bone') || lowerTitle.includes('density') || lowerAbs.includes('osteopenia')) category = 'Bone Loss';
          else if (lowerTitle.includes('radiation') || lowerAbs.includes('cosmic ray')) category = 'Radiation';
          else if (lowerTitle.includes('sleep') || lowerTitle.includes('circadian')) category = 'Sleep and Circadian Rhythm';
          else if (lowerTitle.includes('sans') || lowerTitle.includes('ocular') || lowerAbs.includes('microgravity')) category = 'Microgravity';
          else if (lowerTitle.includes('psych') || lowerAbs.includes('confinement')) category = 'Psychological Health';
          else if (lowerTitle.includes('vestibular') || lowerAbs.includes('otolith')) category = 'Vestibular and Sensorimotor Health';

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
            category,
            studyType,
            url: doi ? `https://doi.org/${doi}` : (pmid ? `https://europepmc.org/article/MED/${pmid}` : `https://europepmc.org/search?query=${encodeURIComponent('EXT_ID:' + String(it.id || ''))}`)
          };
        });

        // Filter by studyType if requested
        if (studyTypeFilter && studyTypeFilter !== 'All') {
          return liveStudies.filter(s => s.studyType === studyTypeFilter);
        }
        return liveStudies;
      }
    }
  } catch {
    // If network or CORS fails, gracefully fall back to our verified space research database
  }

  // Filter local verified curated repository
  let results = [...VERIFIED_SPACE_RESEARCH];
  if (categoryFilter && categoryFilter !== 'All') {
    results = results.filter(r => r.category === categoryFilter);
  }
  if (studyTypeFilter && studyTypeFilter !== 'All') {
    results = results.filter(r => r.studyType === studyTypeFilter);
  }
  if (query && query.trim().length > 0) {
    const qLower = query.toLowerCase();
    results = results.filter(r => 
      r.title.toLowerCase().includes(qLower) ||
      r.abstract.toLowerCase().includes(qLower) ||
      r.authors.some(a => a.toLowerCase().includes(qLower)) ||
      r.journal.toLowerCase().includes(qLower)
    );
  }
  return results;
}
