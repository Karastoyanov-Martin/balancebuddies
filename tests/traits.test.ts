import { baselineData } from '../src/data';
import { Combat } from '../src/sim/engine';
import { countTraits, levelFor, paramAt } from '../src/sim/traitCount';
import { combat, dataWith, place, runUntil, testUnit } from './helpers';

const unitByDef = (c: Combat, id: string) => c.units.find((u) => u.def.id === id)!;
const level = (c: Combat, traitId: string, team: 'A' | 'B' = 'A') => c.traits.find((t) => t.traitId === traitId && t.team === team)?.level ?? -1;

describe('trait counting', () => {
  const data = baselineData();

  it('levelFor picks the highest reached breakpoint', () => {
    const t = data.traits.brawler; // 2/4/6
    expect(levelFor(t, 1)).toBe(-1);
    expect(levelFor(t, 2)).toBe(0);
    expect(levelFor(t, 5)).toBe(1);
    expect(levelFor(t, 9)).toBe(2);
  });

  it('paramAt reads per-breakpoint values', () => {
    expect(paramAt(data.traits.brawler, 'hpPct', 1)).toBe(40);
    expect(paramAt(data.traits.brawler, 'hpPct', -1)).toBe(0);
    expect(paramAt(data.traits.brawler, 'missing', 0)).toBe(0);
  });

  it('duplicate champions count once', () => {
    const t = countTraits(data, [place('kobuko', 'A', 0, 4), place('kobuko', 'A', 1, 4), place('alistar', 'A', 2, 4)], 'A');
    expect(t.find((x) => x.traitId === 'brawler')!.count).toBe(2);
  });

  it('only counts the requested team', () => {
    const t = countTraits(data, [place('kobuko', 'A', 0, 4), place('alistar', 'B', 2, 1)], 'A');
    expect(t.find((x) => x.traitId === 'brawler')!.count).toBe(1);
  });

  it('Apex Predator (Elder Dragon) adds +2 Riftbeast', () => {
    const t = countTraits(data, [place('elderdragon', 'A', 0, 4)], 'A');
    expect(t.find((x) => x.traitId === 'riftbeast')!.count).toBe(3); // itself + 2
    expect(t.find((x) => x.traitId === 'riftbeast')!.level).toBe(0);
  });

  it('Eclipse activates with 3 Solar + 3 Lunar', () => {
    const solar = ['leona', 'sejuani', 'kayle'];
    const lunar = ['diana', 'aphelios', 'alune'];
    const ps = [...solar, ...lunar].map((id, i) => place(id, 'A', i, 4));
    expect(countTraits(data, ps, 'A').find((x) => x.traitId === 'eclipse')?.level).toBe(0);
    expect(countTraits(data, ps.slice(0, 5), 'A').find((x) => x.traitId === 'eclipse')).toBeUndefined();
  });
});

