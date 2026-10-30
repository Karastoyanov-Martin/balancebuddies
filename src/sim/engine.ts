/*
 * BalanceBuddies combat engine — a deterministic, tick-based, *simplified* TFT fight.
 *
 * Scope (prototype rules): no items, no shop, no economy, no augments. Units are placed
 * on a 7x8 hex board, walk to the nearest enemy, auto-attack, gain mana and cast a
 * simplified ability. Trait bonuses are applied at combat start (plus a few dynamic
 * trait effects). Same input + same seed → identical result.
 *
 * Pipeline per tick: global timers → per unit (DoTs, regen, mana, stun/move gates,
 * cast, target, attack or move) → delayed effects → victory check → record frame.
 */
import { distance, hexKey, neighbors, nextStep } from './hex';
import { makeRng } from './rng';
import { countTraits, paramAt } from './traitCount';
import { evalScaling } from './describe';
import type {
  ActiveTrait,
  AllyRule,
  CombatInput,
  CombatResult,
  DamageType,
  Effect,
  Frame,
  GameData,
  Hex,
  LiveStats,
  Placement,
  Scaling,
  SimEvent,
  SimRules,
  Star,
  StatKey,
  Team,
  TargetRule,
  UnitDef,
  UnitResult,
} from './types';

/** Riftbeast (7+) grows every 5 seconds — a fixed part of the trait, not a tunable number. */
export const RIFTBEAST_GROWTH_INTERVAL = 5;

export const DEFAULT_RULES: SimRules = {
  tick: 0.05,
  maxTime: 30,
  moveTime: 0.5,
  critChance: 0.25,
  critDamage: 1.4,
  manaPerAttack: 10,
  manaPreMitPct: 0.01,
  manaPostMitPct: 0.03,
  manaDamageCap: 42.5,
  baseAP: 100,
  maxAS: 5,
  frameEvery: 2,
  manaLockTime: 1,
  manaOverflow: true,
  tankOnlyDamageMana: true,
  tankManaPerAttack: 5,
  casterManaPerAttack: 7,
  casterManaRegen: 2,
  fighterAsPct: 15,
  reaperDamageReduction: 15,
};

type Stats = Record<StatKey, number>;
const zeroStats = (): Stats => ({
  adPct: 0, apFlat: 0, asPct: 0, armor: 0, mr: 0, durability: 0, damageAmp: 0, omnivamp: 0,
  critChance: 0, manaRegen: 0, hpFlat: 0, armorPen: 0, range: 0,
});

interface Timed { stat: StatKey; v: number; until: number }
interface ShieldInst { amt: number; until: number }
interface Dot { src: SUnit; dt: DamageType; perSec: number; until: number }
interface OnHit { dt: DamageType; v: Scaling; until: number }

/** Per-unit trait effects resolved at combat start. */
export interface TraitFx {
  asPerAttack: number;
  maxStacks: number;
  burnPct: number;
  woundPct: number;
  causticPct: number;
  causticDur: number;
  bleedPct: number;
  lowHpAmp: number; // ravager doubling
  lockAmp: number; // hunter
  growthPct: number;
  growthInterval: number;
  monolith: number;
  oldGrowthHp: number;
  oldGrowthRadius: number;
  takedownMana: number;
  apPerCast: number;
  vanguardPct: number;
  vanguardDur: number;
  vanguardDurability: number;
  magicAmp: number; // solar
  faeHealPct: number;
  attunedDur: number;
  attunedAmp: number;
}
const zeroFx = (): TraitFx => ({
  asPerAttack: 0, maxStacks: 0, burnPct: 0, woundPct: 0, causticPct: 0, causticDur: 0, bleedPct: 0,
  lowHpAmp: 0, lockAmp: 0, growthPct: 0, growthInterval: 5, monolith: 0, oldGrowthHp: 0, oldGrowthRadius: 0,
  takedownMana: 0, apPerCast: 0, vanguardPct: 0, vanguardDur: 8, vanguardDurability: 0, magicAmp: 0,
  faeHealPct: 0, attunedDur: 0, attunedAmp: 0,
});

export interface SUnit {
  uid: string;
  def: UnitDef;
  star: Star;
  si: 0 | 1 | 2;
  team: Team;
  order: number;
  pos: Hex;
  startPos: Hex;
  alive: boolean;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  baseAd: number;
  baseAs: number;
  baseArmor: number;
  baseMr: number;
  baseRange: number;
  bonus: Stats;
  hpPct: number; // trait % max HP (applied once at start)
  timed: Timed[];
  shields: ShieldInst[];
  dots: Dot[];
  onHits: OnHit[];
  burn: { src: SUnit; pct: number; until: number } | null;
  wound: { pct: number; until: number } | null;
  caustic: { pct: number; until: number } | null;
  stunUntil: number;
  invulnUntil: number;
  moveUntil: number;
  manaLockUntil: number;
  nextAttackAt: number;
  target: SUnit | null;
  targetSince: number;
  tauntBy: SUnit | null;
  tauntUntil: number;
  empower: { hits: number; dt: DamageType; v: Scaling; replace: boolean } | null;
  casts: number;
  rapidStacks: number;
  lowHpManaUsed: boolean;
  vanguardSecondUsed: boolean;
  faeHealUsed: boolean;
  attuneWaxing: boolean;
  marks: Set<string>;
  pulseAcc: number;
  fx: TraitFx;
  res: UnitResult;
}

interface Delayed { at: number; run: () => void }

export class Combat {
  readonly rules: SimRules;
  readonly data: GameData;
  readonly units: SUnit[] = [];
  readonly events: SimEvent[] = [];
  readonly frames: Frame[] = [];
  readonly traits: ActiveTrait[] = [];
  t = 0;
  private tickNo = 0;
  private rng: () => number;
  private delayed: Delayed[] = [];
  private record: boolean;
  private eclipse: Record<Team, { active: boolean; next: number; interval: number }> = {
    A: { active: false, next: 0, interval: 0 },
    B: { active: false, next: 0, interval: 0 },
  };
  winner: Team | 'draw' | null = null;

