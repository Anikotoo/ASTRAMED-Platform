import React, { useState, useEffect } from 'react';
import { ResearchStudy, StudyType } from '../types/astramed';
import { searchResearchStudies, VERIFIED_SPACE_RESEARCH } from '../utils/researchData';
import { 
  BookOpen, 
  Search, 
  Filter, 
  ExternalLink, 
  FileText, 
  Tag, 
  Calendar, 
  Award, 
  Database,
  X,
  Sparkles,
  Info
} from 'lucide-react';

interface ResearchLibraryProps {
  initialCategory?: string;
  onAskAI?: (prompt: string, study?: ResearchStudy) => void;
}

export const ResearchLibrary: React.FC<ResearchLibraryProps> = ({
  initialCategory,
  onAskAI
}) => {
  const [studies, setStudies] = useState<ResearchStudy[]>(VERIFIED_SPACE_RESEARCH);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedStudyType, setSelectedStudyType] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeStudy, setActiveStudy] = useState<ResearchStudy | null>(null);

  const CATEGORIES = [
    'All',
    'Cardiovascular Health',
    'Musculoskeletal Health',
    'Bone Loss',
    'Microgravity',
    'Radiation',
    'Sleep and Circadian Rhythm',
    'Psychological Health',
    'Vestibular and Sensorimotor Health',
    'General Spaceflight Medicine'
  ];

  const STUDY_TYPES = [
    'All',
    'Systematic Review / Meta-analysis',
    'Review',
    'Clinical Trial',
    'Observational Study',
    'Experimental Study'
  ];

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const results = await searchResearchStudies(searchQuery, selectedCategory, selectedStudyType);
      setStudies(results);
    } catch (err) {
      console.error('Research search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [selectedCategory, selectedStudyType]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>LIVE EUROPE PMC SEARCH • NASA OSDR RECORDS NOT YET VERIFIED</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide mt-1">
              Spaceflight Biomedical Research Library
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Peer-reviewed evidence on microgravity unloading, radiation kinetics, bone loss, and cardiovascular remodeling.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              {studies.length} Studies Indexed
            </span>
          </div>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search studies by title, author, keyword, or microgravity mechanism..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer shrink-0"
          >
            {isLoading ? 'SEARCHING...' : 'QUERY REPOSITORIES'}
          </button>
        </form>

        {/* Category Filters Pill Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 mr-1 shrink-0">Category:</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Studies Results Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-cyan-400 space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto"></div>
          <div>Querying Europe PMC REST API &amp; NASA Open Science Data Repository...</div>
        </div>
      ) : studies.length === 0 ? (
        <div className="p-12 text-center text-xs font-mono text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
          No spaceflight studies found matching the selected query and filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studies.map(study => (
            <div
              key={study.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-5 rounded-xl flex flex-col justify-between transition-all"
            >
              <div>
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {study.source}
                  </span>
                  <span className="text-slate-400">
                    {study.studyType} • {study.year || 'Year unavailable'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white hover:text-cyan-300 transition-colors leading-snug">
                  {study.title}
                </h3>

                {/* Authors & Journal */}
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  {study.authors.length ? `${study.authors.slice(0, 3).join(', ')}${study.authors.length > 3 ? ' et al.' : ''}` : 'Authors unavailable'}
                  <span className="text-slate-500"> • {study.journal}</span>
                </div>

                {/* Abstract snippet */}
                <p className="mt-2.5 text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {study.abstract}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  {study.doi ? `DOI: ${study.doi}` : (study.pmid ? `PMID: ${study.pmid}` : 'NASA OSDR Index')}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveStudy(study)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer"
                  >
                    View Details
                  </button>

                  <a
                    href={study.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                    title="Open original scientific publication"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Study Modal */}
      {activeStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  {activeStudy.source} • {activeStudy.category}
                </div>
                <h2 className="text-base font-bold text-white mt-1 leading-snug">
                  {activeStudy.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveStudy(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Close Study Details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">JOURNAL &amp; YEAR</span>
                  <span className="font-semibold text-slate-200">{activeStudy.journal} ({activeStudy.year || 'Year unavailable'})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">STUDY DESIGN</span>
                  <span className="font-semibold text-cyan-300">{activeStudy.studyType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">AUTHORS</span>
                  <span className="text-slate-300">{activeStudy.authors.length ? activeStudy.authors.join(', ') : 'Authors unavailable'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">IDENTIFIER</span>
                  <span className="text-slate-300">{activeStudy.doi ? `DOI: ${activeStudy.doi}` : (activeStudy.pmid ? `PMID: ${activeStudy.pmid}` : 'No DOI or PMID supplied')}</span>
                </div>
              </div>

              <div>
                <h4 className="font-mono text-[11px] uppercase text-cyan-400 mb-1">Scientific Abstract</h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
                  {activeStudy.abstract}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {onAskAI && (
                  <button
                    onClick={() => {
                      const prompt = `Can you explain the clinical significance of "${activeStudy.title}" for astronaut countermeasure protocols?`;
                      setActiveStudy(null);
                      onAskAI(prompt, activeStudy);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 text-cyan-300 font-mono text-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask AI About This Study</span>
                  </button>
                )}

                <a
                  href={activeStudy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>Open Full Publication</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
