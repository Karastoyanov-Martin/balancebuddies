import type { GameData } from '../sim/types';
import { UNIT_MAP } from './units';
import { TRAIT_MAP } from './traits';

export const PATCH = '18.5';

/** Fresh deep copy of the baseline patch-18.5 data (safe to mutate). */
export function baselineData(): GameData {
  return JSON.parse(JSON.stringify({ patch: PATCH, units: UNIT_MAP, traits: TRAIT_MAP })) as GameData;
}

/**
 * Re-shape saved (possibly older) working data to the current baseline structure while
 * keeping every number the designer edited. New fields (e.g. a unit's AP) come from the
 * baseline; removed fields disappear; an effect or trait param whose kind changed is reset.
 */
export function alignToBaseline(working: unknown, base: GameData = baselineData()): GameData {
  return merge(base, working) as GameData;
}

function sameKind(b: Record<string, unknown>, w: Record<string, unknown>): boolean {
  for (const k of ['t', 'key', 'stat', 'id']) if (k in b && b[k] !== w[k]) return false;
  return true;
}

function merge(b: unknown, w: unknown): unknown {
  if (typeof b === 'number') return typeof w === 'number' && Number.isFinite(w) ? w : b;
  if (typeof b === 'boolean') return typeof w === 'boolean' ? w : b;
  if (Array.isArray(b)) {
    if (!Array.isArray(w)) return b;
    // per-star / per-breakpoint arrays keep the user's values only if the length still matches;
    // a list collapsed to one value keeps the first edited value
    if (b.every((x) => typeof x === 'number')) {
      if (w.length === b.length) return b.map((x, i) => merge(x, w[i]));
      if (b.length === 1 && w.length > 1) return [merge(b[0], (w as number[]).find((x) => x !== b[0]) ?? b[0])];
      return b;
    }
    // a list of effects whose length changed was restructured: its old numbers no longer line up
    if (w.length !== b.length && !b.some((x) => x && typeof x === 'object' && 'key' in x)) return b;
    return b.map((x, i) => {
      const wi = w[i];
      if (x && typeof x === 'object' && !Array.isArray(x) && 'key' in x) {
        // trait params: match by key, not position
        const byKey = (w as Record<string, unknown>[]).find((y) => y && y.key === (x as Record<string, unknown>).key);
        return byKey ? merge(x, byKey) : x;
      }
      return merge(x, wi);
    });
  }
  if (b && typeof b === 'object') {
    if (!w || typeof w !== 'object' || Array.isArray(w)) return b;
    const bo = b as Record<string, unknown>;
    const wo = w as Record<string, unknown>;
    if (!sameKind(bo, wo)) return b;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(bo)) out[k] = k in wo ? merge(bo[k], wo[k]) : bo[k];
    // optional switches the designer can add (e.g. a trait turned off)
    if (typeof wo.disabled === 'boolean' && !('disabled' in bo)) out.disabled = wo.disabled;
    return out;
  }
  return b;
}

export const COST_COLORS: Record<number, string> = {
  1: '#8e9aa6',
  2: '#3fa45b',
  3: '#2f7fd1',
  4: '#a346c9',
  5: '#e0a92a',
};
