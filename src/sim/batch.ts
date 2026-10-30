import { simulate } from './engine';
import type { CombatResult, GameData, Placement, SimRules, Team } from './types';

export interface UnitSummary {
  uid: string;
  unitId: string;
  team: Team;
  star: number;
  avgDamage: number;
  avgTaken: number;
  avgHealing: number;
  avgShielding: number;
  avgCasts: number;
  survivalRate: number;
}

export interface BatchSummary {
  runs: number;
  winsA: number;
  winsB: number;
  draws: number;
  winRateA: number;
  winRateB: number;
  avgDuration: number;
  avgSurvivorsA: number;
  avgSurvivorsB: number;
  /** average remaining HP of the winning side as % of its total max HP */
  avgWinnerHpPct: number;
  units: UnitSummary[];
  /** winner of each run in seed order — lets two batches on the same seeds be compared pairwise */
  winners?: ('A' | 'B' | 'draw')[];
}

export function summarize(results: CombatResult[]): BatchSummary {
  const runs = results.length;
  const s: BatchSummary = {
    runs, winsA: 0, winsB: 0, draws: 0, winRateA: 0, winRateB: 0, avgDuration: 0,
    avgSurvivorsA: 0, avgSurvivorsB: 0, avgWinnerHpPct: 0, units: [], winners: results.map((r) => r.winner),
  };
  if (!runs) return s;
  const acc = new Map<string, UnitSummary>();
  let winnerHp = 0;
  let decided = 0;
  for (const r of results) {
    if (r.winner === 'A') s.winsA++;
    else if (r.winner === 'B') s.winsB++;
    else s.draws++;
    s.avgDuration += r.duration;
    s.avgSurvivorsA += r.units.filter((u) => u.team === 'A' && u.alive).length;
    s.avgSurvivorsB += r.units.filter((u) => u.team === 'B' && u.alive).length;
    if (r.winner !== 'draw') {
      const side = r.units.filter((u) => u.team === r.winner);
      const max = side.reduce((a, u) => a + u.maxHp, 0);
      winnerHp += max > 0 ? side.reduce((a, u) => a + u.hpLeft, 0) / max : 0;
      decided++;
    }
    for (const u of r.units) {
      let a = acc.get(u.uid);
      if (!a) {
        a = { uid: u.uid, unitId: u.unitId, team: u.team, star: u.star, avgDamage: 0, avgTaken: 0, avgHealing: 0, avgShielding: 0, avgCasts: 0, survivalRate: 0 };
        acc.set(u.uid, a);
      }
      a.avgDamage += u.damageDealt;
      a.avgTaken += u.damageTaken;
      a.avgHealing += u.healing;
      a.avgShielding += u.shielding;
      a.avgCasts += u.casts;
      a.survivalRate += u.alive ? 1 : 0;
    }
  }
  s.winRateA = s.winsA / runs;
  s.winRateB = s.winsB / runs;
  s.avgDuration /= runs;
  s.avgSurvivorsA /= runs;
  s.avgSurvivorsB /= runs;
  s.avgWinnerHpPct = decided ? winnerHp / decided : 0;
  s.units = [...acc.values()].map((a) => ({
    ...a,
    avgDamage: a.avgDamage / runs,
    avgTaken: a.avgTaken / runs,
    avgHealing: a.avgHealing / runs,
    avgShielding: a.avgShielding / runs,
    avgCasts: a.avgCasts / runs,
    survivalRate: a.survivalRate / runs,
  }));
  return s;
}

/** Run `n` seeded combats synchronously (seeds seedStart … seedStart+n-1). */
export function runBatch(data: GameData, placements: Placement[], n: number, seedStart = 1, rules?: Partial<SimRules>): BatchSummary {
  const results: CombatResult[] = [];
  for (let i = 0; i < n; i++) results.push(simulate({ data, placements, seed: seedStart + i, rules, record: false }));
  return summarize(results);
}

/** Same as runBatch but yields to the UI between chunks and reports progress. */
export async function runBatchAsync(
  data: GameData,
  placements: Placement[],
  n: number,
  onProgress?: (done: number, total: number) => void,
  seedStart = 1,
  rules?: Partial<SimRules>,
  chunk = 10,
): Promise<BatchSummary> {
  const results: CombatResult[] = [];
  for (let i = 0; i < n; i += chunk) {
    for (let j = i; j < Math.min(n, i + chunk); j++) results.push(simulate({ data, placements, seed: seedStart + j, rules, record: false }));
    onProgress?.(results.length, n);
    await new Promise((r) => setTimeout(r, 0));
  }
  return summarize(results);
}
