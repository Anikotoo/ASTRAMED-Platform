import React from 'react';
import { CrewMember, HealthReading, HealthAlert } from '../types/astramed';
import { FileText, X, Printer, Download, ShieldCheck, Sparkles } from 'lucide-react';

interface MissionReportModalProps {
  selectedCrew: CrewMember | null;
  readings: HealthReading[];
  alerts: HealthAlert[];
  missionName: string;
  onClose: () => void;
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({
  selectedCrew,
  readings,
  alerts,
  missionName,
  onClose
}) => {
  const crewReadings = readings.filter(r => r.crewId === selectedCrew?.id);
  const crewAlerts = alerts.filter(a => a.crewId === selectedCrew?.id);

  const printReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-8 text-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:max-h-none print:p-0">
        {/* Header Controls (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white font-mono">Mission Biomedical Health Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              aria-label="Close Mission Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Document Content */}
        <div className="space-y-6 font-sans text-xs">
          {/* Document Header */}
          <div className="border-b-2 border-cyan-500 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[10px] uppercase text-cyan-400 font-bold tracking-wider">
                  ASTRAMED BIOMEDICAL SURVEILLANCE REPORT
                </span>
                <h1 className="text-xl font-extrabold text-white print:text-black mt-0.5">
                  Astronaut Physiological Status Dossier
                </h1>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Mission: <strong className="text-slate-200">{missionName}</strong> • Orbit Day: {selectedCrew?.daysInOrbit} • Generated: {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-400">
                <div>SECURITY: UNCLASSIFIED</div>
                <div>DOC-ID: ASTRAMED-EXP75-{selectedCrew?.callsign?.toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Section 1: Crew Member Demographics */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1">
              1. Astronaut Profile &amp; Flight Specialization
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block">FULL NAME</span>
                <span className="font-bold text-white">{selectedCrew?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">CALLSIGN</span>
                <span className="font-bold text-cyan-300">{selectedCrew?.callsign}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">MISSION ROLE</span>
                <span className="font-bold text-white">{selectedCrew?.role}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">EVAs PERFORMED</span>
                <span className="font-bold text-white">{selectedCrew?.evaCount} Spacewalks</span>
              </div>
            </div>
          </div>

          {/* Section 2: Physiological Telemetry Summary */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1">
              2. Biomedical Telemetry &amp; Adaptation Summary
            </h3>
            <div className="space-y-1.5">
              {crewReadings.slice(0, 6).map(r => (
                <div key={r.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded font-mono flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white capitalize">{r.parameter.replace(/_/g, ' ')}:</span>{' '}
                    <span className="text-cyan-400 font-bold">{r.value} {r.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Source: {r.source} • {new Date(r.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Active Health Alerts & Clinical Inferences */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1">
              3. Active Alert Events &amp; Countermeasure Directives
            </h3>
            {crewAlerts.length === 0 ? (
              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-400 font-mono">
                No active clinical or telemetry thresholds breached for this crew member.
              </div>
            ) : (
              <div className="space-y-2">
                {crewAlerts.map(a => (
                  <div key={a.id} className="p-3 bg-slate-950 rounded border border-amber-800/80 font-mono">
                    <div className="font-bold text-amber-300 flex items-center justify-between">
                      <span>{a.title}</span>
                      <span className="text-[10px] uppercase text-amber-400 font-bold">{a.severity}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">{a.explanation}</div>
                    <div className="text-[10px] text-cyan-300 mt-1.5">
                      <strong>Directive:</strong> {a.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Relevant Scientific Evidence Base */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs font-bold uppercase text-cyan-400 border-b border-slate-800 pb-1">
              4. NASA OSDR &amp; Europe PMC Scientific References
            </h3>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>• <strong>OSD-341:</strong> Multi-Omics Analysis of Muscle Atrophy during Long-Duration Spaceflight (Nature Comms, 2024). DOI: 10.1038/s41467-024-48219-w</div>
              <div>• <strong>MED/37882910:</strong> Cardiovascular Remodeling and Orthostatic Intolerance in Microgravity (Circulation, 2023). DOI: 10.1161/CIRCGEN.123.004112</div>
              <div>• <strong>OSD-579:</strong> Bone Mineral Density Kinetics and Trabecular Microarchitecture Loss in Orbital Crew (JBMR, 2024). DOI: 10.1002/jbmr.4912</div>
            </div>
          </div>

          {/* Section 5: Regulatory Disclaimer & Limitations */}
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-500 space-y-1 leading-relaxed">
            <div className="font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Clinical Regulatory Limitations &amp; Verification Protocol</span>
            </div>
            <p>
              ASTRAMED is an astronaut health-monitoring, telemetry aggregation, and AI-assisted scientific research decision-support prototype. It is NOT an autonomous medical diagnostic device and does not claim to diagnose, cure, or prevent clinical diseases. All observations, hypotheses, and countermeasure adjustments must be evaluated and authorized by a certified Flight Surgeon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