  constructor(input: CombatInput) {
    this.rules = { ...DEFAULT_RULES, ...(input.rules ?? {}) };
    this.data = input.data;
    this.rng = makeRng(input.seed);
    this.record = input.record ?? false;
    input.placements.forEach((p, i) => {
      const def = this.data.units[p.unitId];
      if (!def) throw new Error(`Unknown unit ${p.unitId}`);
      this.units.push(this.createUnit(p, def, i));
    });
    this.applyTraits();
    this.applyStartEffects();
    this.recordFrame();
  }

  // ───────────────────────── setup ─────────────────────────
  private createUnit(p: Placement, def: UnitDef, order: number): SUnit {
    const si = (p.star - 1) as 0 | 1 | 2;
    const res: UnitResult = {
      uid: p.uid, unitId: p.unitId, team: p.team, star: p.star, damageDealt: 0, physical: 0, magic: 0, trueDmg: 0,
      damageTaken: 0, healing: 0, shielding: 0, casts: 0, attacks: 0, kills: 0, alive: true, hpLeft: 0,
      maxHp: 0, deathTime: null,
    };
    return {
      uid: p.uid, def, star: p.star, si, team: p.team, order, pos: { ...p.hex }, startPos: { ...p.hex },
      alive: true, hp: def.hp[si], maxHp: def.hp[si], mana: def.manaStart, maxMana: def.manaMax,
      baseAd: def.ad[si], baseAs: def.as, baseArmor: def.armor, baseMr: def.mr, baseRange: def.range,
      bonus: zeroStats(), hpPct: 0, timed: [], shields: [], dots: [], onHits: [], burn: null, wound: null,
      caustic: null, stunUntil: 0, invulnUntil: 0, moveUntil: 0, manaLockUntil: 0, nextAttackAt: 0, target: null, targetSince: 0,
      tauntBy: null, tauntUntil: 0, empower: null, casts: 0, rapidStacks: 0, lowHpManaUsed: false,
      vanguardSecondUsed: false, faeHealUsed: false, attuneWaxing: false, marks: new Set(), pulseAcc: 0,
      fx: zeroFx(), res,
    };
  }

  private applyTraits(): void {
    const GENERIC: StatKey[] = ['adPct', 'apFlat', 'asPct', 'armor', 'mr', 'hpFlat', 'critChance', 'omnivamp', 'damageAmp', 'durability'];
    for (const team of ['A', 'B'] as Team[]) {
      const placements: Placement[] = this.units.map((u) => ({ uid: u.uid, unitId: u.def.id, star: u.star, team: u.team, hex: u.pos }));
      // a trait the designer switched off is still counted (shown) but grants nothing
      const active = countTraits(this.data, placements, team).map((t) => (this.data.traits[t.traitId]?.disabled ? { ...t, level: -1 } : t));
      this.traits.push(...active);
      const teamUnits = this.units.filter((u) => u.team === team);
      for (const at of active) {
        if (at.level < 0) continue;
        const def = this.data.traits[at.traitId];
        const L = at.level;
        const members = teamUnits.filter((u) => u.def.traits.includes(at.traitId));
        // generic stat params
        for (const p of def.params) {
          if (p.scope === 'special') continue;
          const v = p.values[Math.min(L, p.values.length - 1)] ?? 0;
          const targets = p.scope === 'team' ? teamUnits : members;
          if (GENERIC.includes(p.key as StatKey)) for (const u of targets) u.bonus[p.key as StatKey] += v;
          if (p.key === 'hpPct') for (const u of targets) u.hpPct += v;
        }
        const P = (k: string) => paramAt(def, k, L);
        switch (at.traitId) {
          case 'invoker':
            for (const u of teamUnits) u.bonus.manaRegen += members.includes(u) ? P('memberRegen') : P('teamRegen');
            break;
          case 'juggernaut':
            for (const u of teamUnits) u.bonus.durability += members.includes(u) ? P('memberDurability') : P('teamDurability');
            break;
          case 'rapidfire':
            for (const u of teamUnits) u.bonus.asPct += P('teamAs');
            for (const u of members) { u.fx.asPerAttack = P('asPerAttack'); u.fx.maxStacks = P('maxStacks'); }
            break;
          case 'ravager':
            for (const u of members) u.fx.lowHpAmp = P('damageAmp');
            break;
          case 'hunter':
            for (const u of members) u.fx.lockAmp = P('lockAmp');
            break;
          case 'inferno':
            for (const u of members) { u.fx.burnPct = P('burnPct'); u.fx.woundPct = P('woundPct'); }
            break;
          case 'caustic':
            for (const u of members) { u.fx.causticPct = P('shredPct'); u.fx.causticDur = P('duration'); }
            break;
          case 'executioner':
            for (const u of members) u.fx.bleedPct = P('bleedPct');
            break;
          case 'riftbeast':
            for (const u of members) { u.fx.growthPct = P('growthPct'); u.fx.growthInterval = RIFTBEAST_GROWTH_INTERVAL; }
            break;
          case 'monolith':
            for (const u of members) u.fx.monolith = P('perTargeter');
            break;
          case 'old_growth':
            for (const u of members) { u.fx.oldGrowthHp = P(`hp${u.star}`); u.fx.oldGrowthRadius = P(`r${u.star}`); }
            break;
          case 'defender':
            for (const u of teamUnits) {
              const v = members.includes(u) ? P('memberResist') : P('teamResist');
              u.bonus.armor += v;
              u.bonus.mr += v;
            }
            break;
          case 'flora_fatalis':
            for (const u of members) u.fx.takedownMana = P('takedownMana');
            break;
          case 'spellweaver':
            for (const u of teamUnits) u.bonus.apFlat += members.includes(u) ? P('memberAp') : P('teamAp');
            for (const u of members) u.fx.apPerCast = P('apPerCast');
            break;
          case 'vanguard':
            for (const u of members) {
              u.fx.vanguardPct = P('shieldPct');
              u.fx.vanguardDur = P('shieldDuration') || 8;
              u.fx.vanguardDurability = P('shieldedDurability');
            }
            break;
          case 'solar': {
            const threeStars = new Set(teamUnits.filter((u) => u.star === 3 && u.def.traits.includes('solar')).map((u) => u.def.id)).size;
            const extra = threeStars * P('perThreeStar');
            for (const u of teamUnits) u.fx.magicAmp = P('magicAmp') + extra; // shield applied in applyStartEffects
            break;
          }
          case 'fae':
            for (const u of teamUnits) u.fx.faeHealPct = P('lowHpHealPct');
            break;
          case 'attuned':
            for (const u of members) { u.fx.attunedDur = P('durability'); u.fx.attunedAmp = P('damageAmp'); }
            break;
          case 'lunar': {
            const as = P('asPct');
            const ap = P('apFlat');
            for (const u of teamUnits) {
              if (u.def.traits.includes('lunar')) {
                u.bonus.asPct += as * 2;
                u.bonus.apFlat += ap * 2;
              } else if (members.some((m) => distance(m.pos, u.pos) === 1)) {
                u.bonus.asPct += as;
                u.bonus.apFlat += ap;
              }
            }
            break;
          }
          case 'eclipse':
            this.eclipse[team] = { active: true, next: paramAt(def, 'startDelay', 0), interval: paramAt(def, 'interval', 0) || 3.5 };
            break;
          default:
            break;
        }
      }
    }
    // finalise health
    for (const u of this.units) {
      u.maxHp = (u.def.hp[u.si] + u.bonus.hpFlat) * (1 + u.hpPct / 100);
      u.hp = u.maxHp;
      u.res.maxHp = u.maxHp;
    }
  }

