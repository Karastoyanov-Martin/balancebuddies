import { baselineData } from '../src/data';
import { Combat, DEFAULT_RULES, simulate } from '../src/sim/engine';
import { distance } from '../src/sim/hex';
import { caster, combat, dataWith, place, runUntil, testUnit } from './helpers';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('damage pipeline', () => {
  const data = dataWith(testUnit('atk'), testUnit('def', { armor: 100, mr: 50 }));
  const fresh = () => combat(data, [place('atk', 'A', 3, 4), place('def', 'B', 3, 3)]);

  it('physical damage is reduced by armor: 100/(100+armor)', () => {
    const c = fresh();
    const [a, d] = c.units;
    const dealt = c.dealDamage(a, d, 200, 'physical');
    close(dealt, 100);
    close(d.hp, 900);
  });

  it('magic damage is reduced by MR', () => {
    const c = fresh();
    const [a, d] = c.units;
    close(c.dealDamage(a, d, 150, 'magic'), 100);
  });

  it('true damage ignores resistances', () => {
    const c = fresh();
    const [a, d] = c.units;
    close(c.dealDamage(a, d, 150, 'true'), 150);
  });

  it('damage amp multiplies pre-mitigation damage', () => {
    const c = fresh();
    const [a, d] = c.units;
    a.bonus.damageAmp = 20;
    close(c.dealDamage(a, d, 100, 'true'), 120);
  });

  it('durability reduces post-mitigation damage', () => {
    const c = fresh();
    const [a, d] = c.units;
    d.bonus.durability = 25;
    close(c.dealDamage(a, d, 100, 'true'), 75);
  });

  it('durability is capped at 90%', () => {
    const c = fresh();
    const [a, d] = c.units;
    d.bonus.durability = 200;
    close(c.dealDamage(a, d, 100, 'true'), 10);
  });

  it('armor penetration reduces effective armor', () => {
    const c = fresh();
    const [a, d] = c.units;
    a.bonus.armorPen = 50; // armor 100 → 50
    close(c.dealDamage(a, d, 150, 'physical'), 100);
  });

  it('shields absorb damage before health and expire', () => {
    const c = fresh();
    const [a, d] = c.units;
    c.addShield(d, 80, 2, d);
    c.dealDamage(a, d, 100, 'true');
    close(d.hp, 980);
    close(c.shieldTotal(d), 0);
    c.addShield(d, 50, 1, d);
    runUntil(c, () => c.t >= 1.1, 40);
    expect(c.shieldTotal(d)).toBe(0);
  });

  it('killing blow marks the unit dead and credits the kill', () => {
    const c = fresh();
    const [a, d] = c.units;
    c.dealDamage(a, d, 5000, 'true');
    expect(d.alive).toBe(false);
    expect(a.res.kills).toBe(1);
  });

  it('invulnerable units take no damage', () => {
    const c = fresh();
    const [a, d] = c.units;
    d.invulnUntil = 5;
    expect(c.dealDamage(a, d, 500, 'true')).toBe(0);
  });

  it('omnivamp heals the attacker for % of damage dealt', () => {
    const c = fresh();
    const [a, d] = c.units;
    a.hp = 500;
    a.bonus.omnivamp = 50;
    c.dealDamage(a, d, 100, 'true');
    close(a.hp, 550);
  });

  it('wound reduces healing received', () => {
    const c = fresh();
    const [a] = c.units;
    a.hp = 100;
    a.wound = { pct: 50, until: 10 };
    c.heal(a, 100, a);
    close(a.hp, 150);
  });

  it('healing cannot exceed max health', () => {
    const c = fresh();
    const [a] = c.units;
    a.hp = 990;
    c.heal(a, 500, a);
    close(a.hp, 1000);
  });
});

