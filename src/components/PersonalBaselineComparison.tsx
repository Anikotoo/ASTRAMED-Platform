import React, { useMemo } from 'react';
import { CrewMember, HealthReading, HealthParameter } from '../types/astramed';
import { Activity, ArrowDownRight, ArrowUpRight, Minus, ShieldAlert } from 'lucide-react';

interface PersonalBaselineComparisonProps {
  crew: CrewMember | null;
  readings: HealthReading[];
  parameter: HealthParameter;
}

type ProfileReference = {
  value: number;
  unit: string;
  label: string;
};

const getProfileReference = (
  crew: CrewMember,
  parameter: HealthParameter
): ProfileReference | null => {
  switch (parameter) {
    case 'heart_rate':
    case 'resting_heart_rate':
      return { value: crew.baseline.restingHeartRate, unit: 'bpm', label: 'Profile resting reference' };
    case 'blood_pressure_sys':
      return { value: crew.baseline.bloodPressureSys, unit: 'mmHg', label: 'Profile systolic reference' };
    case 'body_weight':
      return { value: crew.baseline.weightKg, unit: 'kg', label: 'Profile weight reference' };
    case 'bone_density_tscore':
      return { value: crew.baseline.boneDensityTScore, unit: 'T-score', label: 'Profile bone-density reference' };
    default:
      return null;
  }
};

const normalizeUnit = (unit: string) => unit.trim().toLowerCase();

export const PersonalBaselineComparison: React.FC<PersonalBaselineComparisonProps> = ({
  crew,
  readings,
  parameter
}) => {
  const comparison = useMemo(() => {
    if (!crew) return null;

    const series = readings
      .filter(reading => reading.crewId === crew.id && reading.parameter === parameter)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (series.length === 0) return { kind: 'empty' as const };

    const latest = series[series.length - 1];
    const profileReference = getProfileReference(crew, parameter);
    const profileUnitMatches = profileReference &&
      normalizeUnit(profileReference.unit) === normalizeUnit(latest.unit);

    if (profileUnitMatches) {
      return {
        kind: 'ready' as const,
        latest,
        baseline: profileReference.value,
        baselineLabel: profileReference.label,
        sampleCount: null
      };
    }

    // A historical baseline excludes the latest reading and requires at least
    // three earlier readings with the same unit.
    const previous = series.slice(0, -1).filter(
      reading => normalizeUnit(reading.unit) === normalizeUnit(latest.unit)
    );

    if (previous.length < 3) {
      return { kind: 'insufficient' as const, latest, previousCount: previous.length };
    }

    const average = previous.reduce((sum, reading) => sum + reading.value, 0) / previous.length;
    return {
      kind: 'ready' as const,
      latest,
      baseline: Number(average.toFixed(2)),
      baselineLabel: 'Historical average',
      sampleCount: previous.length
    };
  }, [crew, readings, parameter]);

  if (!crew) return null;

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  return (
    <section className="bg-slate-900/80 border border-cyan-900/50 rounded-xl p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">Personal Health Baseline</div>
            <h3 className="text-sm font-bold text-white mt-0.5">Comparison for {crew.name}</h3>
          </div>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wide text-slate-500 border border-slate-700 rounded px-2 py-1">
          Not a diagnosis
        </span>
      </div>

      {comparison?.kind === 'empty' && (
        <div className="text-xs text-slate-400 font-mono py-3">
          No readings are available for this parameter. Add or import a reading to begin comparison.
        </div>
      )}

      {comparison?.kind === 'insufficient' && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase">Latest reading</div>
              <div className="text-xl font-bold text-white mt-1 tabular-nums">
                {comparison.latest.value} <span className="text-xs text-slate-400">{comparison.latest.unit}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{formatDate(comparison.latest.timestamp)}</div>
            </div>
            <div className="bg-slate-950/70 border border-amber-900/50 rounded-lg p-3">
              <div className="text-[10px] text-amber-400 font-mono uppercase">Baseline unavailable</div>
              <div className="text-sm font-semibold text-white mt-2">Not enough historical data</div>
              <div className="text-[10px] text-slate-400 mt-1">
                {comparison.previousCount} of 3 required earlier readings available
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            No compatible profile reference exists for this metric. At least 3 earlier readings with matching units are required to estimate a personal baseline.
          </p>
        </div>
      )}

      {comparison?.kind === 'ready' && (() => {
        const delta = Number((comparison.latest.value - comparison.baseline).toFixed(2));
        const percent = comparison.baseline !== 0
          ? Number(((delta / Math.abs(comparison.baseline)) * 100).toFixed(1))
          : null;
        const direction = delta > 0 ? 'above' : delta < 0 ? 'below' : 'matches';
        const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
        const deltaColor = delta === 0 ? 'text-slate-200' : 'text-cyan-300';

        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 font-mono uppercase">Personal baseline</div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {comparison.baseline} <span className="text-xs text-slate-400">{comparison.latest.unit}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{comparison.baselineLabel}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 font-mono uppercase">Latest reading</div>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {comparison.latest.value} <span className="text-xs text-slate-400">{comparison.latest.unit}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{formatDate(comparison.latest.timestamp)}</div>
              </div>
              <div className="bg-slate-950/70 border border-cyan-900/50 rounded-lg p-3">
                <div className="text-[10px] text-slate-500 font-mono uppercase">Difference from baseline</div>
                <div className={`text-xl font-bold mt-1 tabular-nums flex items-center gap-1 ${deltaColor}`}>
                  <DeltaIcon className="w-4 h-4" />
                  {delta > 0 ? '+' : ''}{delta} <span className="text-xs text-slate-400">{comparison.latest.unit}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {direction} reference{percent === null ? '' : ` · ${percent > 0 ? '+' : ''}${percent}%`}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>
                {comparison.sampleCount === null
                  ? 'Reference comes from the crew profile.'
                  : `Calculated from ${comparison.sampleCount} earlier readings; latest reading excluded.`}
              </span>
              <span>Uses all available history, independent of chart time filter.</span>
            </div>
          </div>
        );
      })()}

      <div className="flex items-start gap-2 border-t border-slate-800 pt-3 text-[10px] text-slate-500">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
        <p>A difference from a personal reference is informational only. It does not establish a medical problem or replace clinical review.</p>
      </div>
    </section>
  );
};
