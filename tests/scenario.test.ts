import { baselineData } from '../src/data';
import { PROPOSALS, SCENARIOS } from '../src/mock/proposals';
import { runBatch } from '../src/sim/batch';
import { countTraits } from '../src/sim/traitCount';
import { checkLimits, diffData, parseLimits } from '../src/sim/patch';

describe('demo scenarios and placeholder proposals', () => {
  it('scenario placements are valid and non-overlapping on the right half', () => {
    const d = baselineData();
    for (const sc of SCENARIOS) {
      const keys = sc.placements.map((p) => `${p.hex.col},${p.hex.row}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const p of sc.placements) {
        expect(d.units[p.unitId]).toBeDefined();
        if (p.team === 'A') expect(p.hex.row).toBeGreaterThanOrEqual(4);
        else expect(p.hex.row).toBeLessThanOrEqual(3);
      }
    }
  });

  it('the Riftbeast scenario reaches Riftbeast 7 for blue', () => {
    const sc = SCENARIOS[0];
    const t = countTraits(baselineData(), sc.placements, 'A').find((x) => x.traitId === 'riftbeast')!;
    expect(t.count).toBe(7);
    expect(t.level).toBe(2);
  });

  it('each proposal changes data, and only the Elder Dragon one breaks the default limits', () => {
    const limits = parseLimits(['Keep every numeric change within ±10%', 'No new mechanics this patch', 'Do not change Elder Dragon base stats'], baselineData());
    for (const p of PROPOSALS) {
      const d = baselineData();
      p.apply(d);
      const ch = diffData(baselineData(), d);
      expect(ch.length).toBeGreaterThan(0);
      const v = checkLimits(ch, limits);
      if (p.id === 'p-elder') expect(v.length).toBeGreaterThan(0);
      else expect(v).toHaveLength(0);
    }
  });

  it('prints baseline vs proposal win rates for the demo scenario', () => {
    const sc = SCENARIOS[0];
    const base = runBatch(baselineData(), sc.placements, 100);
    const out = [`baseline blue win ${(base.winRateA * 100).toFixed(0)}% draw ${base.draws} dur ${base.avgDuration.toFixed(1)}`];
    for (const p of PROPOSALS) {
      const d = baselineData();
      p.apply(d);
      const r = runBatch(d, sc.placements, 100);
      out.push(`${p.id}: blue win ${(r.winRateA * 100).toFixed(0)}% (Δ ${((r.winRateA - base.winRateA) * 100).toFixed(1)} pts)`);
    }
    const lun = runBatch(baselineData(), SCENARIOS[1].placements, 100);
    out.push(`lunar scenario blue win ${(lun.winRateA * 100).toFixed(0)}% dur ${lun.avgDuration.toFixed(1)}`);
    console.log(out.join('\n'));
    expect(base.runs).toBe(100);
  });
});
