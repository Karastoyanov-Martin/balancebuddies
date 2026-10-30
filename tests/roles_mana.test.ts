import { Combat } from '../src/sim/engine';
import { countTraits } from '../src/sim/traitCount';
import type { Role } from '../src/sim/types';
import { combat, dataWith, place, runUntil, testUnit } from './helpers';

const unitWithRole = (id: string, role: Role, over = {}) => testUnit(id, { role, manaMax: 1000, manaMode: 'normal', ...over });

describe('Set 18 roles: mana generation', () => {
  const cases: [Role, number][] = [['tank', 5], ['caster', 7], ['carry', 10], ['fighter', 10], ['reaper', 10], ['specialist', 0]];
  for (const [role, mana] of cases) {
    it(`${role} gains ${mana} mana per attack`, () => {
      const data = dataWith(unitWithRole('u', role), testUnit('t', { hp: [1e6, 1e6, 1e6] }));
      const c = combat(data, [place('u', 'A', 3, 4), place('t', 'B', 3, 3)]);
      c.attack(c.units[0], c.units[1]);
      expect(c.units[0].mana).toBe(mana);
    });
  }

  it('casters regenerate 2 mana per second', () => {
    const data = dataWith(unitWithRole('u', 'caster'), testUnit('t', { ad: [0, 0, 0] }));
    const c = combat(data, [place('u', 'A', 0, 7), place('t', 'B', 6, 0)], { critChance: 0, moveTime: 99 });
    runUntil(c, () => c.t >= 1 - 1e-9, 40);
    expect(c.units[0].mana).toBeCloseTo(2, 6);
  });

  it('only tanks gain mana from damage taken (Set 18 rule)', () => {
    const data = dataWith(testUnit('a'), unitWithRole('tank', 'tank'), unitWithRole('carry', 'carry'));
    const c = combat(data, [place('a', 'A', 3, 4), place('tank', 'B', 3, 3), place('carry', 'B', 4, 3)]);
    c.dealDamage(c.units[0], c.units[1], 100, 'true');
    c.dealDamage(c.units[0], c.units[2], 100, 'true');
    expect(c.units[1].mana).toBeCloseTo(4, 6); // 1% pre + 3% post
    expect(c.units[2].mana).toBe(0);
  });

  it('the tank-only rule can be switched off (older TFT behaviour)', () => {
    const data = dataWith(testUnit('a'), unitWithRole('carry', 'carry'));
    const c = combat(data, [place('a', 'A', 3, 4), place('carry', 'B', 3, 3)], { critChance: 0, tankOnlyDamageMana: false });
    c.dealDamage(c.units[0], c.units[1], 100, 'true');
    expect(c.units[1].mana).toBeCloseTo(4, 6);
  });

  it('mana lock: no mana for 1 s after casting', () => {
    const data = dataWith(unitWithRole('u', 'carry', { manaMax: 50 }), testUnit('t', { hp: [1e6, 1e6, 1e6] }));
    const c = combat(data, [place('u', 'A', 3, 4), place('t', 'B', 3, 3)]);
    const u = c.units[0];
    u.mana = 50;
    c.cast(u);
    expect(u.mana).toBe(0);
    c.attack(u, c.units[1]);
    expect(u.mana).toBe(0); // locked
    runUntil(c, () => c.t >= 1.05, 40);
    const before = u.mana;
    c.attack(u, c.units[1]);
    expect(u.mana).toBe(before + 10);
  });

  it('overflow mana carries over into the next cast', () => {
    const data = dataWith(unitWithRole('u', 'carry', { manaMax: 50 }), testUnit('t', { hp: [1e6, 1e6, 1e6] }));
    const c = combat(data, [place('u', 'A', 3, 4), place('t', 'B', 3, 3)]);
    const u = c.units[0];
    u.mana = 45;
    c.attack(u, c.units[1]); // 55/50
    expect(u.mana).toBe(55);
    c.cast(u);
    expect(u.mana).toBe(5);
  });

  it('overflow can be switched off', () => {
    const data = dataWith(unitWithRole('u', 'carry', { manaMax: 50 }), testUnit('t', { hp: [1e6, 1e6, 1e6] }));
    const c = combat(data, [place('u', 'A', 3, 4), place('t', 'B', 3, 3)], { critChance: 0, manaOverflow: false });
    const u = c.units[0];
    u.mana = 45;
    c.attack(u, c.units[1]);
    expect(u.mana).toBe(50);
  });
});

