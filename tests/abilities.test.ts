import { Combat, simulate } from '../src/sim/engine';
import { distance, neighbors } from '../src/sim/hex';
import type { Effect } from '../src/sim/types';
import { caster, dataWith, place, runUntil, testUnit } from './helpers';

/** Caster at (3,4) team A; enemies placed by caller. Abilities fire via c.cast(). */
function setup(effects: Effect[], enemies: [number, number][], opts: { allies?: [number, number][]; enemyOver?: object } = {}) {
  const data = dataWith(caster('c', effects), testUnit('e', { hp: [1000, 1000, 1000], ...(opts.enemyOver ?? {}) }), testUnit('ally'));
  const placements = [
    place('c', 'A', 3, 4, 1, 'caster'),
    ...enemies.map(([col, row], i) => place('e', 'B', col, row, 1, `e${i}`)),
    ...(opts.allies ?? []).map(([col, row], i) => place('ally', 'A', col, row, 1, `a${i}`)),
  ];
  const c = new Combat({ data, placements, seed: 1, rules: { critChance: 0, moveTime: 99 } });
  const u = c.units[0];
  u.target = c.units[1];
  return { c, u, e: (i: number) => c.units.find((x) => x.uid === `e${i}`)!, a: (i: number) => c.units.find((x) => x.uid === `a${i}`)! };
}
const flat = (n: number) => ({ flat: [n, n, n] as [number, number, number] });