describe('mana', () => {
  it('gains manaPerAttack (10) per basic attack', () => {
    const data = dataWith(testUnit('m', { manaMax: 100, manaMode: 'normal' }), testUnit('t', { hp: [9999, 9999, 9999] }));
    const c = combat(data, [place('m', 'A', 3, 4), place('t', 'B', 3, 3)]);
    c.attack(c.units[0], c.units[1]);
    expect(c.units[0].mana).toBe(10);
  });

  it('gains mana from damage taken: 1% pre + 3% post mitigation, capped', () => {
    const data = dataWith(testUnit('a'), testUnit('t', { manaMax: 1000, manaMode: 'normal', armor: 100, role: 'tank' }));
    const c = combat(data, [place('a', 'A', 3, 4), place('t', 'B', 3, 3)]);
    const [a, t] = c.units;
    c.dealDamage(a, t, 200, 'physical'); // pre 200, post 100 → 2 + 3 = 5
    close(t.mana, 5);
    c.dealDamage(a, t, 100000, 'true'); // capped at 42.5
    expect(t.alive).toBe(false);
  });

  it('casts at full mana and resets to 0', () => {
    const data = dataWith(caster('c', [{ t: 'heal', v: { flat: [1, 1, 1] } }]), testUnit('t', { hp: [9999, 9999, 9999] }));
    const c = combat(data, [place('c', 'A', 3, 4), place('t', 'B', 3, 3)]);
    c.step();
    expect(c.units[0].casts).toBe(1);
    expect(c.units[0].mana).toBeLessThan(100);
  });

  it('attack-counter units (Caitlyn) replace every 3rd attack with the ability', () => {
    const data = dataWith(testUnit('t', { hp: [99999, 99999, 99999] }));
    const c = combat(data, [place('caitlyn', 'A', 3, 6), place('t', 'B', 3, 2)]);
    runUntil(c, () => c.units[0].res.attacks >= 6, 4000);
    expect(c.units[0].res.casts).toBe(2);
  });

  it('units with no mana (Kayle) never cast but deal on-hit magic', () => {
    const data = dataWith(testUnit('t', { hp: [99999, 99999, 99999] }));
    const c = combat(data, [place('kayle', 'A', 3, 6), place('t', 'B', 3, 2)]);
    runUntil(c, () => c.units[0].res.attacks >= 3, 4000);
    expect(c.units[0].res.casts).toBe(0);
    expect(c.units[0].res.magic).toBeGreaterThan(0);
  });

  it('mana regen accumulates per second', () => {
    const data = dataWith(testUnit('m', { manaMax: 100, manaMode: 'normal', range: 1 }), testUnit('t'));
    const c = combat(data, [place('m', 'A', 0, 7), place('t', 'B', 6, 0)], { critChance: 0, moveTime: 99 });
    c.units[0].bonus.manaRegen = 10;
    runUntil(c, () => c.t >= 1 - 1e-9, 100);
    close(c.units[0].mana, 10, 1e-6);
  });
});

describe('crits', () => {
  const data = dataWith(testUnit('a'), testUnit('t', { hp: [9999, 9999, 9999] }));
  it('critChance 1 → attacks deal critDamage (140%)', () => {
    const c = combat(data, [place('a', 'A', 3, 4), place('t', 'B', 3, 3)], { critChance: 1 });
    c.attack(c.units[0], c.units[1]);
    close(c.units[1].hp, 9999 - 50 * DEFAULT_RULES.critDamage);
  });
  it('critChance 0 → no crits', () => {
    const c = combat(data, [place('a', 'A', 3, 4), place('t', 'B', 3, 3)], { critChance: 0 });
    c.attack(c.units[0], c.units[1]);
    close(c.units[1].hp, 9999 - 50);
  });
});

