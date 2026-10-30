import { baselineData } from '../src/data';
import { runBatch, runBatchAsync, summarize } from '../src/sim/batch';
import { simulate } from '../src/sim/engine';
import { checkLimits, diffData, getPath, parseLimits, setPath } from '../src/sim/patch';
import { place } from './helpers';
import { SCENARIOS } from '../src/mock/proposals';

const comp = () => [
  place('sett', 'A', 3, 4, 2, 'a1'), place('ahri', 'A', 3, 6, 2, 'a2'), place('vi', 'A', 2, 4, 2, 'a3'),
  place('krug', 'B', 3, 3, 2, 'b1'), place('ashe', 'B', 3, 0, 1, 'b2'), place('diana', 'B', 4, 3, 2, 'b3'),
];

describe('batch runner', () => {
  it('summary counts add up and rates are fractions', () => {
    const s = runBatch(baselineData(), comp(), 20);
    expect(s.runs).toBe(20);
    expect(s.winsA + s.winsB + s.draws).toBe(20);
    expect(s.winRateA).toBeCloseTo(s.winsA / 20, 9);
    expect(s.units).toHaveLength(6);
    for (const u of s.units) {
      expect(u.survivalRate).toBeGreaterThanOrEqual(0);
      expect(u.survivalRate).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same seeds', () => {
    const a = runBatch(baselineData(), comp(), 15, 100);
    const b = runBatch(baselineData(), comp(), 15, 100);
    expect(a).toEqual(b);
  });

  it('async runner matches sync runner and reports progress', async () => {
    const progress: number[] = [];
    const a = await runBatchAsync(baselineData(), comp(), 12, (d) => progress.push(d), 5, undefined, 5);
    const b = runBatch(baselineData(), comp(), 12, 5);
    expect(a).toEqual(b);
    expect(progress).toEqual([5, 10, 12]);
  });

  it('summarize handles an empty list', () => {
    expect(summarize([]).runs).toBe(0);
  });

  it('a big nerf to one side lowers its win rate', () => {
    const base = baselineData();
    const nerfed = baselineData();
    for (const id of ['sett', 'ahri', 'vi']) nerfed.units[id].ad = nerfed.units[id].ad.map((x) => x * 0.3) as [number, number, number];
    for (const id of ['sett', 'ahri', 'vi']) nerfed.units[id].hp = nerfed.units[id].hp.map((x) => x * 0.5) as [number, number, number];
    const before = runBatch(base, comp(), 20);
    const after = runBatch(nerfed, comp(), 20);
    expect(after.winRateA).toBeLessThan(before.winRateA + 1e-9);
  });

  it('a 3★ unit beats the same unit at 1★', () => {
    const r = simulate({ data: baselineData(), seed: 1, placements: [place('krug', 'A', 3, 4, 3), place('krug', 'B', 3, 3, 1)] });
    expect(r.winner).toBe('A');
  });
});

describe('patch diff', () => {
  it('detects numeric changes with labels and % change', () => {
    const base = baselineData();
    const mod = baselineData();
    mod.units.sentinel.hp[0] = 1170;
    mod.traits.riftbeast.params[0].values[2] = 4;
    const ch = diffData(base, mod);
    expect(ch).toHaveLength(2);
    const hp = ch.find((c) => c.kind === 'unit')!;
    expect(hp.label).toBe('Health 1★');
    expect(hp.pct).toBeCloseTo(-10, 6);
    const tr = ch.find((c) => c.kind === 'trait')!;
    expect(tr.name).toBe('Riftbeast');
    expect(tr.from).toBe(5);
    expect(tr.to).toBe(4);
    expect(tr.label).toContain('@ 7');
  });

  it('no changes → empty diff', () => {
    expect(diffData(baselineData(), baselineData())).toHaveLength(0);
  });

  it('pct is null when the baseline value is 0', () => {
    const mod = baselineData();
    mod.units.akali.manaStart = 10;
    expect(diffData(baselineData(), mod)[0].pct).toBeNull();
  });

  it('getPath / setPath round-trip', () => {
    const d = baselineData();
    setPath(d, ['units', 'ahri', 'ability', 'effects', 0, 'v', 'ap', 1], 600);
    expect(getPath(d, ['units', 'ahri', 'ability', 'effects', 0, 'v', 'ap', 1])).toBe(600);
  });

  it('ability value edits are captured', () => {
    const mod = baselineData();
    mod.units.ahri.ability.effects[0] = { ...mod.units.ahri.ability.effects[0] };
    setPath(mod, ['units', 'ahri', 'ability', 'effects', 0, 'v', 'ap', 0], 400);
    const ch = diffData(baselineData(), mod);
    expect(ch[0].label).toContain('Ability dmg #1');
    expect(ch[0].label).toContain('AP');
  });
});

describe('limits from the brief', () => {
  const data = baselineData();

  it('parses ±N% / "no more than N%" limits (keeps the strictest)', () => {
    expect(parseLimits(['Keep every change within ±10%'], data).maxPctChange).toBe(10);
    expect(parseLimits(['No more than 15% per stat', 'max 8% on any value'], data).maxPctChange).toBe(8);
    expect(parseLimits(['Be careful'], data).maxPctChange).toBeNull();
  });

  it('parses locked units and traits by name (whole words only)', () => {
    const l = parseLimits(['Do not change Elder Dragon', "Don't touch the Coven trait", 'Keep viable comps alive'], data);
    expect(l.lockedUnits).toEqual(['elderdragon']);
    expect(l.lockedTraits).toEqual(['coven']);
    expect(l.lockedUnits).not.toContain('vi'); // "viable" must not match Vi
  });

  it('flags "no new mechanics"', () => {
    expect(parseLimits(['No new mechanics this patch'], data).noNewMechanics).toBe(true);
  });

  it('checkLimits reports % and lock violations', () => {
    const mod = baselineData();
    mod.units.sentinel.hp[0] = 1000; // -23%
    mod.units.elderdragon.as = 0.45; // locked
    mod.units.krug.armor = 42; // +5%
    const v = checkLimits(diffData(data, mod), { maxPctChange: 10, lockedUnits: ['elderdragon'], lockedTraits: [] });
    expect(v).toHaveLength(2);
    expect(v.map((x) => x.change.id).sort()).toEqual(['elderdragon', 'sentinel']);
  });
});

import { ciPts, verdict } from '../src/sim/compare';
describe('expected vs actual', () => {
  const mk = (w: number, runs = 100) => ({ runs, winsA: w * runs, winsB: (1 - w) * runs, draws: 0, winRateA: w, winRateB: 1 - w, avgDuration: 20, avgSurvivorsA: 0, avgSurvivorsB: 0, avgWinnerHpPct: 0, units: [] });
  it('CI shrinks with more runs', () => {
    expect(ciPts(mk(0.5, 400), mk(0.5, 400))).toBeLessThan(ciPts(mk(0.5, 100), mk(0.5, 100)));
    expect(ciPts(mk(0.5), mk(0.5))).toBeCloseTo(1.96 * Math.sqrt(0.005) * 100, 6);
  });
  it('uses a paired estimate when both batches share seeds', () => {
    const a = { ...mk(0.5), winners: Array.from({ length: 100 }, (_, i) => (i % 2 ? 'A' : 'B')) as ('A' | 'B')[] };
    const same = { ...a };
    expect(ciPts(a, same)).toBe(0); // identical outcomes → no uncertainty about the difference
    const flipped = { ...a, winners: a.winners.map((w, i) => (i < 10 && w === 'B' ? 'A' : w)) as ('A' | 'B')[] };
    expect(ciPts(a, flipped)).toBeGreaterThan(0);
    expect(ciPts(a, flipped)).toBeLessThan(ciPts(mk(0.5), mk(0.55)));
  });
  it('classifies outcomes', () => {
    expect(verdict(-6, 3, { min: -10, max: -2 })).toBe('as-expected');
    expect(verdict(-1, 3, { min: -10, max: -2 })).toBe('inconclusive');
    expect(verdict(-20, 3, { min: -10, max: -2 })).toBe('larger');
    expect(verdict(-1.5, 1, { min: -10, max: -2 })).toBe('smaller');
    expect(verdict(8, 3, { min: -10, max: -2 })).toBe('opposite');
    expect(verdict(5, 3, null)).toBe('inconclusive');
  });
});

describe('trait on/off in the patch diff', () => {
  it('records a switched-off trait as a change and checks locks', () => {
    const mod = baselineData();
    mod.traits.riftbeast.disabled = true;
    const ch = diffData(baselineData(), mod);
    expect(ch).toHaveLength(1);
    expect(ch[0].label).toBe('Trait switched off');
    expect([ch[0].from, ch[0].to]).toEqual([1, 0]);
    expect(ch[0].pct).toBeNull();
    expect(checkLimits(ch, { maxPctChange: 10, lockedUnits: [], lockedTraits: ['riftbeast'] })).toHaveLength(1);
    expect(checkLimits(ch, { maxPctChange: 10, lockedUnits: [], lockedTraits: [] })).toHaveLength(0);
  });
  it('switching back on removes the change', () => {
    const mod = baselineData();
    mod.traits.riftbeast.disabled = false;
    expect(diffData(baselineData(), mod)).toHaveLength(0);
  });
});

describe('seeds', () => {
  const duel = () => [place('vi', 'A', 3, 4, 1, 'a'), place('warwick', 'B', 3, 3, 1, 'b')];
  it('same board + same data + same seed = identical fight', () => {
    const a = simulate({ data: baselineData(), placements: duel(), seed: 42 });
    const b = simulate({ data: baselineData(), placements: duel(), seed: 42 });
    expect(a).toEqual(b);
  });

  it('in a 1v1 the seed only matters through crits', () => {
    const dmg = (seed: number, critChance: number) => simulate({ data: baselineData(), placements: duel(), seed, rules: { critChance } }).units[0].damageDealt;
    expect(new Set([1, 2, 3, 4, 5].map((s) => dmg(s, 0))).size).toBe(1);
    expect(new Set([1, 2, 3, 4, 5].map((s) => dmg(s, 0.25))).size).toBeGreaterThan(1);
  });

  it('a different block of seeds gives a different (but similar) result for a big board', () => {
    const sc = SCENARIOS.find((x) => x.id === 'riftbeast-vs-executioner')!;
    const a = runBatch(baselineData(), sc.placements, 60, 1);
    const b = runBatch(baselineData(), sc.placements, 60, 5001);
    expect(a.units.map((u) => u.avgDamage)).not.toEqual(b.units.map((u) => u.avgDamage));
    expect(Math.abs(a.winRateA - b.winRateA)).toBeLessThan(0.25);
  });
});
