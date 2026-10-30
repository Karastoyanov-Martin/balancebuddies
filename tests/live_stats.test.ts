import { alignToBaseline, baselineData } from '../src/data';
import { describeEffect, evalScaling, formulaText } from '../src/sim/describe';
import { Combat, RIFTBEAST_GROWTH_INTERVAL, simulate } from '../src/sim/engine';
import { diffData } from '../src/sim/patch';
import type { Effect, GameData, Scaling } from '../src/sim/types';
import { caster, dataWith, place, testUnit } from './helpers';

const S = { ad: 50, ap: 150, maxHp: 1000, armor: 40, mr: 20 };

describe('scaling formula (shared by engine and UI)', () => {
  it('adds every part: %AD, AP×AP/100, %HP, %Armor, %MR, flat', () => {
    const v: Scaling = { ad: [200, 0, 0], ap: [100, 0, 0], hp: [10, 0, 0], arm: [50, 0, 0], mr: [100, 0, 0], flat: [7, 0, 0] };
    // 100 + 150 + 100 + 20 + 20 + 7
    expect(evalScaling(v, 0, S)).toBe(397);
  });

  it('the engine uses exactly this formula with the unit’s current stats', () => {
    const data = dataWith(testUnit('me', { ap: 130, armor: 30 }), testUnit('e'));
    const c = new Combat({ data, seed: 1, placements: [place('me', 'A', 3, 4), place('e', 'B', 3, 3)] });
    const u = c.units[0];
    u.bonus.apFlat = 20;
    const v: Scaling = { ap: [100, 100, 100], arm: [100, 100, 100] };
    const st = c.liveStats(u);
    expect(c.amount(u, v)).toBeCloseTo(evalScaling(v, 0, { ad: st.ad, ap: st.ap, maxHp: u.maxHp, armor: st.armor, mr: st.mr }), 9);
    expect(c.amount(u, v)).toBeCloseTo(150 + 30, 9);
  });

  it('explains the formula in words', () => {
    expect(formulaText({ ap: [375, 0, 0] }, 0, S)).toBe('375 × 1.50 (150 AP) (563)');
    expect(formulaText({ ad: [310, 0, 0], ap: [30, 0, 0] }, 0, S)).toBe('310% AD (155) + 30 × 1.50 (150 AP) (45)');
  });
});

describe('ability numbers shown in the Unit tab', () => {
  it('magic damage follows AP', () => {
    const e: Effect = { t: 'dmg', dt: 'magic', tgt: 'line', v: { ap: [375, 565, 6500] } };
    expect(describeEffect(e, 0, S).value).toBe('563');
    expect(describeEffect(e, 0, { ...S, ap: 100 }).value).toBe('375');
    expect(describeEffect(e, 1, S).usesAp).toBe(true);
  });

  it('AP-scaled buffs follow AP, flat buffs do not', () => {
    const scaled: Effect = { t: 'buff', stat: 'asPct', v: [40, 40, 40], dur: 3, scaleAp: true };
    const flat: Effect = { t: 'buff', stat: 'asPct', v: [40, 40, 40], dur: 3 };
    expect(describeEffect(scaled, 0, S).value).toBe('+60% Attack Speed');
    expect(describeEffect(flat, 0, S).value).toBe('+40% Attack Speed');
  });

  it('every effect of every unit can be described (no crash, no NaN)', () => {
    const d = baselineData();
    for (const u of Object.values(d.units))
      for (const e of u.ability.effects)
        for (const k of [0, 1, 2]) {
          const l = describeEffect(e, k, S);
          expect(l.label, u.id).toBeTruthy();
          expect(l.value, u.id).not.toMatch(/NaN|undefined/);
        }
  });
});