describe('movement and targeting', () => {
  it('melee unit walks towards the nearest enemy one hex per moveTime', () => {
    const data = dataWith(testUnit('a'), testUnit('t', { ad: [0, 0, 0] }));
    const c = combat(data, [place('a', 'A', 3, 7), place('t', 'B', 3, 0)], { critChance: 0, moveTime: 0.5 });
    const d0 = distance(c.units[0].pos, c.units[1].pos);
    runUntil(c, () => c.t >= 0.5, 20);
    const d1 = distance(c.units[0].pos, c.units[1].pos);
    expect(d1).toBeLessThan(d0);
    expect(d0 - d1).toBeLessThanOrEqual(2); // both units may step
  });

  it('targets the nearest enemy', () => {
    const data = dataWith(testUnit('a', { range: 10 }), testUnit('near'), testUnit('far'));
    const c = combat(data, [place('a', 'A', 3, 4), place('far', 'B', 0, 0), place('near', 'B', 3, 3)]);
    c.step();
    expect(c.units[0].target?.def.id).toBe('near');
  });

  it('units never share a hex', () => {
    const data = baselineData();
    const c = new Combat({
      data, seed: 3, rules: { maxTime: 15 },
      placements: [
        place('sett', 'A', 2, 4), place('vi', 'A', 3, 4), place('rammus', 'A', 4, 4), place('ahri', 'A', 3, 6),
        place('krug', 'B', 2, 3), place('hecarim', 'B', 3, 3), place('shen', 'B', 4, 3), place('ashe', 'B', 3, 0),
      ],
    });
    for (let i = 0; i < 300 && !c.winner; i++) {
      c.step();
      const keys = c.units.filter((u) => u.alive).map((u) => `${u.pos.col},${u.pos.row}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('stunned units do not act', () => {
    const data = dataWith(testUnit('a'), testUnit('t', { hp: [9999, 9999, 9999] }));
    const c = combat(data, [place('a', 'A', 3, 4), place('t', 'B', 3, 3)]);
    c.units[0].stunUntil = 2;
    runUntil(c, () => c.t >= 1.5, 40);
    expect(c.units[0].res.attacks).toBe(0);
  });
});

describe('combat outcome', () => {
  it('same seed → identical results (determinism)', () => {
    const data = baselineData();
    const placements = [place('ahri', 'A', 3, 6, 2, 'x1'), place('sett', 'A', 3, 4, 2, 'x2'), place('ashe', 'B', 3, 0, 1, 'y1'), place('vi', 'B', 3, 3, 2, 'y2')];
    const r1 = simulate({ data, placements, seed: 99 });
    const r2 = simulate({ data, placements, seed: 99 });
    expect(r1.winner).toBe(r2.winner);
    expect(r1.duration).toBe(r2.duration);
    expect(r1.units.map((u) => u.damageDealt)).toEqual(r2.units.map((u) => u.damageDealt));
  });

  it('declares the side with survivors the winner', () => {
    const data = dataWith(testUnit('strong', { ad: [500, 500, 500] }), testUnit('weak', { hp: [100, 100, 100], ad: [1, 1, 1] }));
    const r = simulate({ data, placements: [place('strong', 'A', 3, 4), place('weak', 'B', 3, 3)], seed: 1 });
    expect(r.winner).toBe('A');
    expect(r.units.find((u) => u.team === 'B')!.alive).toBe(false);
  });

  it('times out as a draw when nobody can win', () => {
    const data = dataWith(testUnit('p', { ad: [0, 0, 0] }), testUnit('q', { ad: [0, 0, 0] }));
    const r = simulate({ data, placements: [place('p', 'A', 3, 4), place('q', 'B', 3, 3)], seed: 1, rules: { maxTime: 3 } });
    expect(r.winner).toBe('draw');
    expect(r.duration).toBeCloseTo(3, 5);
  });

  it('star level picks the right per-star stats', () => {
    const data = baselineData();
    const c = new Combat({ data, seed: 1, placements: [place('xayah', 'A', 3, 4, 2), place('leona', 'B', 3, 3, 3)] });
    // xayah: elderwood/fae/rapidfire singletons → no active traits; leona: solar/defender singletons
    expect(c.units[0].maxHp).toBe(data.units.xayah.hp[1]);
    expect(c.units[0].baseAd).toBe(data.units.xayah.ad[1]);
    expect(c.units[1].maxHp).toBe(data.units.leona.hp[2]);
  });

  it('records playback frames and events when asked', () => {
    const data = baselineData();
    const r = simulate({ data, placements: [place('ahri', 'A', 3, 6), place('vi', 'B', 3, 1)], seed: 1, record: true });
    expect(r.frames.length).toBeGreaterThan(5);
    expect(r.frames[0].t).toBe(0);
    expect(r.events.some((e) => e.type === 'attack')).toBe(true);
    expect(r.events.some((e) => e.type === 'death')).toBe(true);
    // frames are chronological
    for (let i = 1; i < r.frames.length; i++) expect(r.frames[i].t).toBeGreaterThanOrEqual(r.frames[i - 1].t);
  });

  it('records nothing in batch mode', () => {
    const r = simulate({ data: baselineData(), placements: [place('ahri', 'A', 3, 6), place('vi', 'B', 3, 1)], seed: 1 });
    expect(r.frames).toHaveLength(0);
    expect(r.events).toHaveLength(0);
  });
});
