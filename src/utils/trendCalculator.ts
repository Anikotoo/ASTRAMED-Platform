import { HealthReading } from '../types/astramed';

export interface TrendSummary {
  parameter: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  latest: number;
  first: number;
  deltaAbsolute: number;
  deltaPercent: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  hasDataGaps: boolean;
  maxGapHours: number;
  unit: string;
}

export function calculateTrend(readings: HealthReading[]): TrendSummary | null {
  if (!readings || readings.length === 0) return null;

  // Sort chronologically ascending
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const values = sorted.map(r => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = Number((sum / values.length).toFixed(2));

  // Median
  const sortedValues = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 !== 0
    ? sortedValues[mid]
    : Number(((sortedValues[mid - 1] + sortedValues[mid]) / 2).toFixed(2));

  const first = sorted[0].value;
  const latest = sorted[sorted.length - 1].value;
  const deltaAbsolute = Number((latest - first).toFixed(2));
  const deltaPercent = first !== 0 ? Number(((deltaAbsolute / Math.abs(first)) * 100).toFixed(1)) : 0;

  let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (deltaPercent > 2.0) direction = 'increasing';
  else if (deltaPercent < -2.0) direction = 'decreasing';

  // Check data gaps (> 48 hours gap between consecutive readings)
  let maxGapHours = 0;
  for (let i = 1; i < sorted.length; i++) {
    const tPrev = new Date(sorted[i - 1].timestamp).getTime();
    const tCurr = new Date(sorted[i].timestamp).getTime();
    const gapHours = (tCurr - tPrev) / (1000 * 60 * 60);
    if (gapHours > maxGapHours) maxGapHours = gapHours;
  }

  const hasDataGaps = maxGapHours > 48;

  return {
    parameter: sorted[0].parameter,
    count: sorted.length,
    min,
    max,
    mean,
    median,
    latest,
    first,
    deltaAbsolute,
    deltaPercent,
    direction,
    hasDataGaps,
    maxGapHours: Number(maxGapHours.toFixed(1)),
    unit: sorted[0].unit
  };
}

export function filterReadingsByDays(readings: HealthReading[], days: number): HealthReading[] {
  if (days <= 0) return readings;
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  return readings.filter(r => new Date(r.timestamp).getTime() >= cutoff);
}