  private applyStartEffects(): void {
    for (const u of this.units) {
      // Solar shield
      const solar = this.traits.find((t) => t.team === u.team && t.traitId === 'solar' && t.level >= 0);
      if (solar) {
        const def = this.data.traits['solar'];
        const threeStars = new Set(this.units.filter((x) => x.team === u.team && x.star === 3 && x.def.traits.includes('solar')).map((x) => x.def.id)).size;
        const pct = paramAt(def, 'shieldPct', solar.level) + threeStars * paramAt(def, 'perThreeStar', solar.level);
        if (pct > 0) this.addShield(u, (u.maxHp * pct) / 100, 15, u);
      }
      if (u.fx.vanguardPct > 0) this.addShield(u, (u.maxHp * u.fx.vanguardPct) / 100, u.fx.vanguardDur, u);
      for (const b of u.def.passive?.startBuffs ?? []) u.timed.push({ stat: b.stat, v: b.v[u.si], until: b.dur });
      if (u.def.passive?.omnivamp) u.bonus.omnivamp += u.def.passive.omnivamp;
      if (u.def.role === 'fighter') u.bonus.asPct += this.rules.fighterAsPct;
      if (u.fx.attunedDur) u.timed.push({ stat: 'durability', v: u.fx.attunedDur, until: 9999 });
    }
  }

  // ───────────────────────── stat getters ─────────────────────────
  stat(u: SUnit, k: StatKey): number {
    let v = u.bonus[k];
    for (const b of u.timed) if (b.stat === k && b.until > this.t) v += b.v;
    return v;
  }
  ad(u: SUnit): number { return u.baseAd * (1 + this.stat(u, 'adPct') / 100); }
  ap(u: SUnit): number { return (u.def.ap ?? this.rules.baseAP) + this.stat(u, 'apFlat'); }
  as(u: SUnit): number {
    const pct = this.stat(u, 'asPct') + u.rapidStacks * u.fx.asPerAttack;
    return Math.min(this.rules.maxAS, Math.max(0.1, u.baseAs * (1 + pct / 100)));
  }
  armor(u: SUnit): number {
    let a = u.baseArmor + this.stat(u, 'armor') + (u.fx.monolith ? u.fx.monolith * this.targetersOf(u) : 0);
    if (u.caustic && u.caustic.until > this.t) a *= 1 - u.caustic.pct / 100;
    return a;
  }
  mr(u: SUnit): number {
    let m = u.baseMr + this.stat(u, 'mr') + (u.fx.monolith ? u.fx.monolith * this.targetersOf(u) : 0);
    if (u.caustic && u.caustic.until > this.t) m *= 1 - u.caustic.pct / 100;
    return m;
  }
  range(u: SUnit): number { return u.baseRange + this.stat(u, 'range'); }
  durability(u: SUnit): number {
    let d = this.stat(u, 'durability');
    if (u.fx.vanguardDurability && this.shieldTotal(u) > 0) d += u.fx.vanguardDurability;
    return Math.min(0.9, Math.max(0, d / 100));
  }
  critChance(u: SUnit): number { return Math.min(1, this.rules.critChance + this.stat(u, 'critChance') / 100); }
  shieldTotal(u: SUnit): number {
    let s = 0;
    for (const sh of u.shields) if (sh.until > this.t) s += sh.amt;
    return s;
  }
  private targetersOf(u: SUnit): number {
    let n = 0;
    for (const e of this.units) if (e.alive && e.team !== u.team && e.target === u) n++;
    return n;
  }

  /** Evaluate a scaling formula for a caster, using its stats at this exact moment. */
  amount(u: SUnit, v: Scaling | undefined): number {
    return evalScaling(v, u.si, { ad: this.ad(u), ap: this.ap(u), maxHp: u.maxHp, armor: this.armor(u), mr: this.mr(u) });
  }

  /** All combat stats of a unit right now. */
  liveStats(u: SUnit): LiveStats {
    const r2 = (x: number) => Math.round(x * 100) / 100;
    return {
      ad: r2(this.ad(u)), ap: r2(this.ap(u)), as: r2(this.as(u)), armor: r2(this.armor(u)), mr: r2(this.mr(u)), range: this.range(u),
      crit: r2(this.critChance(u)), durability: r2(this.durability(u)), damageAmp: r2(this.stat(u, 'damageAmp')),
      omnivamp: r2(this.stat(u, 'omnivamp')), manaRegen: r2(this.stat(u, 'manaRegen')),
    };
  }

