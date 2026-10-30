import type { ActiveTrait, GameData, Placement, Team, TraitDef } from './types';

/** Highest breakpoint index reached by `count` (-1 if none). */
export function levelFor(trait: TraitDef, count: number): number {
  let level = -1;
  trait.breakpoints.forEach((bp, i) => {
    if (count >= bp) level = i;
  });
  return level;
}

/** Value of a trait param at a level (0 if missing). */
export function paramAt(trait: TraitDef, key: string, level: number): number {
  const p = trait.params.find((x) => x.key === key);
  if (!p || level < 0) return 0;
  return p.values[Math.min(level, p.values.length - 1)] ?? 0;
}

/**
 * Count traits for one team. Like TFT, duplicate copies of the same champion only
 * count once. Apex Predator adds +2 Riftbeast. Eclipse activates with 3 Solar + 3 Lunar.
 */
export function countTraits(data: GameData, placements: Placement[], team: Team): ActiveTrait[] {
  const unique = new Set(placements.filter((p) => p.team === team).map((p) => p.unitId));
  const counts: Record<string, number> = {};
  for (const id of unique) {
    const u = data.units[id];
    if (!u) continue;
    for (const t of u.traits) counts[t] = (counts[t] ?? 0) + 1;
  }
  if (counts['apex_predator']) {
    const bonus = paramAt(data.traits['apex_predator'], 'riftbeastBonus', 0) || 2;
    counts['riftbeast'] = (counts['riftbeast'] ?? 0) + bonus;
  }
  if ((counts['solar'] ?? 0) >= 3 && (counts['lunar'] ?? 0) >= 3 && data.traits['eclipse']) {
    counts['eclipse'] = 1;
  }
  const out: ActiveTrait[] = [];
  for (const [traitId, count] of Object.entries(counts)) {
    const def = data.traits[traitId];
    if (!def) continue;
    out.push({ traitId, count, level: levelFor(def, count), team });
  }
  // active first (higher level), then by count, then name
  out.sort((a, b) => (b.level >= 0 ? 1 : 0) - (a.level >= 0 ? 1 : 0) || b.count - a.count || a.traitId.localeCompare(b.traitId));
  return out;
}
