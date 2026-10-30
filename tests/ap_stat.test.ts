import { baselineData } from '../src/data';
import { Combat } from '../src/sim/engine';
import { diffData, setPath } from '../src/sim/patch';
import { migrateProject } from '../src/store/project';
import { caster, dataWith, place, testUnit } from './helpers';

describe('editable Ability Power stat', () => {
  it('every baseline unit starts at 100 AP', () => {
    const d = baselineData();
    for (const u of Object.values(d.units)) expect(u.ap, u.id).toBe(100);
  });

  it("a unit's AP is its own AP stat plus bonuses", () => {
    const data = dataWith(testUnit('me', { ap: 140 }), testUnit('e'));
    const c = new Combat({ data, seed: 1, placements: [place('me', 'A', 3, 4), place('e', 'B', 3, 3)] });
    const me = c.units[0];
    expect(c.ap(me)).toBe(140);
    me.bonus.apFlat = 10;
    expect(c.ap(me)).toBe(150);
  });

  it('units without an AP value fall back to the 100 AP rule', () => {
    const data = dataWith(testUnit('me'), testUnit('e'));
    const c = new Combat({ data, seed: 1, placements: [place('me', 'A', 3, 4), place('e', 'B', 3, 3)] });
    expect(c.ap(c.units[0])).toBe(100);
  });

  it('raising AP scales AP abilities (100 AP-value at 150 AP deals 150)', () => {
    const data = dataWith(caster('me', [{ t: 'dmg', dt: 'true', tgt: 'target', v: { ap: [100, 100, 100] } }], { ap: 150 }), testUnit('e'));
    const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place('me', 'A', 3, 4), place('e', 'B', 3, 3)] });
    c.cast(c.units[0]);
    expect(c.units[1].hp).toBe(850);
  });

  it('AP edits do not change AD abilities', () => {
    const data = dataWith(caster('me', [{ t: 'dmg', dt: 'true', tgt: 'target', v: { ad: [200, 200, 200] } }], { ap: 300 }), testUnit('e'));
    const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place('me', 'A', 3, 4), place('e', 'B', 3, 3)] });
    c.cast(c.units[0]);
    expect(c.units[1].hp).toBe(900);
  });

  it('editing a real unit (Lux) AP changes her ability damage proportionally', () => {
    const run = (ap: number) => {
      const data = baselineData();
      data.units.lux.ap = ap;
      data.units.dummy = testUnit('dummy', { hp: [1e6, 1e6, 1e6], ad: [0, 0, 0] });
      const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place('lux', 'A', 3, 6), place('dummy', 'B', 3, 1)] });
      c.cast(c.units[0]);
      return 1e6 - c.units[1].hp;
    };
    const at100 = run(100);
    expect(at100).toBeGreaterThan(0);
    expect(run(200)).toBeCloseTo(at100 * 2, 6);
  });

  it('AP edits show up in the patch diff as "Ability Power"', () => {
    const base = baselineData();
    const w = baselineData();
    setPath(w, ['units', 'lux', 'ap'], 120);
    const ch = diffData(base, w);
    expect(ch).toHaveLength(1);
    expect(ch[0].label).toBe('Ability Power');
    expect(ch[0].from).toBe(100);
    expect(ch[0].to).toBe(120);
    expect(ch[0].pct).toBeCloseTo(20, 6);
  });

  it('saved projects from older builds get AP filled in without losing other edits', () => {
    const old = baselineData();
    for (const u of Object.values(old.units)) delete u.ap;
    old.units.lux.hp[0] = 999;
    const st = migrateProject({ working: old }, 1);
    expect(st.working.units.lux.ap).toBe(100);
    expect(st.working.units.lux.hp[0]).toBe(999);
    expect(Object.values(st.working.units).every((u) => u.ap === 100)).toBe(true);
  });
});