  // ───────────────────────── helpers ─────────────────────────
  private log(e: Omit<SimEvent, 't'>): void {
    if (this.record) this.events.push({ t: Math.round(this.t * 100) / 100, ...e });
  }
  enemiesOf(u: SUnit): SUnit[] { return this.units.filter((e) => e.alive && e.team !== u.team); }
  alliesOf(u: SUnit, includeSelf = false): SUnit[] { return this.units.filter((a) => a.alive && a.team === u.team && (includeSelf || a !== u)); }

  private byDistanceFrom(list: SUnit[], from: Hex): SUnit[] {
    // random tie-break, deterministic per seed
    return list.map((x) => ({ x, d: distance(x.pos, from), r: this.rng() })).sort((a, b) => a.d - b.d || a.r - b.r).map((o) => o.x);
  }

  /** Nearest enemy; among equally near enemies Tanks are preferred ("more likely to be targeted"). */
  private nearestEnemy(u: SUnit): SUnit | null {
    const e = this.enemiesOf(u);
    if (!e.length) return null;
    return e
      .map((x) => ({ x, d: distance(x.pos, u.pos), tank: x.def.role === 'tank' ? 0 : 1, r: this.rng() }))
      .sort((a, b) => a.d - b.d || a.tank - b.tank || a.r - b.r)[0].x;
  }

  /** Mana gain respecting mana lock (after casting) and overflow (carry up to one extra cast). */
  gainMana(u: SUnit, amt: number): void {
    if (amt <= 0 || u.maxMana <= 0 || u.def.manaMode === 'none') return;
    if (u.manaLockUntil > this.t) return;
    const cap = this.rules.manaOverflow ? u.maxMana * 2 : u.maxMana;
    u.mana = Math.min(cap, u.mana + amt);
  }

  /** Mana per basic attack by Set 18 role. */
  manaPerAttack(u: SUnit): number {
    const r = u.def.role;
    const base = r === 'tank' ? this.rules.tankManaPerAttack : r === 'caster' ? this.rules.casterManaPerAttack : r === 'specialist' ? 0 : this.rules.manaPerAttack;
    return base + (u.def.manaPerAttack ?? 0);
  }

  private occupied(except?: SUnit): Set<number> {
    const s = new Set<number>();
    for (const x of this.units) if (x.alive && x !== except) s.add(hexKey(x.pos));
    return s;
  }

  /** Teleport next to a unit (leaps). Stays put if no free hex. */
  /**
   * Leap (assassin dash) onto a target: land on a free hex next to it, preferring the far side
   * (away from where the leaper started), like TFT assassins that end up behind their target.
   * If every adjacent hex is taken, land on the nearest free hex within 2 of the target.
   */
  leapTo(u: SUnit, dest: SUnit): boolean {
    const occ = this.occupied(u);
    const from = { ...u.pos };
    let free = neighbors(dest.pos).filter((h) => !occ.has(hexKey(h)));
    if (!free.length) free = neighbors(dest.pos).flatMap((n) => neighbors(n)).filter((h) => !occ.has(hexKey(h)) && distance(h, dest.pos) === 2);
    if (!free.length) return false;
    free.sort((a, b) => distance(b, from) - distance(a, from) || a.row - b.row || a.col - b.col);
    u.pos = free[0];
    u.moveUntil = this.t; // a leap is instant; the unit can act again next tick
    this.log({ type: 'move', src: u.uid, tgt: dest.uid, note: 'leap', from, to: { ...u.pos } });
    return true;
  }

  addShield(u: SUnit, amt: number, dur: number, src: SUnit): void {
    if (amt <= 0) return;
    u.shields.push({ amt, until: this.t + dur });
    src.res.shielding += amt;
    this.log({ type: 'shield', src: src.uid, tgt: u.uid, amount: Math.round(amt) });
  }

  heal(u: SUnit, amt: number, src: SUnit): number {
    if (!u.alive || amt <= 0) return 0;
    if (u.wound && u.wound.until > this.t) amt *= 1 - u.wound.pct / 100;
    const real = Math.min(amt, u.maxHp - u.hp);
    u.hp += real;
    src.res.healing += real;
    if (real > 0.5) this.log({ type: 'heal', src: src.uid, tgt: u.uid, amount: Math.round(real) });
    return real;
  }

  // ───────────────────────── damage ─────────────────────────
  /**
   * Central damage pipeline: amp → mitigation → durability → shields → health.
   * Returns post-mitigation damage dealt (incl. shield absorption).
   */
  dealDamage(src: SUnit, tgt: SUnit, raw: number, dt: DamageType, opts: { crit?: boolean; noHooks?: boolean; isAttack?: boolean; quiet?: boolean } = {}): number {
    if (!tgt.alive || raw <= 0) return 0;
    if (tgt.invulnUntil > this.t) return 0;
    let amp = this.stat(src, 'damageAmp');
    if (src.fx.lowHpAmp && tgt.hp / tgt.maxHp < 0.5) amp += src.fx.lowHpAmp;
    if (src.fx.lockAmp && src.target === tgt && this.t - src.targetSince >= 3) amp += src.fx.lockAmp;
    if (dt === 'magic' && src.fx.magicAmp) amp += src.fx.magicAmp;
    const pre = raw * (1 + amp / 100);
    let mult = 1;
    if (dt === 'physical') {
      const arm = this.armor(tgt) * (1 - this.stat(src, 'armorPen') / 100);
      mult = 100 / (100 + Math.max(0, arm));
    } else if (dt === 'magic') {
      mult = 100 / (100 + Math.max(0, this.mr(tgt)));
    }
    let post = pre * mult * (1 - this.durability(tgt));
    // Reaper role: less damage from everyone except its current target
    if (tgt.def.role === 'reaper' && tgt.target !== src) post *= 1 - this.rules.reaperDamageReduction / 100;
    const dealt = post;
    // shields
    for (const sh of tgt.shields) {
      if (post <= 0) break;
      if (sh.until <= this.t || sh.amt <= 0) continue;
      const a = Math.min(sh.amt, post);
      sh.amt -= a;
      post -= a;
    }
    tgt.shields = tgt.shields.filter((s) => s.amt > 0.01 && s.until > this.t);
    tgt.hp -= post;
    // bookkeeping
    src.res.damageDealt += dealt;
    if (dt === 'physical') src.res.physical += dealt;
    else if (dt === 'magic') src.res.magic += dealt;
    else src.res.trueDmg += dealt;
    tgt.res.damageTaken += dealt;
    if (!opts.quiet) this.log({ type: 'damage', src: src.uid, tgt: tgt.uid, amount: Math.round(dealt), dt, crit: opts.crit });
    // mana from damage taken
    if (tgt.def.manaMode !== 'attacks' && tgt.def.manaMode !== 'none' && (!this.rules.tankOnlyDamageMana || tgt.def.role === 'tank')) {
      this.gainMana(tgt, Math.min(this.rules.manaDamageCap, pre * this.rules.manaPreMitPct + dealt * this.rules.manaPostMitPct));
    }
    // omnivamp
    const ov = this.stat(src, 'omnivamp');
    if (ov > 0 && src.alive) this.heal(src, (dealt * ov) / 100, src);
    if (!opts.noHooks) {
      if (src.fx.causticPct) tgt.caustic = { pct: src.fx.causticPct, until: this.t + src.fx.causticDur };
      if (src.fx.burnPct) {
        tgt.burn = { src, pct: src.fx.burnPct, until: this.t + 3 };
        tgt.wound = { pct: src.fx.woundPct, until: this.t + 3 };
      }
      if (src.fx.bleedPct && dt !== 'true') this.dealDamage(src, tgt, (dealt * src.fx.bleedPct) / 100, 'true', { noHooks: true });
    }
    if (tgt.hp <= 0) {
      this.kill(tgt, src);
    } else {
      const ex = src.def.passive?.executeBelow;
      if (ex && tgt.hp / tgt.maxHp < ex) {
        this.log({ type: 'trait', src: src.uid, tgt: tgt.uid, note: 'execute' });
        this.kill(tgt, src);
      } else this.afterDamaged(tgt);
    }
    return dealt;
  }

