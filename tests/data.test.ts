import { baselineData } from '../src/data';
import { TRAITS } from '../src/data/traits';
import { UNITS } from '../src/data/units';
import { simulate } from '../src/sim/engine';
import { dataWith, place, testUnit } from './helpers';

describe('Set 18 data integrity (patch 18.5)', () => {
  it('has all 65 shop units with the right cost split (14/13/14/14/10)', () => {
    expect(UNITS).toHaveLength(65);
    const byCost = [1, 2, 3, 4, 5].map((c) => UNITS.filter((u) => u.cost === c).length);
    expect(byCost).toEqual([14, 13, 14, 14, 10]);
  });

  it('unit ids are unique', () => {
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(UNITS.length);
  });

  it('has 36 traits with unique ids', () => {
    expect(TRAITS).toHaveLength(36);
    expect(new Set(TRAITS.map((t) => t.id)).size).toBe(36);
  });

  it('every trait referenced by a unit exists', () => {
    const ids = new Set(TRAITS.map((t) => t.id));
    for (const u of UNITS) for (const t of u.traits) expect(ids.has(t), `${u.name} → ${t}`).toBe(true);
  });

  it('every trait (except Eclipse) is carried by at least one unit', () => {
    for (const t of TRAITS) {
      if (t.id === 'eclipse') continue;
      expect(UNITS.some((u) => u.traits.includes(t.id)), t.name).toBe(true);
    }
  });

  it('per-star stats are well formed and increase with stars', () => {
    for (const u of UNITS) {
      expect(u.hp).toHaveLength(3);
      expect(u.ad).toHaveLength(3);
      expect(u.hp[0]).toBeGreaterThan(0);
      expect(u.hp[1]).toBeGreaterThan(u.hp[0]);
      expect(u.hp[2]).toBeGreaterThan(u.hp[1]);
      expect(u.ad[2]).toBeGreaterThanOrEqual(u.ad[1]);
      expect(u.as).toBeGreaterThan(0);
      expect(u.range).toBeGreaterThanOrEqual(1);
      expect(u.armor).toBeGreaterThanOrEqual(0);
      expect(u.manaMax).toBeGreaterThanOrEqual(u.manaStart);
    }
  });

  it('trait breakpoints ascend and param arrays match breakpoint count', () => {
    for (const t of TRAITS) {
      for (let i = 1; i < t.breakpoints.length; i++) expect(t.breakpoints[i]).toBeGreaterThan(t.breakpoints[i - 1]);
      for (const p of t.params) {
        // a value per breakpoint, or one value when it is the same at every breakpoint
        expect(p.values.length, `${t.name}.${p.key}`).toBe(p.same ? 1 : t.breakpoints.length);
        // effects that start at a later breakpoint are 0 before it
        if (p.from) for (let i = 0; i < p.from; i++) expect(p.values[i], `${t.name}.${p.key}[${i}]`).toBe(0);
        if (p.from) expect(p.values[p.from], `${t.name}.${p.key} from`).toBeGreaterThan(0);
      }
    }
  });

  it('ability per-star arrays all have 3 entries', () => {
    for (const u of UNITS) {
      for (const e of u.ability.effects) {
        const v = (e as { v?: unknown }).v;
        if (Array.isArray(v)) expect(v).toHaveLength(3);
        else if (v && typeof v === 'object') for (const arr of Object.values(v)) expect(arr).toHaveLength(3);
      }
    }
  });

  it('includes key 18.5 balance changes', () => {
    const d = baselineData();
    expect(d.units.tristana.manaMax).toBe(50);
    expect(d.units.taric.armor).toBe(70);
    expect(d.units.alune.as).toBe(0.85);
    expect(d.traits.rapidfire.params.find((p) => p.key === 'asPerAttack')!.values).toEqual([3, 5, 7, 10]);
    expect(d.traits.fae.params.find((p) => p.key === 'lowHpHealPct')!.values).toEqual([3, 5]);
    expect(d.traits.riftbeast.params.find((p) => p.key === 'growthPct')!.values[2]).toBe(5);
  });

  it('baselineData returns an independent deep copy', () => {
    const a = baselineData();
    const b = baselineData();
    a.units.akali.hp[0] = 1;
    expect(b.units.akali.hp[0]).toBe(650);
  });
});

describe('smoke: every unit can fight at every star level', () => {
  const data = baselineData();
  for (const u of UNITS) {
    it(`${u.name} runs without errors`, () => {
      for (const star of [1, 2, 3] as const) {
        const r = simulate({
          data,
          seed: 7,
          placements: [place(u.id, 'A', 3, 5, star), place('leona', 'B', 3, 2, 2), place('varus', 'B', 2, 0, 1)],
          rules: { maxTime: 20 },
        });
        expect(['A', 'B', 'draw']).toContain(r.winner);
        const me = r.units.find((x) => x.unitId === u.id)!;
        expect(Number.isFinite(me.damageDealt)).toBe(true);
        expect(me.damageDealt).toBeGreaterThanOrEqual(0);
      }
    });
    if (u.manaMax > 0 && u.manaMode !== 'none') {
      it(`${u.name} reaches full mana and casts at every star (vs. a training dummy)`, () => {
        const d = dataWith(testUnit('dummy', { hp: [1e7, 1e7, 1e7], ad: [0, 0, 0] }));
        for (const star of [1, 2, 3] as const) {
          const r = simulate({ data: d, seed: 3, placements: [place(u.id, 'A', 3, 5, star), place('dummy', 'B', 3, 4)] });
          const me = r.units.find((x) => x.unitId === u.id)!;
          expect(me.casts, `${u.name} ${star}★ never cast`).toBeGreaterThan(0);
          expect(me.damageDealt + me.healing + me.shielding).toBeGreaterThan(0);
        }
      });
    }
  }
});