/** Everything a cast produces in 4 s against durable, harmless dummies. */
function castOutput(unitId: string, ap: number): number {
  const data = baselineData();
  data.units[unitId].ap = ap;
  data.units.dummy = testUnit('dummy', { hp: [1e7, 1e7, 1e7], ad: [0, 0, 0], armor: 60, mr: 60, manaMode: 'none' });
  const c = new Combat({
    data, seed: 3, rules: { critChance: 0, moveTime: 99 },
    placements: [place(unitId, 'A', 3, 4, 1, 'me'), place('dummy', 'B', 3, 3, 1, 'd1'), place('dummy', 'B', 4, 3, 1, 'd2'), place('dummy', 'B', 2, 3, 1, 'd3'), place('dummy', 'A', 2, 4, 1, 'ally')],
  });
  const me = c.units[0];
  const ally = c.units[4];
  const hp0 = me.maxHp;
  // two casts (the second covers 'afterFirst' effects); leave room to heal before each
  for (let k = 0; k < 2; k++) {
    me.hp = Math.max(1, me.maxHp * 0.1);
    ally.hp = ally.maxHp * 0.1;
    c.cast(me);
    for (let i = 0; i < 80; i++) c.step();
  }
  return me.res.damageDealt + me.res.healing + me.res.shielding + (me.maxHp - hp0) + me.res.attacks * 0;
}

describe('Ability Power reaches every AP-scaled ability', () => {
  const d = baselineData();
  const apUnits = Object.values(d.units).filter((u) =>
    u.ability.effects.some((e) => ('v' in e && e.v && !Array.isArray(e.v) && (e.v as Scaling).ap) || ('scaleAp' in e && e.scaleAp)),
  );
  it('there are many AP-scaled units to check', () => expect(apUnits.length).toBeGreaterThan(40));
  for (const u of apUnits) {
    it(`${u.name}: more AP → stronger ability`, () => {
      expect(castOutput(u.id, 150)).toBeGreaterThan(castOutput(u.id, 100));
    });
  }

  it('Brambleback ignores 30% + 10% × AP/100 Armor', () => {
    const data = baselineData();
    data.units.brambleback.ap = 200;
    data.units.dummy = testUnit('dummy');
    const c = new Combat({ data, seed: 1, placements: [place('brambleback', 'A', 3, 4), place('dummy', 'B', 3, 3)] });
    c.cast(c.units[0]);
    expect(c.stat(c.units[0], 'armorPen')).toBeCloseTo(50, 9);
  });
});

describe('stats change during the fight and are recorded for playback', () => {
  it('every frame carries each unit’s live stats', () => {
    const r = simulate({ data: baselineData(), seed: 1, record: true, placements: [place('lux', 'A', 3, 6), place('vi', 'B', 3, 1)] });
    for (const f of r.frames) for (const u of f.units) {
      expect(u.stats).toBeDefined();
      expect(u.stats!.ad).toBeGreaterThan(0);
      expect(u.stats!.ap).toBeGreaterThan(0);
    }
  });

  it('timed buffs show up and wear off (Vi gains Attack Speed for 3 s after casting)', () => {
    const data = baselineData();
    data.units.dummy = testUnit('dummy', { hp: [1e7, 1e7, 1e7], ad: [0, 0, 0] });
    data.units.vi.manaStart = data.units.vi.manaMax; // cast right away
    const r = simulate({ data, seed: 1, record: true, rules: { maxTime: 8, moveTime: 99 }, placements: [place('vi', 'A', 3, 4, 1, 'vi'), place('dummy', 'B', 3, 3)] });
    const as = r.frames.map((f) => f.units.find((u) => u.uid === 'vi')!.stats!.as);
    const start = as[0];
    const peak = Math.max(...as);
    expect(peak).toBeGreaterThan(start * 1.5);
    const castAt = r.frames.find((f) => f.units.find((u) => u.uid === 'vi')!.stats!.as === peak)!.t;
    const later = r.frames.find((f) => f.t >= castAt + 3.2);
    if (later) expect(later.units.find((u) => u.uid === 'vi')!.stats!.as).toBeLessThan(peak);
  });

  it('Riftbeast 7 growth raises AD and AP every 5 s in the recorded frames', () => {
    const data = baselineData();
    const beasts = Object.values(data.units).filter((u) => u.traits.includes('riftbeast')).slice(0, 7);
    expect(beasts.length).toBe(7);
    data.units.dummy = testUnit('dummy', { hp: [1e8, 1e8, 1e8], ad: [0, 0, 0] });
    const placements = beasts.map((u, i) => place(u.id, 'A', i, 7, 1, `b${i}`));
    placements.push(place('dummy', 'B', 3, 0, 1, 'dummy'));
    const r = simulate({ data, seed: 1, record: true, rules: { maxTime: 11, moveTime: 99 }, placements });
    const at = (t: number) => r.frames.find((f) => f.t >= t)!.units.find((u) => u.uid === 'b0')!.stats!;
    const s0 = at(0);
    const s6 = at(RIFTBEAST_GROWTH_INTERVAL + 0.5);
    const s11 = at(2 * RIFTBEAST_GROWTH_INTERVAL + 0.5);
    expect(s6.ap).toBeGreaterThan(s0.ap);
    expect(s11.ap).toBeGreaterThan(s6.ap);
    expect(s6.ad).toBeGreaterThan(s0.ad);
  });
});