describe('ability effects', () => {
  it('dmg/target hits only the current target', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'target', v: flat(100) }], [[3, 3], [4, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(900);
    expect(e(1).hp).toBe(1000);
  });

  it('dmg/aoe hits the target and enemies within radius of it', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'aoe', r: 1, v: flat(100) }], [[3, 3], [4, 3], [0, 0]]);
    c.cast(u);
    expect(e(0).hp).toBe(900);
    expect(e(1).hp).toBe(900);
    expect(e(2).hp).toBe(1000);
  });

  it('split divides the total between everyone hit', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'aoe', r: 1, split: true, v: flat(100) }], [[3, 3], [4, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(950);
    expect(e(1).hp).toBe(950);
  });

  it('falloff reduces damage for later units hit', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'aoe', r: 1, falloff: 0.4, v: flat(100) }], [[3, 3], [4, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(900);
    expect(e(1).hp).toBe(940);
  });

  it('hits are distributed round-robin', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'around', r: 2, hits: 3, v: flat(100) }], [[3, 3], [4, 3]]);
    c.cast(u);
    expect(e(0).hp + e(1).hp).toBe(2000 - 300);
  });

  it('lowHp bonus multiplies damage below threshold', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'target', v: flat(100), lowHp: { th: 0.5, mult: 2 } }], [[3, 3]]);
    e(0).hp = 400;
    c.cast(u);
    expect(e(0).hp).toBe(200);
  });

  it('isolated bonus applies when the target has no adjacent allies', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'target', v: flat(100), isolated: flat(50) }], [[3, 3], [0, 0]]);
    c.cast(u);
    expect(e(0).hp).toBe(850);
  });

  it('nearestN hits the N nearest enemies', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'nearestN', n: 2, v: flat(100) }], [[3, 3], [4, 3], [0, 0]]);
    c.cast(u);
    expect([e(0).hp, e(1).hp, e(2).hp]).toEqual([900, 900, 1000]);
  });

  it('lowestHp retargets the lowest % HP enemy in range', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'lowestHp', r: 3, v: flat(100) }], [[3, 3], [4, 2]]);
    e(1).hp = 300;
    c.cast(u);
    expect(e(1).hp).toBe(200);
    expect(u.target).toBe(e(1));
  });

  it('delayed damage lands after the delay', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'target', delay: 1, v: flat(100) }], [[3, 0]], { enemyOver: { ad: [0, 0, 0] } });
    c.cast(u);
    expect(e(0).hp).toBe(1000);
    runUntil(c, () => c.t >= 1.01, 40);
    expect(e(0).hp).toBe(900);
  });

  it('dot deals its total over its duration', () => {
    const { c, u, e } = setup([{ t: 'dot', dt: 'true', tgt: 'target', dur: 2, v: flat(200) }], [[3, 0]], { enemyOver: { ad: [0, 0, 0] } });
    u.maxMana = 0;
    c.cast(u);
    runUntil(c, () => c.t >= 3, 100);
    expect(e(0).hp).toBeCloseTo(800, 4);
  });

  it('heal / missingHpPct', () => {
    const { c, u } = setup([{ t: 'heal', v: flat(100), missingHpPct: 10 }], [[3, 3]]);
    u.hp = 500;
    c.cast(u);
    expect(u.hp).toBeCloseTo(500 + 100 + 50, 6);
  });

  it('healAlly heals the lowest-HP ally', () => {
    const { c, u, a } = setup([{ t: 'healAlly', who: 'lowestHpAllies', n: 1, v: flat(100) }], [[3, 3]], { allies: [[0, 7], [1, 7]] });
    a(1).hp = 300;
    c.cast(u);
    expect(a(1).hp).toBe(400);
    expect(a(0).hp).toBe(1000);
  });

  it('shield and shieldAlly', () => {
    const { c, u, a } = setup([{ t: 'shield', v: flat(100), dur: 2 }, { t: 'shieldAlly', who: 'lowestHpAllies', n: 1, v: flat(50), dur: 2 }], [[3, 3]], { allies: [[0, 7]] });
    c.cast(u);
    expect(c.shieldTotal(u)).toBe(100);
    expect(c.shieldTotal(a(0))).toBe(50);
  });

  it('stun sets stun timers on selected enemies', () => {
    const { c, u, e } = setup([{ t: 'stun', tgt: 'around', r: 1, dur: [1.5, 1.5, 1.5] }], [[3, 3], [0, 0]]);
    c.cast(u);
    expect(e(0).stunUntil).toBeCloseTo(1.5, 6);
    expect(e(1).stunUntil).toBe(0);
  });

  it('timed buff expires, permanent buff stays', () => {
    const { c, u } = setup([{ t: 'buff', stat: 'asPct', v: [50, 50, 50], dur: 1 }, { t: 'buff', stat: 'adPct', v: [10, 10, 10] }], [[3, 0]], { enemyOver: { ad: [0, 0, 0] } });
    c.cast(u);
    expect(c.stat(u, 'asPct')).toBe(50);
    runUntil(c, () => c.t >= 1.05, 40);
    expect(c.stat(u, 'asPct')).toBe(0);
    expect(c.stat(u, 'adPct')).toBe(10);
  });

  it('buffAlly targets the top-damage ally', () => {
    const { c, u, a } = setup([{ t: 'buffAlly', who: 'topDamageAlly', stat: 'asPct', v: [40, 40, 40], dur: 3 }], [[3, 3]], { allies: [[0, 7], [1, 7]] });
    a(1).res.damageDealt = 500;
    c.cast(u);
    expect(c.stat(a(1), 'asPct')).toBe(40);
    expect(c.stat(a(0), 'asPct')).toBe(0);
  });

  it('buffTeam buffs every ally including self', () => {
    const { c, u, a } = setup([{ t: 'buffTeam', stat: 'manaRegen', v: [2, 2, 2] }], [[3, 3]], { allies: [[0, 7]] });
    c.cast(u);
    expect(c.stat(u, 'manaRegen')).toBe(2);
    expect(c.stat(a(0), 'manaRegen')).toBe(2);
  });

  it('maxHp raises max and current health', () => {
    const { c, u } = setup([{ t: 'maxHp', v: flat(200) }], [[3, 3]]);
    c.cast(u);
    expect(u.maxHp).toBe(1200);
    expect(u.hp).toBe(1200);
  });

  it('empower adds bonus damage to the next N attacks', () => {
    const { c, u, e } = setup([{ t: 'empower', hits: 2, dt: 'true', v: flat(30) }], [[3, 3]]);
    c.cast(u);
    c.attack(u, e(0));
    c.attack(u, e(0));
    c.attack(u, e(0));
    expect(e(0).hp).toBe(1000 - 3 * 50 - 2 * 30);
  });

  it('empower with replace swaps the basic attack', () => {
    const { c, u, e } = setup([{ t: 'empower', hits: 1, dt: 'true', replace: true, v: flat(30) }], [[3, 3]]);
    c.cast(u);
    c.attack(u, e(0));
    expect(e(0).hp).toBe(970);
  });

  it('once / afterFirst gate effects by cast count', () => {
    const { c, u, e } = setup([
      { t: 'dmg', dt: 'true', tgt: 'target', v: flat(100), once: true },
      { t: 'dmg', dt: 'true', tgt: 'target', v: flat(10), afterFirst: true },
    ], [[3, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(900);
    c.cast(u);
    c.cast(u);
    expect(e(0).hp).toBe(880);
  });

  it('taunt forces nearby enemies to target the caster', () => {
    const { c, u, e } = setup([{ t: 'taunt', r: 2 }], [[3, 3], [0, 0]]);
    c.cast(u);
    expect(e(0).target).toBe(u);
    expect(e(1).target).not.toBe(u);
  });

  it('markBonus only triggers on an already-marked target', () => {
    const { c, u, e } = setup([{ t: 'markBonus', dt: 'true', v: flat(100) }], [[3, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(1000);
    c.cast(u);
    expect(e(0).hp).toBe(900);
  });

  it('consumeDots pops the caster\'s remaining DoT damage', () => {
    const { c, u, e } = setup([{ t: 'dot', dt: 'true', tgt: 'target', dur: 10, v: flat(500) }, { t: 'consumeDots' }], [[3, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(500);
    expect(e(0).dots).toHaveLength(0);
  });

  it('extraAttack performs additional attacks', () => {
    const { c, u, e } = setup([{ t: 'extraAttack', count: 2 }], [[3, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(900);
  });

  it('invulnerable blocks incoming damage for its duration', () => {
    const { c, u, e } = setup([{ t: 'invulnerable', dur: 1 }], [[3, 3]]);
    c.cast(u);
    expect(c.dealDamage(e(0), u, 100, 'true')).toBe(0);
  });

  it('shred lowers enemy MR temporarily', () => {
    const { c, u, e } = setup([{ t: 'shred', armor: 0, mr: 10, dur: 2, tgt: 'target' }], [[3, 3]], { enemyOver: { mr: 30 } });
    c.cast(u);
    expect(c.mr(e(0))).toBe(20);
  });

  it('AP scaling multiplies by AP/100', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'target', v: { ap: [100, 100, 100] } }], [[3, 3]]);
    u.bonus.apFlat = 50;
    c.cast(u);
    expect(e(0).hp).toBe(850);
  });

  it('AD scaling uses % of current AD', () => {
    const { c, u, e } = setup([{ t: 'dmg', dt: 'true', tgt: 'target', v: { ad: [200, 200, 200] } }], [[3, 3]]);
    c.cast(u);
    expect(e(0).hp).toBe(900);
  });
});

describe('unit passives', () => {
  it('cleave hits enemies adjacent to the target (Scuttlecrab)', () => {
    const data = dataWith(testUnit('e', { hp: [5000, 5000, 5000] }));
    const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place('scuttlecrab', 'A', 3, 4), place('e', 'B', 3, 3, 1, 'e0'), place('e', 'B', 4, 3, 1, 'e1')] });
    c.attack(c.units[0], c.units[1]);
    expect(c.units[2].hp).toBeLessThan(5000);
  });

  it('regen heals every tick (Rek\'Sai)', () => {
    const data = dataWith(testUnit('e', { ad: [0, 0, 0] }));
    const c = new Combat({ data, seed: 1, rules: { moveTime: 99 }, placements: [place('reksai', 'A', 0, 7), place('e', 'B', 6, 0)] });
    c.units[0].hp = 100;
    runUntil(c, () => c.t >= 1 - 1e-9, 40);
    expect(c.units[0].hp).toBeCloseTo(117, 4);
  });

  it('lowHpMana triggers once (Sett)', () => {
    const data = dataWith(testUnit('e'));
    const c = new Combat({ data, seed: 1, placements: [place('sett', 'A', 3, 4), place('e', 'B', 3, 3)] });
    const s = c.units[0];
    s.mana = 0;
    c.dealDamage(c.units[1], s, s.maxHp * 0.7, 'true');
    expect(s.mana).toBeGreaterThanOrEqual(100);
  });

  it('execute kills enemies below the threshold (Elder Dragon)', () => {
    const data = dataWith(testUnit('e', { hp: [1000, 1000, 1000] }));
    const c = new Combat({ data, seed: 1, placements: [place('elderdragon', 'A', 3, 4), place('e', 'B', 3, 3)] });
    c.units[1].hp = 150;
    c.dealDamage(c.units[0], c.units[1], 40, 'true');
    expect(c.units[1].alive).toBe(false);
  });

  it('start buffs decay (Leona resists)', () => {
    const data = dataWith(testUnit('e', { ad: [0, 0, 0] }));
    const c = new Combat({ data, seed: 1, rules: { moveTime: 99 }, placements: [place('leona', 'A', 0, 7), place('e', 'B', 6, 0)] });
    expect(c.armor(c.units[0])).toBe(100);
    runUntil(c, () => c.t >= 6.05, 200);
    expect(c.armor(c.units[0])).toBe(40);
  });
});

describe('leaps (Kha\'Zix, Rengar, Murkwolf)', () => {
  // blue melee leaper at (3,4); red: adjacent tank (3,3), a farther unit 3 hexes away (3,1)
  const board = (id: string) => {
    const data = dataWith(testUnit('tank', { hp: [1e5, 1e5, 1e5], ad: [0, 0, 0], role: 'tank' }), testUnit('back', { hp: [1e5, 1e5, 1e5], ad: [0, 0, 0] }));
    const c = new Combat({ data, seed: 1, rules: { critChance: 0 }, placements: [place(id, 'A', 3, 4, 2, 'me'), place('tank', 'B', 3, 3, 1, 'tank'), place('back', 'B', 3, 1, 1, 'back')] });
    const me = c.units[0];
    me.target = c.units[1];
    return { c, me, tank: c.units[1], back: c.units[2] };
  };

  it("Kha'Zix leaps to the farthest enemy within 3 hexes, lands next to it on the far side, and retargets", () => {
    const { c, me, back } = board('khazix');
    expect(distance(me.pos, back.pos)).toBe(3);
    c.cast(me);
    expect(me.target).toBe(back);
    expect(distance(me.pos, back.pos)).toBe(1);
    expect(me.pos.row).toBeLessThan(back.pos.row + 1); // landed behind/beside, not back on its own side
    expect(back.hp).toBeLessThan(1e5);
  });

  it('Rengar jumps to the lowest-%HP enemy within 3 hexes even if it is not his current target', () => {
    const { c, me, tank, back } = board('rengar');
    back.hp = back.maxHp * 0.3;
    c.cast(me);
    expect(me.target).toBe(back);
    expect(distance(me.pos, back.pos)).toBe(1);
    expect(tank.hp).toBe(tank.maxHp);
  });

  it('Rengar stays put when his current (adjacent) target is the lowest-HP enemy', () => {
    const { c, me, tank } = board('rengar');
    tank.hp = tank.maxHp * 0.2;
    const pos = { ...me.pos };
    c.cast(me);
    expect(me.target).toBe(tank);
    expect(me.pos).toEqual(pos);
  });

  it('a leap is logged with start and end hex, and frames record targets', () => {
    const data = dataWith(testUnit('tank', { hp: [1e5, 1e5, 1e5], ad: [0, 0, 0], role: 'tank' }), testUnit('back', { hp: [1e5, 1e5, 1e5], ad: [0, 0, 0] }));
    const r = simulate({ data, seed: 1, record: true, rules: { maxTime: 6, moveTime: 99 } /* nobody walks, so 'back' stays the farthest */, placements: [place('khazix', 'A', 3, 4, 2, 'me'), place('tank', 'B', 3, 3, 1, 'tank'), place('back', 'B', 3, 1, 1, 'back')] });
    const leap = r.events.find((e) => e.type === 'move' && e.note === 'leap');
    expect(leap).toBeDefined();
    expect(leap!.from).toEqual({ col: 3, row: 4 });
    expect(r.frames.some((f) => f.units.find((u) => u.uid === 'me')?.target === 'back')).toBe(true);
  });

  it('when every hex around the target is taken, the leaper lands 2 hexes away instead', () => {
    const data = dataWith(testUnit('w', { hp: [1e5, 1e5, 1e5], ad: [0, 0, 0] }));
    const ring = neighbors({ col: 3, row: 1 }).map((h, i) => place('w', 'B', h.col, h.row, 1, `w${i}`));
    const c = new Combat({ data, seed: 1, placements: [place('khazix', 'A', 3, 4, 2, 'me'), place('w', 'B', 3, 1, 1, 'mid'), ...ring] });
    const me = c.units[0];
    const mid = c.units[1];
    expect(c.leapTo(me, mid)).toBe(true);
    expect(distance(me.pos, mid.pos)).toBe(2);
  });
});