  private afterDamaged(u: SUnit): void {
    const frac = u.hp / u.maxHp;
    if (frac < 0.5) {
      if (u.fx.vanguardPct && !u.vanguardSecondUsed) {
        u.vanguardSecondUsed = true;
        this.addShield(u, (u.maxHp * u.fx.vanguardPct) / 100, u.fx.vanguardDur, u);
      }
      if (u.fx.faeHealPct && !u.faeHealUsed) {
        u.faeHealUsed = true;
        this.heal(u, (u.maxHp * u.fx.faeHealPct) / 100, u);
      }
    }
    const lm = u.def.passive?.lowHpMana;
    if (lm && !u.lowHpManaUsed && frac < lm.th) {
      u.lowHpManaUsed = true;
      this.gainMana(u, lm.mana);
    }
  }

  private kill(u: SUnit, by: SUnit): void {
    if (!u.alive) return;
    u.alive = false;
    u.hp = 0;
    u.res.alive = false;
    u.res.deathTime = Math.round(this.t * 100) / 100;
    by.res.kills++;
    this.log({ type: 'death', src: by.uid, tgt: u.uid });
    // Flora Fatalis
    if (by.fx.takedownMana && by.alive) this.gainMana(by, by.fx.takedownMana);
    const flora = this.traits.find((t) => t.team === by.team && t.traitId === 'flora_fatalis' && t.level >= 0);
    if (flora) {
      const pct = paramAt(this.data.traits['flora_fatalis'], 'healPct', flora.level);
      if (pct > 0) {
        const allies = this.alliesOf(by, true).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        if (allies[0]) this.heal(allies[0], (allies[0].maxHp * pct) / 100, by);
      }
    }
    // Old Growth
    for (const og of this.units) {
      if (og.alive && og.team !== u.team && og.fx.oldGrowthHp && distance(og.pos, u.pos) <= og.fx.oldGrowthRadius) {
        og.maxHp += og.fx.oldGrowthHp;
        og.hp += og.fx.oldGrowthHp;
      }
    }
    for (const x of this.units) {
      if (x.target === u) x.target = null;
      if (x.tauntBy === u) x.tauntBy = null;
    }
  }