describe('trait effects in combat', () => {
  it('Brawler (2): team +120 HP, Brawlers +25% max HP', () => {
    const data = dataWith(testUnit('dummy'));
    const c = new Combat({ data, seed: 1, placements: [place('kobuko', 'A', 0, 4), place('alistar', 'A', 1, 4), place('dummy', 'A', 2, 4), place('dummy', 'B', 3, 0)] });
    expect(level(c, 'brawler')).toBe(0);
    expect(unitByDef(c, 'kobuko').maxHp).toBeCloseTo((700 + 120) * 1.25, 6);
    expect(c.units[2].maxHp).toBeCloseTo(1000 + 120, 6);
    expect(c.units[3].maxHp).toBe(1000); // enemy unaffected
  });

  it('Juggernaut (2): members 20% durability, team 4%', () => {
    const data = dataWith(testUnit('dummy'));
    const c = new Combat({ data, seed: 1, placements: [place('rakan', 'A', 0, 4), place('yorick', 'A', 1, 4), place('dummy', 'A', 2, 4), place('dummy', 'B', 3, 0)] });
    expect(c.durability(unitByDef(c, 'yorick'))).toBeCloseTo(0.2, 6);
    expect(c.durability(c.units[2])).toBeCloseTo(0.04, 6);
  });

  it('Invoker (2): members 3 mana/s, team 1 mana/s', () => {
    const data = dataWith(testUnit('dummy'));
    const c = new Combat({ data, seed: 1, placements: [place('pebbles', 'A', 0, 4), place('teemo', 'A', 1, 4), place('dummy', 'A', 2, 4), place('dummy', 'B', 3, 0)] });
    expect(c.stat(unitByDef(c, 'pebbles'), 'manaRegen')).toBe(3);
    expect(c.stat(c.units[2], 'manaRegen')).toBe(1);
  });

  it('Defender (2): team +12 armor/MR, Defenders +25 instead', () => {
    const data = dataWith(testUnit('dummy'));
    const c = new Combat({ data, seed: 1, placements: [place('ornn', 'A', 0, 4), place('shen', 'A', 1, 4), place('dummy', 'A', 2, 4), place('dummy', 'B', 3, 0)] });
    expect(c.armor(unitByDef(c, 'shen'))).toBe(45 + 25);
    expect(c.armor(c.units[2])).toBe(12);
    expect(c.armor(c.units[3])).toBe(0); // enemy
  });

  it('Blackthorn (2): team +175 HP', () => {
    const data = dataWith(testUnit('dummy'));
    const c = new Combat({ data, seed: 1, placements: [place('reksai', 'A', 0, 4), place('warwick', 'A', 1, 4), place('dummy', 'A', 2, 4), place('dummy', 'B', 3, 0)] });
    expect(c.units[2].maxHp).toBe(1175);
  });

  it('Lunar (2): Lunar units double, adjacent allies single, distant allies nothing', () => {
    const data = dataWith(testUnit('near'), testUnit('far'), testUnit('dummy'));
    const c = new Combat({
      data, seed: 1,
      placements: [place('diana', 'A', 0, 4), place('aphelios', 'A', 0, 6), place('near', 'A', 1, 4), place('far', 'A', 6, 7), place('dummy', 'B', 3, 0)],
      rules: { fighterAsPct: 0 }, // Diana is a Fighter; isolate the Lunar bonus
    });
    const diana = unitByDef(c, 'diana');
    expect(c.stat(diana, 'asPct')).toBe(14);
    expect(c.stat(diana, 'apFlat')).toBe(14);
    expect(c.stat(unitByDef(c, 'near'), 'asPct')).toBe(7);
    expect(c.stat(unitByDef(c, 'far'), 'asPct')).toBe(0);
  });

  it('Rapidfire (2): team +10% AS; members stack AS per attack up to max', () => {
    const data = dataWith(testUnit('t', { hp: [1e6, 1e6, 1e6], ad: [0, 0, 0] }));
    const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place('varus', 'A', 3, 6), place('xayah', 'A', 4, 6), place('t', 'B', 3, 2)] });
    const varus = unitByDef(c, 'varus');
    expect(c.stat(varus, 'asPct')).toBe(10);
    const t = c.units[2];
    for (let i = 0; i < 15; i++) c.attack(varus, t);
    expect(varus.rapidStacks).toBe(10);
    expect(c.as(varus)).toBeCloseTo(0.75 * (1 + (10 + 30) / 100), 6);
  });

  it('Ravager (2): +12% amp, doubled vs targets below 50% HP; +10% omnivamp', () => {
    const data = dataWith(testUnit('t', { hp: [1000, 1000, 1000] }));
    const c = new Combat({ data, seed: 1, placements: [place('camille', 'A', 0, 4), place('akali', 'A', 1, 4), place('t', 'B', 3, 2)] });
    const cam = unitByDef(c, 'camille');
    const t = c.units[2];
    expect(c.stat(cam, 'omnivamp')).toBe(10);
    expect(c.dealDamage(cam, t, 100, 'true')).toBeCloseTo(112, 6);
    t.hp = 400;
    expect(c.dealDamage(cam, t, 100, 'true')).toBeCloseTo(124, 6);
  });

  it('Hunter (2): +20% AD; +10% amp after 3s on the same target', () => {
    const data = dataWith(testUnit('t', { hp: [1e6, 1e6, 1e6], ad: [0, 0, 0] }));
    const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place('caitlyn', 'A', 3, 6), place('cinderling', 'A', 4, 6), place('t', 'B', 3, 2)] });
    const cait = unitByDef(c, 'caitlyn');
    expect(c.ad(cait)).toBeCloseTo(50 * 1.2, 6);
    const t = c.units[2];
    cait.target = t;
    cait.targetSince = 0;
    expect(c.dealDamage(cait, t, 100, 'true')).toBeCloseTo(100, 6);
    runUntil(c, () => c.t >= 3.01, 100);
    cait.target = t;
    cait.targetSince = 0;
    expect(c.dealDamage(cait, t, 100, 'true')).toBeCloseTo(110, 6);
  });

  it('Vanguard (2): shield at combat start and again when first below 50%', () => {
    const data = dataWith(testUnit('t'));
    const c = new Combat({ data, seed: 1, placements: [place('elise', 'A', 0, 4), place('rakan', 'A', 1, 4), place('t', 'B', 3, 2)] });
    const elise = unitByDef(c, 'elise');
    expect(c.shieldTotal(elise)).toBeCloseTo(elise.maxHp * 0.18, 6);
    const t = c.units[2];
    elise.shields = [];
    c.dealDamage(t, elise, elise.maxHp * 0.6, 'true');
    expect(c.shieldTotal(elise)).toBeCloseTo(elise.maxHp * 0.18, 6);
  });

  it('Solar (3): 5% max HP shield and +8% magic damage for the whole team', () => {
    const data = dataWith(testUnit('ally'), testUnit('t'));
    const c = new Combat({ data, seed: 1, placements: [place('leona', 'A', 0, 4), place('sejuani', 'A', 1, 4), place('kayle', 'A', 2, 4), place('ally', 'A', 3, 4), place('t', 'B', 3, 2)] });
    const ally = unitByDef(c, 'ally');
    expect(c.shieldTotal(ally)).toBeCloseTo(50, 6);
    const t = unitByDef(c, 't');
    expect(c.dealDamage(ally, t, 100, 'magic')).toBeCloseTo(108, 6);
    expect(c.dealDamage(ally, t, 100, 'true')).toBeCloseTo(100, 6);
  });

  it('Executioner (2): +15% crit chance', () => {
    const data = dataWith(testUnit('t'));
    const c = new Combat({ data, seed: 1, placements: [place('yunara', 'A', 0, 4), place('azir', 'A', 1, 4), place('t', 'B', 3, 2)] });
    expect(c.critChance(unitByDef(c, 'yunara'))).toBeCloseTo(0.4, 6);
  });

  it('Executioner (3): bleed adds bonus true damage', () => {
    const data = dataWith(testUnit('t', { hp: [1e6, 1e6, 1e6] }));
    const c = new Combat({ data, seed: 1, placements: [place('yunara', 'A', 0, 4), place('azir', 'A', 1, 4), place('soraka', 'A', 2, 4), place('t', 'B', 3, 2)] });
    const y = unitByDef(c, 'yunara');
    const t = unitByDef(c, 't');
    c.dealDamage(y, t, 100, 'physical');
    expect(1e6 - t.hp).toBeCloseTo(100 + 25, 6);
  });

  it('Caustic: damage reduces target armor and MR by 30%', () => {
    const data = dataWith(testUnit('t', { armor: 100, mr: 100 }));
    const c = new Combat({ data, seed: 1, placements: [place('kogmaw', 'A', 0, 4), place('t', 'B', 3, 2)] });
    const t = unitByDef(c, 't');
    c.dealDamage(unitByDef(c, 'kogmaw'), t, 10, 'true');
    expect(c.armor(t)).toBeCloseTo(70, 6);
    expect(c.mr(t)).toBeCloseTo(70, 6);
  });

  it('Inferno (2): damage applies a burn (true % max HP per second) and wound', () => {
    const data = dataWith(testUnit('t', { hp: [10000, 10000, 10000], ad: [0, 0, 0] }));
    const c = new Combat({ data, seed: 1, rules: { moveTime: 99 }, placements: [place('akali', 'A', 0, 7), place('shen', 'A', 1, 7), place('t', 'B', 6, 0)] });
    const t = unitByDef(c, 't');
    c.dealDamage(unitByDef(c, 'akali'), t, 1, 'true');
    expect(t.burn?.pct).toBe(1);
    expect(t.wound?.pct).toBe(33);
    const before = t.hp;
    runUntil(c, () => c.t >= 1 - 1e-9, 40);
    expect(before - t.hp).toBeCloseTo(100, 4); // 1% of 10000 per second
  });

  it('Riftbeast (7): members grow +5% AD/AP every 5 seconds', () => {
    const data = dataWith(testUnit('t', { hp: [1e7, 1e7, 1e7], ad: [0, 0, 0] }));
    const ids = ['elderdragon', 'cinderling', 'pebbles', 'gromp', 'murkwolf'];
    const c = new Combat({ data, seed: 1, rules: { moveTime: 99 }, placements: [...ids.map((id, i) => place(id, 'A', i, 7)), place('t', 'B', 6, 0)] });
    expect(level(c, 'riftbeast')).toBe(2); // 5 + 2 (apex) = 7
    const g = unitByDef(c, 'gromp');
    const before = c.stat(g, 'adPct');
    runUntil(c, () => c.t >= 5 - 1e-9, 200);
    expect(c.stat(g, 'adPct') - before).toBe(5);
  });

  it('Flora Fatalis (2): takedown grants 10 mana and heals the lowest ally 7%', () => {
    const data = dataWith(testUnit('ally'), testUnit('t', { hp: [10, 10, 10] }));
    const c = new Combat({ data, seed: 1, placements: [place('fiddlesticks', 'A', 0, 4), place('soraka', 'A', 1, 4), place('ally', 'A', 2, 4), place('t', 'B', 3, 2)] });
    const fid = unitByDef(c, 'fiddlesticks');
    const ally = unitByDef(c, 'ally');
    fid.mana = 0;
    ally.hp = 100;
    c.dealDamage(fid, unitByDef(c, 't'), 1000, 'true');
    expect(fid.mana).toBe(10);
    expect(ally.hp).toBeCloseTo(100 + 70, 6);
  });

  it('Old Growth: Maokai gains 30 max HP when an enemy dies within 3 hexes', () => {
    const data = dataWith(testUnit('t', { hp: [10, 10, 10] }));
    const c = new Combat({ data, seed: 1, placements: [place('maokai', 'A', 3, 4), place('t', 'B', 3, 3)] });
    const m = unitByDef(c, 'maokai');
    const before = m.maxHp;
    c.dealDamage(m, unitByDef(c, 't'), 100, 'true');
    expect(m.maxHp - before).toBe(30);
  });

  it('Monolith: +10 armor per enemy targeting Malphite', () => {
    const data = dataWith(testUnit('e1'), testUnit('e2'));
    const c = new Combat({ data, seed: 1, placements: [place('malphite', 'A', 3, 4), place('e1', 'B', 3, 3), place('e2', 'B', 4, 3)] });
    const m = unitByDef(c, 'malphite');
    expect(c.armor(m)).toBe(70);
    c.units[1].target = m;
    c.units[2].target = m;
    expect(c.armor(m)).toBe(90);
  });

  it('Eclipse executes the lowest-HP enemy after the start delay', () => {
    const data = dataWith(testUnit('t1', { hp: [1e6, 1e6, 1e6], ad: [0, 0, 0] }), testUnit('t2', { hp: [5e5, 5e5, 5e5], ad: [0, 0, 0] }));
    const team = ['leona', 'sejuani', 'kayle', 'diana', 'aphelios', 'alune'].map((id, i) => place(id, 'A', i, 7));
    const c = new Combat({ data, seed: 1, rules: { moveTime: 99 }, placements: [...team, place('t1', 'B', 0, 0), place('t2', 'B', 6, 0)] });
    runUntil(c, () => c.t >= 8.05, 400);
    expect(unitByDef(c, 't2').alive).toBe(false);
    expect(unitByDef(c, 't1').alive).toBe(true);
  });

  it('Spellweaver (2): team +10 AP; members +1 AP per cast', () => {
    const data = dataWith(testUnit('ally'), testUnit('t', { hp: [1e6, 1e6, 1e6] }));
    const c = new Combat({ data, seed: 1, placements: [place('karma', 'A', 0, 4), place('leblanc', 'A', 1, 4), place('ally', 'A', 2, 4), place('t', 'B', 3, 3)] });
    const k = unitByDef(c, 'karma');
    expect(c.ap(unitByDef(c, 'ally'))).toBe(110);
    expect(c.ap(k)).toBe(110);
    c.cast(k);
    expect(c.ap(k)).toBe(111);
  });

  it('Blossom (3): +12% AD/AP and +10% HP for Blossom units', () => {
    const data = dataWith(testUnit('t'));
    const c = new Combat({ data, seed: 1, placements: [place('karma', 'A', 0, 4), place('yorick', 'A', 1, 4), place('yunara', 'A', 2, 4), place('t', 'B', 3, 2)] });
    const y = unitByDef(c, 'yunara');
    expect(c.ad(y)).toBeCloseTo(42 * 1.12, 6);
    expect(y.maxHp).toBeCloseTo(550 * 1.1, 6);
  });

  it('Attuned: Alune alternates Damage Amp and Durability per cast', () => {
    const data = dataWith(testUnit('t', { hp: [1e6, 1e6, 1e6] }));
    const c = new Combat({ data, seed: 1, placements: [place('alune', 'A', 3, 6), place('t', 'B', 3, 2)] });
    const a = unitByDef(c, 'alune');
    expect(c.durability(a)).toBeCloseTo(0.05, 6);
    c.cast(a);
    expect(c.stat(a, 'damageAmp')).toBe(7);
    expect(c.durability(a)).toBe(0);
    c.cast(a);
    expect(c.durability(a)).toBeCloseTo(0.05, 6);
  });

  it('inactive traits (below first breakpoint) do nothing', () => {
    const data = dataWith(testUnit('t'));
    const c = new Combat({ data, seed: 1, placements: [place('kobuko', 'A', 0, 4), place('t', 'B', 3, 2)] });
    expect(level(c, 'brawler')).toBe(-1);
    expect(unitByDef(c, 'kobuko').maxHp).toBe(700);
  });
});

describe('designer edits flow through to the simulation', () => {
  it('changing a trait param value changes unit stats', () => {
    const data = dataWith(testUnit('t'));
    data.traits.brawler.params.find((p) => p.key === 'hpPct')!.values = [50, 60, 70];
    const c = combat(data, [place('kobuko', 'A', 0, 4), place('alistar', 'A', 1, 4), place('t', 'B', 3, 2)]);
    expect(unitByDef(c, 'kobuko').maxHp).toBeCloseTo((700 + 120) * 1.5, 6);
  });

  it('changing a breakpoint changes activation', () => {
    const data = dataWith(testUnit('t'));
    data.traits.brawler.breakpoints = [3, 4, 6];
    const c = combat(data, [place('kobuko', 'A', 0, 4), place('alistar', 'A', 1, 4), place('t', 'B', 3, 2)]);
    expect(level(c, 'brawler')).toBe(-1);
  });

  it('changing a unit base stat changes its combat stat', () => {
    const data = baselineData();
    data.units.sentinel.hp = [1000, 1800, 3240];
    const c = combat(data, [place('sentinel', 'A', 0, 4), place('leona', 'B', 3, 2)]);
    expect(unitByDef(c, 'sentinel').maxHp).toBe(1000);
  });
});
