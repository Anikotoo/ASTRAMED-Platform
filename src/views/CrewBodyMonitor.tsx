import React, { useState } from 'react';
import { CrewMember, HealthReading } from '../types/astramed';
import { BodyMap3D } from '../components/BodyMap3D';
import { 
  Heart, 
  Dumbbell, 
  Activity, 
  Moon, 
  Scale, 
  Zap, 
  ShieldCheck, 
  Award, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface CrewBodyMonitorProps {
  crewList: CrewMember[];
  selectedCrew: CrewMember | null;
  onSelectCrew: (crew: CrewMember) => void;
  readings: HealthReading[];
  onOpenResearch: (category: string) => void;
}

export const CrewBodyMonitor: React.FC<CrewBodyMonitorProps> = ({
  crewList,
  selectedCrew,
  onSelectCrew,
  readings,
  onOpenResearch
}) => {
  const [selectedMuscle, setSelectedMuscle] = useState<string>('quadriceps');

  const activeCrew = selectedCrew || crewList[0];
  const crewReadings = readings.filter(r => r.crewId === activeCrew?.id);

  // Helper to extract latest value
  const getLatest = (param: string, fallback: number | string = '--') => {
    const r = crewReadings.find(item => item.parameter === param);
    return r ? r.value : fallback;
  };

  const hrLatest = getLatest('heart_rate', activeCrew?.baseline.restingHeartRate || 60);
  const sysLatest = getLatest('blood_pressure_sys', activeCrew?.baseline.bloodPressureSys || 120);
  const quadLatest = getLatest('muscle_strength_quad', 92);
  const sleepLatest = getLatest('sleep_duration', 7.0);
  const spo2Latest = getLatest('spo2', 98);
  const weightLatest = getLatest('body_weight', activeCrew?.baseline.weightKg || 70);

  return (
    <div className="space-y-6">
      {/* Astronaut Selector Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {crewList.map(crew => {
          const isSelected = crew.id === activeCrew?.id;
          return (
            <button
              key={crew.id}
              onClick={() => onSelectCrew(crew)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-slate-900 to-cyan-950/70 border-cyan-500 shadow-lg shadow-cyan-950/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow">
                {crew.name.charAt(0)}
              </div>
              <div>
                <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {crew.name}
                </div>
                <div className="text-[10px] font-mono text-cyan-400">{crew.role}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Section: 3D Body Map & Clinical Telemetry Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Interactive 3D Musculoskeletal Map (7 cols) */}
        <div className="xl:col-span-7 space-y-4">
          <BodyMap3D
            selectedCrewName={activeCrew?.name}
            readings={crewReadings}
            onSelectMuscle={id => setSelectedMuscle(id)}
            onOpenResearch={onOpenResearch}
          />
        </div>

        {/* Right: Astronaut Profile & Vital Telemetry (5 cols) */}
        <div className="xl:col-span-5 space-y-4">
          {/* Astronaut Profile Header Card */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                  {activeCrew?.mission}
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">{activeCrew?.name}</h2>
                <div className="text-xs text-slate-400 font-mono">
                  Callsign: <strong className="text-slate-200">"{activeCrew?.callsign}"</strong> • Role: {activeCrew?.role}
                </div>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-400">
                <div>Age: <strong className="text-white">{activeCrew?.age}</strong></div>
                <div>Blood: <strong className="text-white">{activeCrew?.bloodType}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs font-mono text-center">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400">Orbit Time</span>
                <div className="font-bold text-slate-200">{activeCrew?.daysInOrbit} Days</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400">EVAs Logged</span>
                <div className="font-bold text-cyan-300">{activeCrew?.evaCount} Spacewalks</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400">VO2 Max</span>
                <div className="font-bold text-slate-200">{activeCrew?.baseline.vo2Max} mL/kg</div>
              </div>
            </div>
          </div>

          {/* Vitals Telemetry Panels */}
          <div className="space-y-3">
            {/* Cardiovascular */}
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs font-mono mb-2 text-cyan-400">
                <span className="font-bold flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  CARDIOVASCULAR TELEMETRY
                </span>
                <span className="text-[10px] text-slate-400">Sensor Stream</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">Heart Rate</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {hrLatest} <span className="text-xs text-slate-400">bpm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Baseline: {activeCrew?.baseline.restingHeartRate} bpm
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">Blood Pressure (Sys)</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {sysLatest} <span className="text-xs text-slate-400">mmHg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Baseline: {activeCrew?.baseline.bloodPressureSys} mmHg
                  </div>
                </div>
              </div>
            </div>

            {/* Musculoskeletal */}
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs font-mono mb-2 text-cyan-400">
                <span className="font-bold flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
                  MUSCULOSKELETAL & BONE INTEGRITY
                </span>
                <span className="text-[10px] text-slate-400">aRED Test Cycle</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">Quadriceps Peak Force</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {quadLatest} <span className="text-xs text-slate-400">% baseline</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Antigravity Extensor Unloading
                  </div>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">Bone Mineral Density</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {activeCrew?.baseline.boneDensityTScore} <span className="text-xs text-slate-400">T-Score</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    DEXA scan at Femoral Neck
                  </div>
                </div>
              </div>
            </div>

            {/* General Health & Rest */}
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between text-xs font-mono mb-2 text-cyan-400">
                <span className="font-bold flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  SLEEP & METABOLIC SURVEILLANCE
                </span>
                <span className="text-[10px] text-slate-400">Actigraphy</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400">Sleep Time</div>
                  <div className="font-bold font-mono text-white mt-0.5">{sleepLatest}h</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400">SpO2</div>
                  <div className="font-bold font-mono text-white mt-0.5">{spo2Latest}%</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400">Body Mass</div>
                  <div className="font-bold font-mono text-white mt-0.5">{weightLatest}kg</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
