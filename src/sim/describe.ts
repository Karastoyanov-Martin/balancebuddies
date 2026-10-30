/**
 * Turns ability effects into the numbers a player would see in the in-game tooltip,
 * evaluated with a unit's *current* stats (AD, AP, max HP, Armor, MR).
 * Used by the engine (evalScaling) and by the Unit tab / editor, so the UI shows
 * exactly what the simulation will deal.
 */
import type { Effect, Passive, Scaling, StatKey, TargetRule, AllyRule, DamageType } from './types';

export interface ScaleStats {
  ad: number;
  ap: number;
  maxHp: number;
  armor: number;
  mr: number;
}

/** amount = ad%·AD + ap·AP/100 + hp%·maxHP + arm%·Armor + mr%·MR + flat */
export function evalScaling(v: Scaling | undefined, si: number, s: ScaleStats): number {
  if (!v) return 0;
  return (
    ((v.ad?.[si] ?? 0) / 100) * s.ad +
    (v.ap?.[si] ?? 0) * (s.ap / 100) +
    ((v.hp?.[si] ?? 0) / 100) * s.maxHp +
    ((v.arm?.[si] ?? 0) / 100) * s.armor +
    ((v.mr?.[si] ?? 0) / 100) * s.mr +
    (v.flat?.[si] ?? 0)
  );
}

/** "1.50 (150 AP)": values written at 100 AP are multiplied by AP / 100 */
const apMult = (ap: number) => `${(ap / 100).toFixed(2)} (${fmt(ap)} AP)`;

const fmt = (x: number) => (Math.abs(x) >= 100 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString());

/** "310% AD (124) + 30 AP (45)" — how a value is built from the unit's stats. */
export function formulaText(v: Scaling, si: number, s: ScaleStats): string {
  const parts: string[] = [];
  if (v.ad?.[si]) parts.push(`${fmt(v.ad[si])}% AD (${fmt((v.ad[si] / 100) * s.ad)})`);
  if (v.ap?.[si]) parts.push(`${fmt(v.ap[si])} × ${apMult(s.ap)} (${fmt(v.ap[si] * (s.ap / 100))})`);
  if (v.hp?.[si]) parts.push(`${fmt(v.hp[si])}% max HP (${fmt((v.hp[si] / 100) * s.maxHp)})`);
  if (v.arm?.[si]) parts.push(`${fmt(v.arm[si])}% Armor (${fmt((v.arm[si] / 100) * s.armor)})`);
  if (v.mr?.[si]) parts.push(`${fmt(v.mr[si])}% MR (${fmt((v.mr[si] / 100) * s.mr)})`);
  if (v.flat?.[si]) parts.push(`${fmt(v.flat[si])} flat`);
  return parts.join(' + ');
}

const TGT: Record<TargetRule, string> = {
  target: 'current target', self: 'self', aoe: 'target + nearby', adjacentToTarget: 'enemies next to target', around: 'enemies around caster',
  nearestN: 'nearest enemies', targetPlusNearest: 'target + nearest', lowestHp: 'lowest-HP enemy', farthest: 'farthest enemy',
  densest: 'largest group', line: 'line', allEnemies: 'all enemies',
};
const ALLY: Record<AllyRule, string> = { lowestHpAllies: 'lowest-HP allies', topDamageAlly: 'top-damage ally', allAllies: 'all allies', alliesAround: 'allies around' };
const STAT: Record<StatKey, string> = {
  adPct: '% AD', apFlat: ' AP', asPct: '% Attack Speed', armor: ' Armor', mr: ' Magic Resist', durability: '% Durability', damageAmp: '% Damage Amp',
  omnivamp: '% Omnivamp', critChance: '% crit chance', manaRegen: ' mana/s', hpFlat: ' Health', armorPen: '% Armor pen', range: ' range',
};
const DT: Record<DamageType, string> = { physical: 'physical', magic: 'magic', true: 'true' };

export interface EffectLine {
  /** what happens, e.g. "Magic damage → line" */
  label: string;
  /** the number with the unit's current stats, e.g. "563" (empty when the effect has none) */
  value: string;
  /** how the number is built, e.g. "375 × 150% AP (563)" */
  formula?: string;
  /** true when the value depends on AP */
  usesAp?: boolean;
}

