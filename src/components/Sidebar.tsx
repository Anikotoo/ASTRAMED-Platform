import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  LineChart, 
  Bot, 
  BookOpen, 
  UploadCloud, 
  Edit3, 
  Settings, 
  ShieldCheck,
  Rocket
} from 'lucide-react';

export type NavSection = 
  | 'overview' 
  | 'crew_body' 
  | 'trends' 
  | 'ai_assistant' 
  | 'research' 
  | 'importer' 
  | 'enter_readings' 
  | 'settings';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  alertCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  alertCount,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems: Array<{ id: NavSection; label: string; icon: React.FC<{ className?: string }>; badge?: number }> = [
    { id: 'overview', label: 'Mission Overview', icon: LayoutDashboard },
    { id: 'crew_body', label: 'Crew & Body Monitor', icon: UserCheck },
    { id: 'trends', label: 'Health Trends', icon: LineChart },
    { id: 'ai_assistant', label: 'AI Assistant', icon: Bot },
    { id: 'research', label: 'Research Library', icon: BookOpen },
    { id: 'importer', label: 'Data Importer', icon: UploadCloud },
    { id: 'enter_readings', label: 'Enter Readings', icon: Edit3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside className={`
        fixed md:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 
        flex flex-col justify-between shrink-0 h-full select-none transition-transform duration-200
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
      {/* Brand & Subtitle */}
      <div>
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-base tracking-widest font-mono">ASTRAMED</span>
              <span className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 text-[9px] font-mono border border-cyan-800">EXP-75</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight">Advancing Astronaut Health</div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Command Center
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 text-cyan-300 font-semibold border-l-2 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.id === 'overview' && alertCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
                    {alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info: Clinical Decision-Support Notice & Space Apps badge */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] font-sans text-slate-400 space-y-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[10px] leading-tight text-slate-300">
            <strong>Decision-Support Prototype:</strong> Not an autonomous diagnostic medical device.
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500 text-center">
          NASA Space Apps Challenge 2026
        </div>
      </div>
    </aside>
    </>
  );
};
