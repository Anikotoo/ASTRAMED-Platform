import React, { useState, useEffect } from 'react';
import { CrewMember, HealthAlert } from '../types/astramed';
import { 
  Clock, 
  Users, 
  AlertTriangle, 
  Radio, 
  Sparkles, 
  FileText, 
  Scale, 
  Globe2,
  CheckCircle2,
  ChevronDown,
  Menu
} from 'lucide-react';

interface TopStatusBarProps {
  missionName: string;
  missionStartDate: string;
  crewList: CrewMember[];
  selectedCrew: CrewMember | null;
  onSelectCrew: (crew: CrewMember) => void;
  alerts: HealthAlert[];
  isGeminiActive: boolean;
  onOpenAlerts: () => void;
  onOpenComparison: () => void;
  onOpenReport: () => void;
  onOpenEnvironment: () => void;
  onToggleMobileNav?: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  missionName,
  missionStartDate,
  crewList,
  selectedCrew,
  onSelectCrew,
  alerts,
  isGeminiActive,
  onOpenAlerts,
  onOpenComparison,
  onOpenReport,
  onOpenEnvironment,
  onToggleMobileNav
}) => {
  const [metString, setMetString] = useState<string>('000:00:00:00');
  const [isCrewMenuOpen, setIsCrewMenuOpen] = useState(false);

  // Calculate Mission Elapsed Time (MET)
  useEffect(() => {
    const updateMet = () => {
      const start = new Date(missionStartDate).getTime();
      const now = Date.now();
      const diff = Math.max(0, now - start);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      const pad = (n: number, z = 2) => String(n).padStart(z, '0');
      setMetString(`${pad(days, 3)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
    };

    updateMet();
    const interval = setInterval(updateMet, 1000);
    return () => clearInterval(interval);
  }, [missionStartDate]);

  const criticalAlertCount = alerts.filter(a => a.severity === 'critical').length;
  const attentionAlertCount = alerts.filter(a => a.severity === 'attention').length;

  return (
    <header className="h-16 bg-slate-950/90 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs font-mono text-slate-300 z-30 sticky top-0 backdrop-blur-md">
      {/* Mission & MET */}
      <div className="flex items-center gap-3">
        {onToggleMobileNav && (
          <button
            onClick={onToggleMobileNav}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white md:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-none"></span>
          <span className="font-bold text-white text-sm tracking-wide">{missionName}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 border border-slate-700">LEO ORBIT</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-cyan-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">MET:</span>
          <span className="font-semibold">{metString}</span>
        </div>
      </div>

      {/* Middle Tools: Modals Trigger */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          onClick={onOpenComparison}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
        >
          <Scale className="w-3.5 h-3.5 text-cyan-400" />
          <span>Compare Crew</span>
        </button>

        <button
          onClick={onOpenEnvironment}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
        >
          <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Space Env</span>
        </button>

        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mission Report</span>
        </button>
      </div>

      {/* Right Controls: Crew Selector & Alerts */}
      <div className="flex items-center gap-3">
        {/* Alerts Pill */}
        <button
          onClick={onOpenAlerts}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
            criticalAlertCount > 0
              ? 'bg-rose-950/70 border-rose-600/70 text-rose-300 hover:bg-rose-900'
              : (attentionAlertCount > 0
                  ? 'bg-amber-950/70 border-amber-600/70 text-amber-300 hover:bg-amber-900'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200')
          }`}
          title="Active Medical & Telemetry Alerts"
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${criticalAlertCount > 0 ? 'text-rose-400' : (attentionAlertCount > 0 ? 'text-amber-400' : 'text-slate-400')}`} />
          <span className="font-semibold">{alerts.length}</span>
          <span className="hidden sm:inline">ALERTS</span>
        </button>

        {/* AI Status Pill */}
        <div 
          className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] ${
            isGeminiActive 
              ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300' 
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
          title={isGeminiActive ? 'Gemini 3.8 Flash live biomedical decision support connected' : 'Offline space medicine decision support active'}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isGeminiActive ? 'GEMINI 3.8' : 'OFFLINE AI'}</span>
        </div>

        {/* Active Crew Member Selector */}
        <div className="relative">
          <button
            onClick={() => setIsCrewMenuOpen(!isCrewMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/60 transition-colors text-white cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {selectedCrew?.name.charAt(0) || 'A'}
            </div>
            <span className="font-semibold text-xs truncate max-w-[110px]">{selectedCrew?.name || 'Select Crew'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isCrewMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                Monitored Astronauts ({crewList.length})
              </div>
              {crewList.map(crew => (
                <button
                  key={crew.id}
                  onClick={() => {
                    onSelectCrew(crew);
                    setIsCrewMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                    selectedCrew?.id === crew.id ? 'bg-cyan-950/60 text-cyan-300 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs">{crew.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{crew.role}</div>
                  </div>
                  {selectedCrew?.id === crew.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
