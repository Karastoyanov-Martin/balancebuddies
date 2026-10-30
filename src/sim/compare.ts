import type { BatchSummary } from './batch';

/*
 * Comparing a baseline batch with a proposed batch (Core Task 4 "reassess").
 */

/**
 * 95% CI half-width (percentage points) for the change in blue win rate.
 * When both batches ran on the same seeds (common random numbers) the runs are paired,
 * which removes most of the fight-to-fight noise; otherwise an unpaired estimate is used.
 */
export function ciPts(a: BatchSummary, b: BatchSummary): number {
  if (a.winners && b.winners && a.winners.length === b.winners.length && a.winners.length > 1) {
    const n = a.winners.length;
    const d = a.winners.map((w, i) => (b.winners![i] === 'A' ? 1 : 0) - (w === 'A' ? 1 : 0));
    const mean = d.reduce((x, y) => x + y, 0) / n;
    const v = d.reduce((x, y) => x + (y - mean) ** 2, 0) / (n - 1);
    return 1.96 * Math.sqrt(v / n) * 100;
  }
  const se = Math.sqrt((a.winRateA * (1 - a.winRateA)) / Math.max(1, a.runs) + (b.winRateA * (1 - b.winRateA)) / Math.max(1, b.runs));
  return 1.96 * se * 100;
}

export type Verdict = 'as-expected' | 'smaller' | 'larger' | 'opposite' | 'inconclusive';
export function verdict(delta: number, ci: number, exp: { min: number; max: number } | null): Verdict {
  if (!exp) return 'inconclusive';
  if (Math.abs(delta) <= ci && !(exp.min <= 0 && exp.max >= 0)) return 'inconclusive';
  if (delta >= exp.min && delta <= exp.max) return 'as-expected';
  const expSign = Math.sign((exp.min + exp.max) / 2);
  if (expSign !== 0 && Math.sign(delta) === -expSign && Math.abs(delta) > ci) return 'opposite';
  return Math.abs(delta) < Math.min(Math.abs(exp.min), Math.abs(exp.max)) ? 'smaller' : 'larger';
}