describe('Set 18 roles: combat effects', () => {
  it('fighters get bonus attack speed', () => {
    const data = dataWith(testUnit('f', { role: 'fighter' }), testUnit('t'));
    const c = combat(data, [place('f', 'A', 3, 4), place('t', 'B', 3, 3)], { critChance: 0, fighterAsPct: 15 });
    expect(c.as(c.units[0])).toBeCloseTo(1.15, 6);
  });

  it('reapers take 15% less damage from enemies other than their target', () => {
    const data = dataWith(testUnit('r', { role: 'reaper' }), testUnit('e1'), testUnit('e2'));
    const c = combat(data, [place('r', 'A', 3, 4), place('e1', 'B', 3, 3), place('e2', 'B', 4, 3)]);
    const [r, e1, e2] = c.units;
    r.target = e1;
    expect(c.dealDamage(e1, r, 100, 'true')).toBeCloseTo(100, 6);
    expect(c.dealDamage(e2, r, 100, 'true')).toBeCloseTo(85, 6);
  });

  it('tanks are preferred when two enemies are equally near', () => {
    const data = dataWith(testUnit('a', { range: 10 }), testUnit('squishy', { role: 'carry' }), testUnit('tank', { role: 'tank' }));
    for (let seed = 1; seed <= 20; seed++) {
      const c = new Combat({ data, seed, placements: [place('a', 'A', 3, 5), place('squishy', 'B', 2, 3), place('tank', 'B', 4, 3)] });
      c.step();
      expect(c.units[0].target?.def.id).toBe('tank');
    }
  });
});

describe('designer can switch traits off', () => {
  it('a disabled trait is still counted but grants nothing', () => {
    const data = dataWith(testUnit('t'));
    data.traits.brawler.disabled = true;
    const c = combat(data, [place('kobuko', 'A', 0, 4), place('alistar', 'A', 1, 4), place('t', 'B', 3, 2)]);
    expect(countTraits(data, [place('kobuko', 'A', 0, 4), place('alistar', 'A', 1, 4)], 'A').find((x) => x.traitId === 'brawler')!.level).toBe(0);
    expect(c.traits.find((x) => x.traitId === 'brawler')!.level).toBe(-1);
    expect(c.units[0].maxHp).toBe(700);
  });
});

describe('stat-scaled abilities', () => {
  it('armor-scaled damage (Leona: 150% Armor at 1★)', () => {
    const data = dataWith(testUnit('t', { hp: [1e6, 1e6, 1e6] }));
    const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place('leona', 'A', 3, 4), place('t', 'B', 3, 3)] });
    const leona = c.units[0];
    // armor 40 base + 60 decaying bonus at t=0 → 100 armor → 150 damage (no defender bonus with 1 Defender)
    expect(c.amount(leona, leona.def.ability.effects[0].t === 'dmg' ? leona.def.ability.effects[0].v : undefined)).toBeCloseTo(150, 6);
  });

  it('falloffMin keeps a minimum share for later targets', () => {
    const data = dataWith(testUnit('e', { hp: [1e4, 1e4, 1e4] }), testUnit('c', { manaStart: 100, manaMax: 100, manaMode: 'normal', ability: { name: 'x', text: '', simNote: '', effects: [{ t: 'dmg', dt: 'true', tgt: 'aoe', r: 2, falloff: 0.9, falloffMin: 0.4, v: { flat: [100, 100, 100] } }] } }));
    const c = combat(data, [place('c', 'A', 3, 4), place('e', 'B', 3, 3), place('e', 'B', 4, 3), place('e', 'B', 2, 3)]);
    c.units[0].target = c.units[1];
    c.cast(c.units[0]);
    const lost = c.units.slice(1).map((u) => 1e4 - u.hp).sort((a, b) => b - a);
    expect(lost[0]).toBeCloseTo(100, 6);
    expect(lost[2]).toBeCloseTo(40, 6);
  });

  it('Old Growth scales with Maokai’s star level', () => {
    const data = dataWith(testUnit('t', { hp: [10, 10, 10] }));
    const c = new Combat({ data, seed: 1, placements: [place('maokai', 'A', 3, 4, 2), place('t', 'B', 3, 3)] });
    const m = c.units[0];
    const before = m.maxHp;
    c.dealDamage(m, c.units[1], 100, 'true');
    expect(m.maxHp - before).toBe(100);
  });

  it('Spellweaver: team gets 10 AP, Spellweavers 10/30/55 instead', () => {
    const data = dataWith(testUnit('ally'), testUnit('t'));
    const c = new Combat({ data, seed: 1, placements: [place('karma', 'A', 0, 4), place('leblanc', 'A', 1, 4), place('cassiopeia', 'A', 2, 4), place('ahri', 'A', 3, 4), place('ally', 'A', 4, 4), place('t', 'B', 3, 1)] });
    expect(c.ap(c.units.find((u) => u.def.id === 'ally')!)).toBe(110);
    expect(c.ap(c.units.find((u) => u.def.id === 'karma')!)).toBe(130);
  });
});
