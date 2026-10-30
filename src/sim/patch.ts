import type { GameData } from './types';

/** One numeric difference between the baseline patch and the designer's proposal. */
export interface Change {
  kind: 'unit' | 'trait';
  id: string; // unit or trait id
  name: string;
  path: (string | number)[]; // path inside the unit/trait object
  label: string;
  from: number;
  to: number;
  pct: number | null; // relative change in %, null when from = 0
}

export function getPath(obj: unknown, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

export function setPath(obj: unknown, path: (string | number)[], value: unknown): void {
  let cur = obj as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string | number, unknown>;
  cur[path[path.length - 1]] = value;
}

const STAR = ['1★', '2★', '3★'];

/** Human-readable label for a path, e.g. ["hp",1] → "Health 2★". */
export function labelFor(kind: 'unit' | 'trait', path: (string | number)[], data: GameData, id: string): string {
  if (kind === 'unit') {
    const names: Record<string, string> = {
      hp: 'Health', ad: 'Attack Damage', as: 'Attack Speed', armor: 'Armor', mr: 'Magic Resist', ap: 'Ability Power', range: 'Range',
      manaStart: 'Starting Mana', manaMax: 'Max Mana',
    };
    if (path[0] in names) return names[path[0] as string] + (typeof path[1] === 'number' ? ` ${STAR[path[1]]}` : '');
    if (path[0] === 'ability' && path[1] === 'effects') {
      const eff = data.units[id]?.ability.effects[path[2] as number];
      const scal = path[4] ? ` (${String(path[4]).toUpperCase()})` : '';
      const star = typeof path[path.length - 1] === 'number' && path.length > 4 ? ` ${STAR[path[path.length - 1] as number]}` : '';
      return `Ability ${eff ? eff.t : 'effect'} #${(path[2] as number) + 1}${scal}${star}`;
    }
    return path.join('.');
  }
  const trait = data.traits[id];
  if (path[0] === 'disabled') return 'Trait switched off';
  if (path[0] === 'breakpoints') return `Breakpoint #${(path[1] as number) + 1}`;
  if (path[0] === 'params') {
    const p = trait?.params[path[1] as number];
    if (p?.same) return `${p.label} (all breakpoints)`;
    const bp = trait?.breakpoints[path[3] as number];
    return `${p ? p.label : 'param'} @ ${bp ?? '?'}`;
  }
  return path.join('.');
}

function walk(a: unknown, b: unknown, path: (string | number)[], out: (string | number)[][]): void {
  if (path[path.length - 1] === 'disabled') {
    if (!!a !== !!b) out.push(path);
    return;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > 1e-9) out.push(path);
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const k of keys) {
      const key: string | number = Array.isArray(a) ? Number(k) : k;
      walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], [...path, key], out);
    }
  }
}

/** Every numeric difference between two data sets. */
export function diffData(base: GameData, mod: GameData): Change[] {
  const changes: Change[] = [];
  for (const kind of ['unit', 'trait'] as const) {
    const bag = kind === 'unit' ? 'units' : 'traits';
    for (const id of Object.keys(base[bag])) {
      const paths: (string | number)[][] = [];
      walk(base[bag][id], mod[bag][id], [], paths);
      for (const p of paths) {
        const isToggle = p[p.length - 1] === 'disabled';
        // a switched-off trait is recorded as 1 (on) → 0 (off)
        const from = isToggle ? (getPath(base[bag][id], p) ? 0 : 1) : (getPath(base[bag][id], p) as number);
        const to = isToggle ? (getPath(mod[bag][id], p) ? 0 : 1) : (getPath(mod[bag][id], p) as number);
        changes.push({
          kind, id, name: base[bag][id].name, path: p, label: labelFor(kind, p, base, id), from, to,
          pct: !isToggle && from !== 0 ? ((to - from) / Math.abs(from)) * 100 : null,
        });
      }
    }
  }
  return changes;
}

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** whole-word, case-insensitive match for a unit/trait name (so "Vi" doesn't match "viable") */
const wordRe = (name: string) => new RegExp(`(^|[^a-z'])${esc(name.toLowerCase())}($|[^a-z'])`);

export interface Limits {
  maxPctChange: number | null;
  lockedUnits: string[];
  lockedTraits: string[];
  noNewMechanics?: boolean;
}

export interface Violation {
  change: Change;
  reason: string;
}

/** Check a set of changes against the designer's hard limits from the brief. */
export function checkLimits(changes: Change[], limits: Limits): Violation[] {
  const out: Violation[] = [];
  for (const c of changes) {
    if (c.kind === 'unit' && limits.lockedUnits.includes(c.id)) out.push({ change: c, reason: `${c.name} is locked in the brief` });
    else if (c.kind === 'trait' && limits.lockedTraits.includes(c.id)) out.push({ change: c, reason: `${c.name} is locked in the brief` });
    else if (limits.maxPctChange != null && c.pct != null && Math.abs(c.pct) > limits.maxPctChange + 1e-9)
      out.push({ change: c, reason: `${Math.abs(c.pct).toFixed(1)}% change exceeds the ±${limits.maxPctChange}% limit` });
  }
  return out;
}

/**
 * Parse simple hard limits written in plain English, e.g.
 *  "Keep every change within ±10%", "no more than 15% per stat",
 *  "Do not change Elder Dragon", "Lock Sentinel", "Don't touch the Coven trait".
 */
export function parseLimits(lines: string[], data: GameData): Limits {
  const limits: Limits = { maxPctChange: null, lockedUnits: [], lockedTraits: [], noNewMechanics: false };
  const units = Object.values(data.units);
  const traits = Object.values(data.traits);
  for (const raw of lines) {
    const line = raw.toLowerCase();
    const pct = line.match(/(?:±|\+\/-|within|max(?:imum)?|no more than|at most|up to)\s*(\d+(?:\.\d+)?)\s*%/) ?? line.match(/(\d+(?:\.\d+)?)\s*%\s*(?:max|limit|cap)/);
    if (pct) {
      const v = parseFloat(pct[1]);
      limits.maxPctChange = limits.maxPctChange == null ? v : Math.min(limits.maxPctChange, v);
    }
    if (/new mechanic/.test(line)) limits.noNewMechanics = true;
    const isLock = /(do not|don't|dont|never|no changes? to|lock|keep .* unchanged|leave .* alone|untouched)/.test(line);
    if (isLock) {
      for (const u of units) if (wordRe(u.name).test(line)) limits.lockedUnits.push(u.id);
      for (const t of traits) if (wordRe(t.name).test(line)) limits.lockedTraits.push(t.id);
    }
  }
  limits.lockedUnits = [...new Set(limits.lockedUnits)];
  limits.lockedTraits = [...new Set(limits.lockedTraits)];
  return limits;
}