describe('saved data from older builds is re-shaped, edits kept', () => {
  function oldSave(): GameData {
    const d = baselineData() as GameData & { traits: Record<string, { params: { key: string; values: number[]; label: string; scope: string }[] }> };
    for (const u of Object.values(d.units)) delete u.ap;
    d.units.lux.hp[0] = 999;
    // old Riftbeast: growth interval param, 4 values each
    d.traits.riftbeast.params = [
      { key: 'growthPct', label: 'old', values: [0, 0, 6, 6], scope: 'members' },
      { key: 'growthInterval', label: 'Growth interval (s)', values: [5, 5, 5, 5], scope: 'members' },
    ];
    // old Hunter: lock amp stored per breakpoint, edited at the first breakpoint
    const h = d.traits.hunter.params.find((p) => p.key === 'lockAmp')!;
    h.values = [12, 10, 10, 10];
    d.traits.inferno.disabled = true;
    // old Brambleback: one 40% armor-pen buff
    d.units.brambleback.ability.effects = [d.units.brambleback.ability.effects[0], { t: 'buff', stat: 'armorPen', v: [40, 40, 40], dur: 8 }];
    return d;
  }

  it('adds AP, keeps edited numbers and switches', () => {
    const w = alignToBaseline(oldSave());
    expect(w.units.lux.ap).toBe(100);
    expect(w.units.lux.hp[0]).toBe(999);
    expect(w.traits.inferno.disabled).toBe(true);
  });

  it('drops the removed Riftbeast growth interval and keeps the edited growth', () => {
    const w = alignToBaseline(oldSave());
    expect(w.traits.riftbeast.params.map((p) => p.key)).toEqual(['growthPct']);
    expect(w.traits.riftbeast.params[0].values).toEqual([0, 0, 6, 6]);
    expect(w.traits.riftbeast.params[0].label).toBe(baselineData().traits.riftbeast.params[0].label);
  });

  it('collapses a per-breakpoint constant into one value, keeping the edit', () => {
    const w = alignToBaseline(oldSave());
    expect(w.traits.hunter.params.find((p) => p.key === 'lockAmp')!.values).toEqual([12]);
  });

  it('the re-shaped data diffs cleanly against the baseline', () => {
    const ch = diffData(baselineData(), alignToBaseline(oldSave()));
    const labels = ch.map((c) => `${c.name}: ${c.label}`).sort();
    expect(labels).toEqual(
      [
        'Hunter: Damage Amp after 3s on same target (%) (all breakpoints)',
        'Inferno: Trait switched off',
        'Lux: Health 1★',
        'Riftbeast: AD & AP gained every 5 s (%) @ 10',
        'Riftbeast: AD & AP gained every 5 s (%) @ 7',
      ].sort(),
    );
  });

  it('an untouched current save is unchanged by alignment', () => {
    const d = baselineData();
    expect(alignToBaseline(d)).toEqual(baselineData());
  });

  it('caster helper still works with AP (sanity)', () => {
    const data = dataWith(caster('me', [{ t: 'heal', v: { ap: [100, 100, 100] } }], { ap: 200 }));
    expect(data.units.me.ap).toBe(200);
  });
});
