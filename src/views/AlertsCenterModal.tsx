import React, { useState } from 'react';
import { HealthAlert, CrewMember } from '../types/astramed';
import { AlertTriangle, X, ShieldAlert, CheckCircle2, Filter, Heart, Dumbbell, Moon, Info } from 'lucide-react';

interface AlertsCenterModalProps {
  alerts: HealthAlert[];
  crewList: CrewMember[];
  onClose: () => void;
  onNavigateToTrends?: (crewId: string, param: string) => void;
}

export const AlertsCenterModal: React.FC<AlertsCenterModalProps> = ({
  alerts,
  crewList,
  onClose,
  onNavigateToTrends
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCrewId, setSelectedCrewId] = useState<string>('All');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const handleToggleAcknowledge = (id: string) => {
    setAcknowledgedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAlerts = alerts.filter(a => {
    if (selectedCategory !== 'All' && a.category !== selectedCategory) return false;
    if (selectedCrewId !== 'All' && a.crewId !== selectedCrewId) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 text-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                Centralized Smart Alert Center ({alerts.length})
              </h2>
              <p className="text-xs text-slate-400">
                Rule-based clinical triggers, threshold breaches, and physiological surveillance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            aria-label="Close Alerts Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Category:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
            >
              <option value="All">All Categories</option>
              <option value="cardiovascular">Cardiovascular</option>
              <option value="musculoskeletal">Musculoskeletal</option>
              <option value="general">General &amp; Sleep</option>
              <option value="environmental">Environmental</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Astronaut:</span>
            <select
              value={selectedCrewId}
              onChange={e => setSelectedCrewId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
            >
              <option value="All">All Crew Members</option>
              {crewList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
            No active alerts matching the selected category and crew member.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map(alert => {
              const crew = crewList.find(c => c.id === alert.crewId);
              const isAcknowledged = acknowledgedIds.has(alert.id);
              const isCritical = alert.severity === 'critical';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all text-xs font-sans ${
                    isCritical
                      ? 'bg-rose-950/40 border-rose-800/80'
                      : 'bg-amber-950/40 border-amber-800/80'
                  } ${isAcknowledged ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3 font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCritical ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                      }`}>
                        {alert.severity}
                      </span>
                      <h3 className="font-bold text-white text-sm">{alert.title}</h3>
                    </div>

                    <span className="text-[11px] text-cyan-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                      {crew?.name || alert.crewId}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {alert.explanation}
                  </p>

                  <div className="mt-2.5 p-2 bg-slate-950/80 rounded border border-slate-800 font-mono text-[11px] text-cyan-300">
                    <strong>Recommended Action:</strong> {alert.recommendedAction}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">
                      Value: <strong className="text-slate-300">{alert.currentValue} {alert.unit}</strong> • Ceiling: {alert.thresholdValue} {alert.unit} • Source: {alert.source}
                    </span>

                    <button
                      onClick={() => handleToggleAcknowledge(alert.id)}
                      className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                        isAcknowledged
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isAcknowledged ? 'Acknowledged ✓' : 'Mark Acknowledged'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
