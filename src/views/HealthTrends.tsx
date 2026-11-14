import React, { useState, useMemo } from 'react';
import { CrewMember, HealthReading, HealthParameter } from '../types/astramed';
import { calculateTrend } from '../utils/trendCalculator';
import { PersonalBaselineComparison } from '../components/PersonalBaselineComparison';
import { 
  LineChart as LineChartIcon, 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Filter, 
  Users,
  CheckCircle2
} from 'lucide-react';

interface HealthTrendsProps {
  crewList: CrewMember[];
  selectedCrew: CrewMember | null;
  onSelectCrew: (crew: CrewMember) => void;
  readings: HealthReading[];
}

export const HealthTrends: React.FC<HealthTrendsProps> = ({
  crewList,
  selectedCrew,
  onSelectCrew,
  readings
}) => {
  const activeCrew = selectedCrew || crewList[0];
  const [selectedParam, setSelectedParam] = useState<HealthParameter>('heart_rate');
  const [timeRangeDays, setTimeRangeDays] = useState<number>(0);
  const [compareCrewId, setCompareCrewId] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; time: string } | null>(null);

  // Filtered primary readings
  const primaryReadings = useMemo(() => {
    let list = readings.filter(r => r.crewId === activeCrew?.id && r.parameter === selectedParam);
    if (timeRangeDays > 0) {
      const cutoff = Date.now() - (timeRangeDays * 24 * 60 * 60 * 1000);
      list = list.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [readings, activeCrew, selectedParam, timeRangeDays]);

  // Comparison crew readings
  const comparisonReadings = useMemo(() => {
    if (!compareCrewId) return [];
    let list = readings.filter(r => r.crewId === compareCrewId && r.parameter === selectedParam);
    if (timeRangeDays > 0) {
      const cutoff = Date.now() - (timeRangeDays * 24 * 60 * 60 * 1000);
      list = list.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [readings, compareCrewId, selectedParam, timeRangeDays]);

  // Statistics
  const trendStats = useMemo(() => {
    return calculateTrend(primaryReadings);
  }, [primaryReadings]);

  // Supported parameters list
  const PARAM_OPTIONS: Array<{ id: HealthParameter; label: string; unit: string }> = [
    { id: 'heart_rate', label: 'Heart Rate (Resting / Active)', unit: 'bpm' },
    { id: 'blood_pressure_sys', label: 'Systolic Blood Pressure', unit: 'mmHg' },
    { id: 'muscle_strength_quad', label: 'Quadriceps Muscle Strength', unit: '% baseline' },
    { id: 'muscle_strength_bicep', label: 'Biceps Muscle Strength', unit: '% baseline' },
    { id: 'sleep_duration', label: 'Sleep Duration', unit: 'hours' },
    { id: 'spo2', label: 'Pulse Oximetry (SpO2)', unit: '%' },
    { id: 'body_weight', label: 'Body Mass Tracking', unit: 'kg' },
    { id: 'bone_density_tscore', label: 'Bone Mineral Density', unit: 'T-score' }
  ];

  // SVG Chart Dimensions & Coordinates
  const chartWidth = 720;
  const chartHeight = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const { pointsPrimary, pointsComparison, yMin, yMax, unit } = useMemo(() => {
    const allVals = [
      ...primaryReadings.map(r => r.value),
      ...comparisonReadings.map(r => r.value)
    ];

    if (allVals.length === 0) {
      return { pointsPrimary: [], pointsComparison: [], yMin: 0, yMax: 100, unit: '' };
    }

    const min = Math.floor(Math.min(...allVals) * 0.9);
    const max = Math.ceil(Math.max(...allVals) * 1.1) || 10;
    const currentUnit = primaryReadings[0]?.unit || '';

    const computePoints = (data: HealthReading[]) => {
      if (data.length === 0) return [];
      if (data.length === 1) {
        const x = padding.left + (chartWidth - padding.left - padding.right) / 2;
        const y = chartHeight - padding.bottom - ((data[0].value - min) / (max - min || 1)) * (chartHeight - padding.top - padding.bottom);
        return [{ x, y, val: data[0].value, time: data[0].timestamp }];
      }
      return data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1)) * (chartWidth - padding.left - padding.right);
        const y = chartHeight - padding.bottom - ((d.value - min) / (max - min || 1)) * (chartHeight - padding.top - padding.bottom);
        return { x, y, val: d.value, time: d.timestamp };
      });
    };

    return {
      pointsPrimary: computePoints(primaryReadings),
      pointsComparison: computePoints(comparisonReadings),
      yMin: min,
      yMax: max,
      unit: currentUnit
    };
  }, [primaryReadings, comparisonReadings, chartWidth, chartHeight]);

  // Export CSV
  const exportData = (format: 'csv' | 'json') => {
    if (primaryReadings.length === 0) return;
    let content = '';
    let mime = 'text/plain';
    let filename = `astramed_${activeCrew?.callsign}_${selectedParam}.${format}`;

    if (format === 'csv') {
      const rows = [
        'id,crew_id,parameter,value,unit,timestamp,source',
        ...primaryReadings.map(r => `${r.id},${r.crewId},${r.parameter},${r.value},${r.unit},${r.timestamp},${r.source}`)
      ];
      content = rows.join('\n');
      mime = 'text/csv';
    } else {
      content = JSON.stringify(primaryReadings, null, 2);
      mime = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        {/* Metric Selector */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <LineChartIcon className="w-4 h-4" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block">Select Parameter</label>
            <select
              value={selectedParam}
              onChange={e => setSelectedParam(e.target.value as HealthParameter)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:border-cyan-500 outline-none"
            >
              {PARAM_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label} ({opt.unit})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Time Filter & Comparison Crew */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Compare with crew member */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] font-mono text-slate-400">Compare with:</span>
            <select
              value={compareCrewId || ''}
              onChange={e => setCompareCrewId(e.target.value || null)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none"
            >
              <option value="">None (Single Crew)</option>
              {crewList.filter(c => c.id !== activeCrew?.id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
            {[
              { label: '7D', days: 7 },
              { label: '14D', days: 14 },
              { label: '30D', days: 30 },
              { label: 'ALL', days: 0 }
            ].map(t => (
              <button
                key={t.label}
                onClick={() => setTimeRangeDays(t.days)}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  timeRangeDays === t.days ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Export Actions */}
          <button
            onClick={() => exportData('csv')}
            disabled={primaryReadings.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Export trend series to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <PersonalBaselineComparison crew={activeCrew || null} readings={readings} parameter={selectedParam} />

      {/* Main Interactive Chart Canvas Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <div className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">
              Telemetry Trend Visualization
            </div>
            <h2 className="text-base font-bold text-white capitalize mt-0.5">
              {selectedParam.replace(/_/g, ' ')} ({unit})
            </h2>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Subject: <strong className="text-white">{activeCrew?.name}</strong>
              {compareCrewId && (
                <span className="text-amber-400 ml-2">
                  • vs. {crewList.find(c => c.id === compareCrewId)?.name}
                </span>
              )}
            </div>
          </div>

          {trendStats && (
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">OBSERVED DELTA</span>
                <span className={`font-bold flex items-center gap-1 ${trendStats.deltaAbsolute >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {trendStats.deltaAbsolute >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {trendStats.deltaAbsolute > 0 ? `+${trendStats.deltaAbsolute}` : trendStats.deltaAbsolute} {unit} ({trendStats.deltaPercent}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SVG Rendered Curve */}
        {primaryReadings.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs font-mono space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-500" />
            <div>No telemetry points recorded for this parameter in the selected timeframe.</div>
            <div className="text-[11px] text-slate-500">Record a new biometric reading or import CSV data.</div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-72 select-none"
            >
              <defs>
                <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = padding.top + pct * (chartHeight - padding.top - padding.bottom);
                const val = Math.round(yMax - pct * (yMax - yMin));
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Primary Curve Area Fill */}
              {pointsPrimary.length > 1 && (
                <path
                  d={`
                    M ${pointsPrimary[0].x} ${pointsPrimary[0].y}
                    ${pointsPrimary.map(p => `L ${p.x} ${p.y}`).join(' ')}
                    L ${pointsPrimary[pointsPrimary.length - 1].x} ${chartHeight - padding.bottom}
                    L ${pointsPrimary[0].x} ${chartHeight - padding.bottom}
                    Z
                  `}
                  fill="url(#primaryAreaGrad)"
                />
              )}

              {/* Primary Curve Stroke */}
              {pointsPrimary.length > 1 && (
                <path
                  d={`
                    M ${pointsPrimary[0].x} ${pointsPrimary[0].y}
                    ${pointsPrimary.map(p => `L ${p.x} ${p.y}`).join(' ')}
                  `}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Comparison Curve Stroke if active */}
              {pointsComparison.length > 1 && (
                <path
                  d={`
                    M ${pointsComparison[0].x} ${pointsComparison[0].y}
                    ${pointsComparison.map(p => `L ${p.x} ${p.y}`).join(' ')}
                  `}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                />
              )}

              {/* Primary Data Points */}
              {pointsPrimary.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.time === pt.time ? 5.5 : 3.5}
                    fill="#06b6d4"
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}

              {/* Comparison Data Points */}
              {pointsComparison.map((pt, i) => (
                <circle
                  key={`comp_${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#f59e0b"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
              ))}

              {/* Active Tooltip Popover */}
              {hoveredPoint && (
                <g transform={`translate(${Math.min(chartWidth - 140, Math.max(hoveredPoint.x - 60, padding.left))}, ${Math.max(hoveredPoint.y - 45, 10)})`}>
                  <rect
                    width="120"
                    height="36"
                    rx="6"
                    fill="#020617"
                    stroke="#0891b2"
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text x="60" y="15" fill="#e2e8f0" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    {hoveredPoint.val} {unit}
                  </text>
                  <text x="60" y="28" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    {new Date(hoveredPoint.time).toLocaleDateString()}
                  </text>
                </g>
              )}
            </svg>
          </div>
        )}

        {/* Legend */}
        <div className="mt-2 flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span>
              <span className="text-slate-200">{activeCrew?.name} (Primary Subject)</span>
            </div>
            {compareCrewId && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-amber-400 inline-block border-b border-dashed border-amber-400"></span>
                <span className="text-amber-300">{crewList.find(c => c.id === compareCrewId)?.name} (Overlay)</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500">
            {primaryReadings.length} data points plotted • Source attribution tracked
          </div>
        </div>
      </div>

      {/* Summary Statistics KPI Cards */}
      {trendStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400">MIN READING</span>
            <div className="text-base font-bold text-white mt-0.5">{trendStats.min} {trendStats.unit}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400">MAX READING</span>
            <div className="text-base font-bold text-white mt-0.5">{trendStats.max} {trendStats.unit}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400">SERIES MEAN</span>
            <div className="text-base font-bold text-white mt-0.5">{trendStats.mean} {trendStats.unit}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400">MEDIAN</span>
            <div className="text-base font-bold text-white mt-0.5">{trendStats.median} {trendStats.unit}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400">DIRECTION</span>
            <div className={`text-base font-bold capitalize mt-0.5 ${
              trendStats.direction === 'increasing' ? 'text-cyan-400' : (trendStats.direction === 'decreasing' ? 'text-amber-400' : 'text-slate-300')
            }`}>
              {trendStats.direction}
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400">DATA GAPS (&gt;48H)</span>
            <div className="text-base font-bold mt-0.5">
              {trendStats.hasDataGaps ? (
                <span className="text-amber-400">Detected ({trendStats.maxGapHours}h)</span>
              ) : (
                <span className="text-emerald-400">None (Continuous)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
