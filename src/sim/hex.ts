import type { Hex } from './types';

/**
 * TFT-style board: 7 columns x 8 rows of pointy-top hexes in "odd-r" offset layout
 * (odd rows are shifted half a hex to the right). Rows 0-3 = team B (top),
 * rows 4-7 = team A (bottom).
 */
export const COLS = 7;
export const ROWS = 8;

export interface Cube {
  x: number;
  y: number;
  z: number;
}

export function toCube(h: Hex): Cube {
  const x = h.col - (h.row - (h.row & 1)) / 2;
  const z = h.row;
  return { x, y: -x - z, z };
}

export function fromCube(c: Cube): Hex {
  const col = c.x + (c.z - (c.z & 1)) / 2;
  return { col, row: c.z };
}

export function distance(a: Hex, b: Hex): number {
  const ca = toCube(a);
  const cb = toCube(b);
  return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y), Math.abs(ca.z - cb.z));
}

const CUBE_DIRS: Cube[] = [
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 },
  { x: -1, y: 0, z: 1 },
  { x: 0, y: -1, z: 1 },
];

export function inBoard(h: Hex): boolean {
  return h.col >= 0 && h.col < COLS && h.row >= 0 && h.row < ROWS;
}

export function neighbors(h: Hex): Hex[] {
  const c = toCube(h);
  const out: Hex[] = [];
  for (const d of CUBE_DIRS) {
    const n = fromCube({ x: c.x + d.x, y: c.y + d.y, z: c.z + d.z });
    if (inBoard(n)) out.push(n);
  }
  return out;
}

export const hexKey = (h: Hex): number => h.row * COLS + h.col;
export const sameHex = (a: Hex, b: Hex): boolean => a.col === b.col && a.row === b.row;

export function allHexes(): Hex[] {
  const out: Hex[] = [];
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) out.push({ col, row });
  return out;
}

/** Rows a team may deploy into. */
export function teamRows(team: 'A' | 'B'): number[] {
  return team === 'A' ? [4, 5, 6, 7] : [0, 1, 2, 3];
}

/**
 * Breadth-first search for the first step towards any hex within `range` of `goal`.
 * Returns null if already in range or no path exists.
 */
export function nextStep(from: Hex, goal: Hex, range: number, blocked: Set<number>): Hex | null {
  if (distance(from, goal) <= range) return null;
  const startKey = hexKey(from);
  const prev = new Map<number, number>();
  const queue: Hex[] = [from];
  prev.set(startKey, -1);
  let found: Hex | null = null;
  while (queue.length) {
    const cur = queue.shift()!;
    if (distance(cur, goal) <= range && hexKey(cur) !== startKey) {
      found = cur;
      break;
    }
    for (const n of neighbors(cur)) {
      const k = hexKey(n);
      if (prev.has(k) || blocked.has(k)) continue;
      prev.set(k, hexKey(cur));
      queue.push(n);
    }
  }
  if (!found) return null;
  // walk back to the first step
  let k = hexKey(found);
  let p = prev.get(k)!;
  while (p !== startKey && p !== -1) {
    k = p;
    p = prev.get(k)!;
  }
  return { col: k % COLS, row: Math.floor(k / COLS) };
}