  // ───────────────────────── targeting for abilities ─────────────────────────
  selectEnemies(u: SUnit, rule: TargetRule, r = 1, nOpt?: number): SUnit[] {
    const n = nOpt ?? 1;
    const enemies = this.enemiesOf(u);
    if (!enemies.length) return [];
    const tgt = u.target && u.target.alive ? u.target : this.nearestEnemy(u)!;
    switch (rule) {
      case 'self':
        return [];
      case 'target':
        return [tgt];
      case 'aoe':
        return [tgt, ...this.byDistanceFrom(enemies.filter((e) => e !== tgt && distance(e.pos, tgt.pos) <= r), tgt.pos)];
      case 'adjacentToTarget': {
        const list = this.byDistanceFrom(enemies.filter((e) => e !== tgt && distance(e.pos, tgt.pos) <= r), tgt.pos);
        return nOpt === undefined ? list : list.slice(0, nOpt);
      }
      case 'around':
        return this.byDistanceFrom(enemies.filter((e) => distance(e.pos, u.pos) <= r), u.pos);
      case 'nearestN':
        return this.byDistanceFrom(enemies, u.pos).slice(0, n);
      case 'targetPlusNearest':
        return [tgt, ...this.byDistanceFrom(enemies.filter((e) => e !== tgt), tgt.pos).slice(0, Math.max(0, n - 1))];
      case 'lowestHp': {
        const inR = enemies.filter((e) => distance(e.pos, u.pos) <= r);
        const pool = inR.length ? inR : enemies;
        const pick = pool.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.order - b.order)[0];
        this.retarget(u, pick, true);
        return [pick];
      }
      case 'farthest': {
        const inR = enemies.filter((e) => distance(e.pos, u.pos) <= r);
        const pick = inR.length ? this.byDistanceFrom(inR, u.pos).reverse()[0] : tgt;
        this.retarget(u, pick, true);
        return [pick];
      }
      case 'densest': {
        let best = tgt;
        let bestCount = -1;
        for (const e of enemies) {
          const c = enemies.filter((o) => distance(o.pos, e.pos) <= r).length;
          if (c > bestCount || (c === bestCount && distance(e.pos, u.pos) < distance(best.pos, u.pos))) {
            best = e;
            bestCount = c;
          }
        }
        return [best, ...this.byDistanceFrom(enemies.filter((e) => e !== best && distance(e.pos, best.pos) <= r), best.pos)];
      }
      case 'line':
        return [tgt, ...this.byDistanceFrom(enemies.filter((e) => e !== tgt && distance(e.pos, tgt.pos) <= 1 && distance(e.pos, u.pos) >= distance(tgt.pos, u.pos)), u.pos)];
      case 'allEnemies':
        return this.byDistanceFrom(enemies, u.pos);
      default:
        return [tgt];
    }
  }

  selectAllies(u: SUnit, who: AllyRule, n = 1, r = 2): SUnit[] {
    const allies = this.alliesOf(u);
    switch (who) {
      case 'lowestHpAllies':
        return allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.order - b.order).slice(0, n);
      case 'topDamageAlly': {
        const best = allies.sort((a, b) => b.res.damageDealt - a.res.damageDealt || a.order - b.order)[0];
        return best ? [best] : [u];
      }
      case 'allAllies':
        return this.alliesOf(u, true);
      case 'alliesAround':
        return this.alliesOf(u, true).filter((a) => distance(a.pos, u.pos) <= r);
    }
  }

  private retarget(u: SUnit, t: SUnit, leap: boolean): void {
    if (u.target !== t) {
      u.target = t;
      u.targetSince = this.t;
    }
    if (leap && distance(u.pos, t.pos) > this.range(u)) this.leapTo(u, t);
  }

  // ───────────────────────── abilities ─────────────────────────
  cast(u: SUnit): void {
    const first = u.casts === 0;
    u.casts++;
    u.res.casts++;
    u.mana = u.def.manaMode === 'normal' || !u.def.manaMode ? (this.rules.manaOverflow ? Math.max(0, Math.min(u.maxMana, u.mana - u.maxMana)) : 0) : 0;
    if (u.def.manaMode !== 'attacks') u.manaLockUntil = this.t + this.rules.manaLockTime;
    this.log({ type: 'cast', src: u.uid, tgt: u.target?.uid, note: u.def.ability.name });
    if (u.fx.apPerCast) u.bonus.apFlat += u.fx.apPerCast;
    if (u.fx.attunedDur || u.fx.attunedAmp) {
      u.attuneWaxing = !u.attuneWaxing;
      u.timed = u.timed.filter((b) => b.until !== 9999);
      u.timed.push(u.attuneWaxing ? { stat: 'damageAmp', v: u.fx.attunedAmp, until: 9999 } : { stat: 'durability', v: u.fx.attunedDur, until: 9999 });
    }
    for (const e of u.def.ability.effects) {
      if ('once' in e && e.once && !first) continue;
      if ('afterFirst' in e && e.afterFirst && first) continue;
      this.runEffect(u, e);
    }
  }

  runEffect(u: SUnit, e: Effect): void {
    const si = u.si;
    switch (e.t) {
      case 'dmg': {
        const fire = () => {
          if (!u.alive && !e.delay) return;
          const list = this.selectEnemies(u, e.tgt, e.r ?? 1, e.n);
          if (!list.length) return;
          const base = this.amount(u, e.v);
          const hits = e.hits ?? 0;
          const victims = hits > 0 ? Array.from({ length: hits }, (_, i) => list[i % list.length]) : list;
          const each = e.split ? base / victims.length : base;
          victims.forEach((v, k) => {
            let amt = each;
            if (e.falloff) {
              const idx = e.tgt === 'densest' ? distance(v.pos, list[0].pos) : k;
              amt *= Math.max(e.falloffMin ?? 0.2, 1 - e.falloff * idx);
            }
            if (e.lowHp && v.hp / v.maxHp < e.lowHp.th) amt *= e.lowHp.mult;
            if (e.isolated && !this.alliesOf(v).some((a) => distance(a.pos, v.pos) === 1)) amt += this.amount(u, e.isolated);
            const dealt = this.dealDamage(u, v, amt, e.dt);
            if (e.healPctOfDamage) this.heal(u, (dealt * e.healPctOfDamage) / 100, u);
          });
        };
        if (e.delay) this.delayed.push({ at: this.t + e.delay, run: fire });
        else fire();
        break;
      }
      case 'dot': {
        const fire = () => {
          const list = this.selectEnemies(u, e.tgt, e.r ?? 1, e.n);
          if (!list.length) return;
          let total = this.amount(u, e.v);
          if (e.split) total /= list.length;
          for (const v of list) v.dots.push({ src: u, dt: e.dt, perSec: total / e.dur, until: this.t + e.dur });
        };
        if (e.delay) this.delayed.push({ at: this.t + e.delay, run: fire });
        else fire();
        break;
      }
      case 'heal': {
        let amt = this.amount(u, e.v);
        if (e.missingHpPct) amt += ((u.maxHp - u.hp) * e.missingHpPct) / 100;
        this.heal(u, amt, u);
        break;
      }
      case 'healAlly':
        for (const a of this.selectAllies(u, e.who, e.n ?? 1, e.r)) this.heal(a, this.amount(u, e.v), u);
        break;
      case 'shield':
        this.addShield(u, this.amount(u, e.v), e.dur, u);
        break;
      case 'shieldAlly':
        for (const a of this.selectAllies(u, e.who, e.n ?? 1, e.r)) this.addShield(a, this.amount(u, e.v), e.dur, u);
        break;
      case 'stun':
        for (const v of this.selectEnemies(u, e.tgt, e.r ?? 1, e.n)) {
          v.stunUntil = Math.max(v.stunUntil, this.t + e.dur[si]);
          this.log({ type: 'stun', src: u.uid, tgt: v.uid, amount: e.dur[si] });
        }
        break;
      case 'buff': {
        const v = e.v[si] * (e.scaleAp ? this.ap(u) / 100 : 1);
        if (e.dur) u.timed.push({ stat: e.stat, v, until: this.t + e.dur });
        else u.bonus[e.stat] += v;
        break;
      }
      case 'buffAlly':
        for (const a of this.selectAllies(u, e.who, e.n ?? 1)) {
          const v = e.v[si] * (e.scaleAp ? this.ap(u) / 100 : 1);
          if (e.dur) a.timed.push({ stat: e.stat, v, until: this.t + e.dur });
          else a.bonus[e.stat] += v;
        }
        break;
      case 'buffTeam':
        for (const a of this.alliesOf(u, true)) {
          if (e.dur) a.timed.push({ stat: e.stat, v: e.v[si], until: this.t + e.dur });
          else a.bonus[e.stat] += e.v[si];
        }
        break;
      case 'maxHp': {
        const amt = this.amount(u, e.v);
        u.maxHp += amt;
        u.hp += amt;
        break;
      }
      case 'empower':
        u.empower = { hits: e.hits, dt: e.dt, v: e.v, replace: !!e.replace };
        break;
      case 'onHitBuff':
        u.onHits.push({ dt: e.dt, v: e.v, until: this.t + e.dur });
        break;
      case 'taunt':
        for (const v of this.enemiesOf(u)) {
          if (distance(v.pos, u.pos) <= e.r) {
            v.tauntBy = u;
            v.tauntUntil = this.t + 3;
            v.target = u;
            v.targetSince = this.t;
          }
        }
        break;
      case 'mana':
        this.gainMana(u, e.v[si]);
        break;
      case 'consumeDots': {
        const tgt = u.target;
        if (!tgt || !tgt.alive) break;
        let total = 0;
        tgt.dots = tgt.dots.filter((d) => {
          if (d.src === u && d.until > this.t) {
            total += d.perSec * (d.until - this.t);
            return false;
          }
          return true;
        });
        if (total > 0) this.dealDamage(u, tgt, total, 'physical');
        break;
      }
      case 'extraAttack':
        for (let i = 0; i < e.count; i++) if (u.target && u.target.alive) this.attack(u, u.target, true);
        break;
      case 'markBonus': {
        const tgt = u.target;
        if (!tgt || !tgt.alive) break;
        if (tgt.marks.has(u.uid)) this.dealDamage(u, tgt, this.amount(u, e.v), e.dt);
        else tgt.marks.add(u.uid);
        break;
      }
      case 'invulnerable':
        u.invulnUntil = this.t + e.dur;
        break;
      case 'shred':
        for (const v of this.selectEnemies(u, e.tgt, e.r ?? 1, e.n)) {
          if (e.armor) v.timed.push({ stat: 'armor', v: -e.armor, until: this.t + e.dur });
          if (e.mr) v.timed.push({ stat: 'mr', v: -e.mr, until: this.t + e.dur });
        }
        break;
    }
  }

  // ───────────────────────── attacks ─────────────────────────
  attack(u: SUnit, tgt: SUnit, extra = false): void {
    u.res.attacks++;
    if (!extra) {
      if (u.def.manaMode === 'attacks') u.mana = Math.min(u.maxMana, u.mana + 1);
      else if (u.def.manaMode !== 'none') this.gainMana(u, this.manaPerAttack(u));
      if (u.fx.asPerAttack && u.rapidStacks < u.fx.maxStacks) u.rapidStacks++;
    }
    this.log({ type: 'attack', src: u.uid, tgt: tgt.uid });
    const emp = u.empower;
    if (emp && emp.replace) {
      this.dealDamage(u, tgt, this.amount(u, emp.v), emp.dt);
    } else {
      const crit = this.rng() < this.critChance(u);
      const raw = this.ad(u) * (crit ? this.rules.critDamage : 1);
      this.dealDamage(u, tgt, raw, 'physical', { crit, isAttack: true });
      const cleave = u.def.passive?.cleavePct;
      if (cleave) {
        for (const e of this.enemiesOf(u)) if (e !== tgt && distance(e.pos, tgt.pos) === 1) this.dealDamage(u, e, (raw * cleave) / 100, 'physical');
      }
      if (emp && tgt.alive) this.dealDamage(u, tgt, this.amount(u, emp.v), emp.dt);
    }
    if (emp) {
      emp.hits--;
      if (emp.hits <= 0) u.empower = null;
    }
    const p = u.def.passive;
    if (p?.onHit && tgt.alive) this.dealDamage(u, tgt, this.amount(u, p.onHit.v), p.onHit.dt);
    for (const oh of u.onHits) if (oh.until > this.t && tgt.alive) this.dealDamage(u, tgt, this.amount(u, oh.v), oh.dt);
    if (p?.onHitHeal) this.heal(u, this.amount(u, p.onHitHeal), u);
    if (p?.onHitDot && tgt.alive) tgt.dots.push({ src: u, dt: p.onHitDot.dt, perSec: this.amount(u, p.onHitDot.v) / p.onHitDot.dur, until: this.t + p.onHitDot.dur });
  }

  // ───────────────────────── main loop ─────────────────────────
  step(): void {
    if (this.winner) return;
    const dt = this.rules.tick;
    this.t = Math.round((this.t + dt) * 1e6) / 1e6;
    this.tickNo++;

    // Eclipse executions
    for (const team of ['A', 'B'] as Team[]) {
      const ec = this.eclipse[team];
      if (ec.active && this.t >= ec.next) {
        ec.next = this.t + ec.interval;
        const caster = this.units.find((x) => x.team === team && x.alive);
        if (caster) {
          const victims = this.enemiesOf(caster).sort((a, b) => a.hp - b.hp || a.order - b.order);
          if (victims[0]) {
            this.log({ type: 'trait', src: caster.uid, tgt: victims[0].uid, note: 'Eclipse execute' });
            this.kill(victims[0], caster);
          }
        }
      }
    }

    for (const u of this.units) {
      if (!u.alive) continue;
      // trait growth (Riftbeast 7+)
      if (u.fx.growthPct && u.fx.growthInterval) {
        const prev = Math.floor((this.t - dt) / u.fx.growthInterval + 1e-9);
        const cur = Math.floor(this.t / u.fx.growthInterval + 1e-9);
        if (cur > prev) {
          u.bonus.adPct += u.fx.growthPct;
          u.bonus.apFlat += u.fx.growthPct;
        }
      }
      // damage over time
      for (const d of u.dots) {
        if (d.until > this.t - dt + 1e-9 && u.alive) this.dealDamage(d.src, u, d.perSec * dt, d.dt, { noHooks: true, quiet: true });
      }
      u.dots = u.dots.filter((d) => d.until > this.t);
      if (!u.alive) continue;
      if (u.burn && u.burn.until > this.t) this.dealDamage(u.burn.src, u, (u.maxHp * u.burn.pct * dt) / 100, 'true', { noHooks: true, quiet: true });
      if (!u.alive) continue;
      // passives
      const p = u.def.passive;
      if (p?.regen) this.heal(u, this.amount(u, p.regen) * dt, u);
      if (p?.pulse) {
        u.pulseAcc += dt;
        if (u.pulseAcc >= 1 - 1e-9) {
          u.pulseAcc -= 1;
          for (const e of this.enemiesOf(u)) if (distance(e.pos, u.pos) <= p.pulse.r) this.dealDamage(u, e, this.amount(u, p.pulse.v), p.pulse.dt);
          if (p.pulse.heal) this.heal(u, this.amount(u, p.pulse.heal), u);
        }
      }
      // mana regen
      if (u.def.manaMode !== 'none' && u.def.manaMode !== 'attacks') {
        const regen = this.stat(u, 'manaRegen') + (u.def.manaRegen ?? 0) + (u.def.role === 'caster' ? this.rules.casterManaRegen : 0);
        if (regen) this.gainMana(u, regen * dt);
      }
      if (u.timed.length > 8) u.timed = u.timed.filter((b) => b.until > this.t);
      // gates
      if (u.stunUntil > this.t) continue;
      if (u.moveUntil > this.t) continue;
      // targeting
      if (u.tauntBy && u.tauntBy.alive && u.tauntUntil > this.t) {
        if (u.target !== u.tauntBy) { u.target = u.tauntBy; u.targetSince = this.t; }
      } else if (!u.target || !u.target.alive) {
        const n = this.nearestEnemy(u);
        if (!n) continue;
        u.target = n;
        u.targetSince = this.t;
      }
      const tgt = u.target!;
      const inRange = distance(u.pos, tgt.pos) <= this.range(u);
      if (inRange) {
        if (u.def.manaMode === 'attacks') {
          // mana is an attack counter: the Nth attack is replaced by the ability
          if (this.t >= u.nextAttackAt - 1e-9) {
            if (u.mana + 1 >= u.maxMana) {
              u.res.attacks++;
              this.cast(u);
            } else this.attack(u, tgt);
            u.nextAttackAt = this.t + 1 / this.as(u);
          }
          continue;
        }
        if (u.maxMana > 0 && u.def.manaMode !== 'none' && u.mana >= u.maxMana - 1e-9) {
          this.cast(u);
          continue; // casting uses the tick
        }
        if (this.t >= u.nextAttackAt - 1e-9 && u.target && u.target.alive) {
          this.attack(u, u.target);
          u.nextAttackAt = this.t + 1 / this.as(u);
        }
      } else {
        // retarget to nearest if something else is closer and we're not taunted
        if (!(u.tauntBy && u.tauntUntil > this.t)) {
          const n = this.nearestEnemy(u);
          if (n && n !== tgt && distance(u.pos, n.pos) < distance(u.pos, tgt.pos)) {
            u.target = n;
            u.targetSince = this.t;
            if (distance(u.pos, n.pos) <= this.range(u)) continue;
          }
        }
        const step = nextStep(u.pos, u.target!.pos, this.range(u), this.occupied(u));
        if (step) {
          u.pos = step;
          u.moveUntil = this.t + this.rules.moveTime;
          // the first attack after arriving waits a moment
          u.nextAttackAt = Math.max(u.nextAttackAt, this.t + this.rules.moveTime);
        }
      }
    }

    // delayed effects
    if (this.delayed.length) {
      const due = this.delayed.filter((d) => d.at <= this.t + 1e-9);
      this.delayed = this.delayed.filter((d) => d.at > this.t + 1e-9);
      for (const d of due) d.run();
    }

    const aliveA = this.units.some((u) => u.alive && u.team === 'A');
    const aliveB = this.units.some((u) => u.alive && u.team === 'B');
    if (!aliveA || !aliveB) this.winner = aliveA ? 'A' : aliveB ? 'B' : 'draw';
    else if (this.t >= this.rules.maxTime - 1e-9) this.winner = 'draw';

    if (this.record && this.rules.frameEvery > 0 && (this.tickNo % this.rules.frameEvery === 0 || this.winner)) this.recordFrame();
  }

  private recordFrame(): void {
    if (!this.record) return;
    this.frames.push({
      t: Math.round(this.t * 100) / 100,
      units: this.units.map((u) => ({
        uid: u.uid, col: u.pos.col, row: u.pos.row, hp: Math.max(0, Math.round(u.hp)), maxHp: Math.round(u.maxHp),
        mana: Math.round(u.mana * 10) / 10, maxMana: u.maxMana, shield: Math.round(this.shieldTotal(u)), alive: u.alive,
        stunned: u.stunUntil > this.t, casting: false, target: u.alive ? u.target?.uid : undefined, stats: this.liveStats(u),
      })),
    });
  }

  run(): CombatResult {
    const guard = Math.ceil(this.rules.maxTime / this.rules.tick) + 5;
    for (let i = 0; i < guard && !this.winner; i++) this.step();
    if (!this.winner) this.winner = 'draw';
    for (const u of this.units) {
      u.res.alive = u.alive;
      u.res.hpLeft = Math.max(0, u.hp);
      u.res.maxHp = u.maxHp;
    }
    return {
      winner: this.winner,
      duration: Math.round(this.t * 100) / 100,
      seed: 0,
      units: this.units.map((u) => ({ ...u.res })),
      frames: this.frames,
      events: this.events,
      traits: this.traits,
    };
  }
}

/** Convenience: run one combat to completion. */
export function simulate(input: CombatInput): CombatResult {
  const c = new Combat(input);
  const r = c.run();
  r.seed = input.seed;
  return r;
}
