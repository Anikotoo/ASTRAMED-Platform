import React from 'react';
import { EarthGlobe } from '../components/EarthGlobe';
import { CrewMember, HealthReading, HealthAlert, HealthEvent } from '../types/astramed';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  Database, 
  Radio, 
  ChevronRight, 
  Heart, 
  Moon, 
  ShieldAlert, 
  Upload, 
  PlusCircle, 
  Sparkles,
  ExternalLink,
  Flame
} from 'lucide-react';

interface MissionOverviewProps {
  crewList: CrewMember[];
  readings: HealthReading[];
  alerts: HealthAlert[];
  events: HealthEvent[];
  selectedCrew: CrewMember | null;
  onSelectCrew: (crew: CrewMember) => void;
  onNavigate: (section: any) => void;
  onOpenAlerts: () => void;
}

export const MissionOverview: React.FC<MissionOverviewProps> = ({
  crewList,
  readings,
  alerts,
  events,
  selectedCrew,
  onSelectCrew,
  onNavigate,
  onOpenAlerts
}) => {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const attentionAlerts = alerts.filter(a => a.severity === 'attention');

  // Recent 6 readings
  const recentReadings = readings.slice(0, 6);

  // Derive per-crew quick vitals
  const getCrewQuickVitals = (crewId: string) => {
    const crewReadings = readings.filter(r => r.crewId === crewId);
    const hr = crewReadings.find(r => r.parameter === 'heart_rate')?.value || '--';
    const sys = crewReadings.find(r => r.parameter === 'blood_pressure_sys')?.value || '--';
    const quad = crewReadings.find(r => r.parameter === 'muscle_strength_quad')?.value || '--';
    const sleep = crewReadings.find(r => r.parameter === 'sleep_duration')?.value || '--';
    const hasAlert = alerts.some(a => a.crewId === crewId);
    const hasData = crewReadings.length > 0;
    const hasUnverifiedData = crewReadings.some(reading => reading.status === 'unverified');
    return { hr, sys, quad, sleep, hasAlert, hasData, hasUnverifiedData };
  };

  return (
    <div className="space-y-6 overview-page">
      {/* Top Banner & High-Level KPIs */}
      <div className="overview-reveal overview-delay-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{readings.length > 0 ? 'MISSION HEALTH DATA WORKSPACE' : 'NO LIVE TELEMETRY CONNECTED'}</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide mt-1">
            ASTRAMED — Health & Decision Support
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Camera assessments, verified health readings, sensor integration and research-backed decision support.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('crew_profiles')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Add Crew Profile</span>
          </button>
          <button
            onClick={() => onNavigate('enter_readings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Enter Reading</span>
          </button>
          <button
            onClick={() => onNavigate('importer')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import Data</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overview-stagger overview-delay-2">
        {/* Monitored Crew */}
        <div className="overview-card bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Monitored Crew</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{crewList.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Profiles actually configured</div>
        </div>

        {/* Total Readings Logged */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Telemetry Points</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{readings.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Saved records only</div>
        </div>

        {/* Active Health Alerts */}
        <div 
          onClick={onOpenAlerts}
          className="overview-card bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Active Health Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${criticalAlerts.length > 0 ? 'text-rose-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${criticalAlerts.length > 0 ? 'text-rose-400' : (alerts.length > 0 ? 'text-amber-400' : 'text-slate-300')}`}>
              {alerts.length}
            </span>
            {criticalAlerts.length > 0 && (
              <span className="text-xs font-mono text-rose-400">({criticalAlerts.length} Critical)</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Rule-based clinical triggers</div>
        </div>

        {/* Sync & Integrity Status */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Database State</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>DATABASE</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Persistent storage configured</div>
        </div>
      </div>

      <div className="overview-reveal overview-delay-3">
        <EarthGlobe />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr] overview-stagger overview-delay-4">
        <div className="overview-card relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30 p-5 shadow-[0_0_40px_rgba(8,145,178,.08)]">
          <div className="text-[10px] font-mono tracking-[.25em] text-cyan-300">MOBILITY & PERFORMANCE</div>
          <h2 className="mt-2 text-lg font-bold text-white">YOMA Mobility Assessment</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">Run a camera-based movement assessment with local pose estimation, quality checks and a saved assessment record.</p>
          <button onClick={() => onNavigate('yoma')} className="mt-4 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300">Open YOMA Camera ↗</button>
        </div>
        <div className="overview-card rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="text-[10px] font-mono tracking-[.25em] text-cyan-300">WEARABLE SYSTEMS</div>
          <h2 className="mt-2 text-lg font-bold text-white">Virtual Neckband & Devices</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">Open the live camera overlay lab or connect a compatible Bluetooth heart-rate device.</p>
          <button onClick={() => onNavigate('smartwatch')} className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-950/40 px-4 py-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-900/60">Open Wearable Lab ↗</button>
        </div>
      </section>

      {/* Crew Health Roster Grid */}
      <div className="overview-reveal overview-delay-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Monitored Astronaut Roster</span>
          </h2>
          <button
            onClick={() => onNavigate('crew_body')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Open 3D Body Monitor</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overview-stagger">
          {crewList.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">No astronaut profiles have been added. Add a real profile or import a verified crew dataset before monitoring individuals.</div>
          ) : crewList.map(crew => {
            const vitals = getCrewQuickVitals(crew.id);
            const isSelected = selectedCrew?.id === crew.id;
            return (
              <div
                key={crew.id}
                onClick={() => onSelectCrew(crew)}
                className={`overview-card p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-700 to-blue-600 flex items-center justify-center text-sm font-bold text-white uppercase shadow">
                      {crew.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{crew.name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono">{crew.role}</div>
                    </div>
                  </div>
                  {!vitals.hasData ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">NO DATA</span>
                  ) : vitals.hasAlert ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800">
                      ALERT
                    </span>
                  ) : vitals.hasUnverifiedData ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">UNVERIFIED DATA</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                      NO ALERT
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400">Heart Rate:</span>
                    <div className="font-bold text-slate-200">{vitals.hr} bpm</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">BP Systolic:</span>
                    <div className="font-bold text-slate-200">{vitals.sys} mmHg</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Quad Force:</span>
                    <div className="font-bold text-slate-200">{vitals.quad}%</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Sleep Time:</span>
                    <div className="font-bold text-slate-200">{vitals.sleep} hrs</div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] font-mono text-slate-500">
                  Orbit days: {crew.daysInOrbit ?? 'Not supplied'} • EVAs: {crew.evaCount ?? 'Not supplied'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Section: Recent Readings & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overview-reveal overview-delay-6">
        {/* Latest Readings Feed */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Recent Health Telemetry</span>
            </h2>
            <button
              onClick={() => onNavigate('trends')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Trends</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {recentReadings.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">No verified health readings received yet.</div> : recentReadings.map(r => {
              const crew = crewList.find(c => c.id === r.crewId);
              return (
                <div
                  key={r.id}
                  className="overview-card flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      r.status === 'critical' ? 'bg-rose-500' : (r.status === 'attention' ? 'bg-amber-500' : 'bg-emerald-500')
                    }`}></div>
                    <div>
                      <div className="font-semibold text-white capitalize">
                        {r.parameter.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {crew?.name || r.crewId} • {r.source.replace(/_/g, ' ')}{r.reportedSource ? ` (file claimed: ${r.reportedSource})` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-200">
                      {r.value} <span className="text-[10px] text-slate-400">{r.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Medical & Physiological Alerts */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Active Health Alerts ({alerts.length})</span>
            </h2>
            <button
              onClick={() => onNavigate('ai_assistant')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask ASTRAMED AI</span>
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-mono">
              {readings.length === 0 ? 'No health readings received. Health status is unknown, not nominal.' : 'No verified alert conditions are currently generated. Unverified records are excluded from alert evaluation.'}
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 3).map(alert => {
                const crew = crewList.find(c => c.id === alert.crewId);
                const isCritical = alert.severity === 'critical';
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs ${
                      isCritical
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                        : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className={`w-3.5 h-3.5 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`} />
                        <span>{alert.title}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-slate-900/80 border border-slate-800">
                        {crew?.name || alert.crewId}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed">
                      {alert.explanation}
                    </p>

                    <div className="mt-2 text-[10px] font-mono text-cyan-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <strong>Prescribed Action:</strong> {alert.recommendedAction}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