function scaled(label: string, v: Scaling, si: number, s: ScaleStats, suffix = ''): EffectLine {
  return { label, value: fmt(evalScaling(v, si, s)) + suffix, formula: formulaText(v, si, s), usesAp: !!v.ap?.[si] };
}

/** One readable line per effect, evaluated at star index `si` with stats `s`. */
export function describeEffect(e: Effect, si: number, s: ScaleStats): EffectLine {
  const n = 'n' in e && e.n ? ` (${e.n})` : '';
  switch (e.t) {
    case 'dmg': {
      const l = scaled(`${DT[e.dt]} damage → ${TGT[e.tgt]}${n}${e.hits ? ` ×${e.hits}` : ''}${e.split ? ', split' : ''}`, e.v, si, s);
      if (e.isolated) l.value += ` (+${fmt(evalScaling(e.isolated, si, s))} if isolated)`;
      return l;
    }
    case 'dot': return scaled(`${DT[e.dt]} damage over ${e.dur}s → ${TGT[e.tgt]}${n}`, e.v, si, s);
    case 'heal': return scaled(`heal self${e.missingHpPct ? ` (+${e.missingHpPct}% missing HP)` : ''}`, e.v, si, s);
    case 'healAlly': return scaled(`heal ${ALLY[e.who]}${n}`, e.v, si, s);
    case 'shield': return scaled(`shield self for ${e.dur}s`, e.v, si, s);
    case 'shieldAlly': return scaled(`shield ${ALLY[e.who]}${n} for ${e.dur}s`, e.v, si, s);
    case 'maxHp': return scaled('gain max Health', e.v, si, s);
    case 'empower': return scaled(`next ${e.hits} attacks deal bonus ${DT[e.dt]}`, e.v, si, s);
    case 'onHitBuff': return scaled(`attacks deal bonus ${DT[e.dt]} for ${e.dur}s`, e.v, si, s);
    case 'markBonus': return scaled(`bonus ${DT[e.dt]} on marked enemies`, e.v, si, s);
    case 'stun': return { label: `stun → ${TGT[e.tgt]}${n}`, value: `${e.dur[si]}s` };
    case 'buff':
    case 'buffAlly': {
      const v = e.v[si] * (e.scaleAp ? s.ap / 100 : 1);
      const who = e.t === 'buffAlly' ? ` (${ALLY[e.who]})` : '';
      return {
        label: `gain${who}${e.dur ? ` for ${e.dur}s` : ' for the rest of combat'}`,
        value: `+${fmt(v)}${STAT[e.stat]}`,
        formula: e.scaleAp ? `${fmt(e.v[si])} × ${apMult(s.ap)}` : undefined,
        usesAp: !!e.scaleAp,
      };
    }
    case 'buffTeam': return { label: `team gains${e.dur ? ` for ${e.dur}s` : ''}`, value: `+${fmt(e.v[si])}${STAT[e.stat]}` };
    case 'taunt': return { label: `taunt enemies within ${e.r} hexes`, value: '' };
    case 'mana': return { label: 'restore mana', value: fmt(e.v[si]) };
    case 'consumeDots': return { label: 'detonate own bleeds', value: '' };
    case 'extraAttack': return { label: 'extra attacks', value: `${e.count}` };
    case 'invulnerable': return { label: 'invulnerable', value: `${e.dur}s` };
    case 'shred': return { label: `shred → ${TGT[e.tgt]} for ${e.dur}s`, value: `−${e.armor} Armor / −${e.mr} MR` };
  }
}

/** Passive effects that scale with stats. */
export function describePassive(p: Passive | undefined, si: number, s: ScaleStats): EffectLine[] {
  if (!p) return [];
  const out: EffectLine[] = [];
  if (p.onHit) out.push(scaled(`passive: attacks deal bonus ${DT[p.onHit.dt]}`, p.onHit.v, si, s));
  if (p.onHitHeal) out.push(scaled('passive: attacks heal', p.onHitHeal, si, s));
  if (p.onHitDot) out.push(scaled(`passive: attacks apply ${DT[p.onHitDot.dt]} over ${p.onHitDot.dur}s`, p.onHitDot.v, si, s));
  if (p.regen) out.push(scaled('passive: heal per second', p.regen, si, s));
  if (p.pulse) out.push(scaled(`passive: ${DT[p.pulse.dt]} pulse/s within ${p.pulse.r} hexes`, p.pulse.v, si, s));
  return out;
}
