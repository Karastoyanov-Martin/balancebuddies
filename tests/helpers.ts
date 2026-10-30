import { baselineData } from '../src/data';
import { Combat } from '../src/sim/engine';
import type { Effect, GameData, Hex, Placement, SimRules, Star, Team, UnitDef } from '../src/sim/types';

/** A plain, trait-less test unit. Override any field. */
export function testUnit(id: string, over: Partial<UnitDef> = {}): UnitDef {
  return {
    id, name: id, cost: 1, traits: [], role: 'carry', flavor: 'AD', hp: [1000, 1800, 3240], ad: [50, 75, 112.5], as: 1, armor: 0, mr: 0, range: 1,
    manaStart: 0, manaMax: 0, manaMode: 'none',
    ability: { name: 'Test', text: '', simNote: '', effects: [] },
    ...over,
  };
}

/** Baseline 18.5 data plus custom test units. */
export function dataWith(...units: UnitDef[]): GameData {
  const d = baselineData();
  for (const u of units) d.units[u.id] = u;
  return d;
}

let uidCounter = 0;
export function place(unitId: string, team: Team, col: number, row: number, star: Star = 1, uid?: string): Placement {
  return { uid: uid ?? `${unitId}-${team}-${uidCounter++}`, unitId, team, star, hex: { col, row } as Hex };
}

export const QUIET: Partial<SimRules> = { critChance: 0 };

export function combat(data: GameData, placements: Placement[], rules: Partial<SimRules> = QUIET, seed = 1, record = false): Combat {
  return new Combat({ data, placements, seed, rules, record });
}

export function caster(id: string, effects: Effect[], over: Partial<UnitDef> = {}): UnitDef {
  return testUnit(id, { manaStart: 100, manaMax: 100, manaMode: 'normal', ability: { name: id, text: '', simNote: '', effects }, ...over });
}

/** Run ticks until predicate or limit. */
export function runUntil(c: Combat, pred: () => boolean, maxTicks = 2000): void {
  for (let i = 0; i < maxTicks && !pred() && !c.winner; i++) c.step();
}
