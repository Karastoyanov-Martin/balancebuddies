import { allHexes, distance, hexKey, inBoard, neighbors, nextStep, teamRows } from '../src/sim/hex';
import { makeRng } from '../src/sim/rng';

describe('hex geometry', () => {
  it('board has 56 hexes', () => {
    expect(allHexes()).toHaveLength(56);
  });

  it('distance is 0 to self, symmetric and 1 to every neighbour', () => {
    for (const h of allHexes()) {
      expect(distance(h, h)).toBe(0);
      for (const n of neighbors(h)) {
        expect(distance(h, n)).toBe(1);
        expect(distance(n, h)).toBe(1);
      }
    }
  });

  it('interior hexes have 6 neighbours, corners fewer', () => {
    expect(neighbors({ col: 3, row: 3 })).toHaveLength(6);
    expect(neighbors({ col: 0, row: 0 }).length).toBeLessThan(6);
    expect(neighbors({ col: 6, row: 7 }).length).toBeLessThan(6);
  });

  it('handles odd-row offset correctly', () => {
    // in odd-r layout, (0,1) is adjacent to (0,0) and (1,0); (0,2) is adjacent to (0,1)
    expect(distance({ col: 0, row: 1 }, { col: 1, row: 0 })).toBe(1);
    expect(distance({ col: 0, row: 2 }, { col: 1, row: 1 })).toBe(2);
    expect(distance({ col: 0, row: 2 }, { col: 0, row: 1 })).toBe(1);
  });

  it('straight distance across the board is 7 rows', () => {
    expect(distance({ col: 3, row: 0 }, { col: 3, row: 7 })).toBe(7);
  });

  it('inBoard rejects out-of-range hexes', () => {
    expect(inBoard({ col: -1, row: 0 })).toBe(false);
    expect(inBoard({ col: 7, row: 0 })).toBe(false);
    expect(inBoard({ col: 0, row: 8 })).toBe(false);
    expect(inBoard({ col: 6, row: 7 })).toBe(true);
  });

  it('team rows split the board', () => {
    expect(teamRows('A')).toEqual([4, 5, 6, 7]);
    expect(teamRows('B')).toEqual([0, 1, 2, 3]);
  });
});

describe('pathfinding (nextStep)', () => {
  it('returns null when already in range', () => {
    expect(nextStep({ col: 3, row: 4 }, { col: 3, row: 3 }, 1, new Set())).toBeNull();
  });

  it('steps one hex closer to the goal', () => {
    const from = { col: 3, row: 7 };
    const goal = { col: 3, row: 0 };
    const step = nextStep(from, goal, 1, new Set())!;
    expect(distance(from, step)).toBe(1);
    expect(distance(step, goal)).toBe(distance(from, goal) - 1);
  });

  it('routes around a blocked hex', () => {
    const from = { col: 3, row: 4 };
    const goal = { col: 3, row: 1 };
    const direct = nextStep(from, goal, 1, new Set())!;
    const step = nextStep(from, goal, 1, new Set([hexKey(direct)]))!;
    expect(step).not.toEqual(direct);
    expect(distance(from, step)).toBe(1);
  });

  it('returns null when fully boxed in', () => {
    const from = { col: 3, row: 4 };
    const blocked = new Set(neighbors(from).map(hexKey));
    expect(nextStep(from, { col: 3, row: 0 }, 1, blocked)).toBeNull();
  });

  it('respects range (ranged units stop early)', () => {
    const step = nextStep({ col: 3, row: 7 }, { col: 3, row: 0 }, 4, new Set())!;
    expect(distance(step, { col: 3, row: 0 })).toBeGreaterThanOrEqual(4);
  });
});

describe('rng', () => {
  it('is deterministic per seed and within [0,1)', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('different seeds give different streams', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });
});
