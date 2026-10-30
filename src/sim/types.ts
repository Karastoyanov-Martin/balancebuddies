// Core data + simulation types for the BalanceBuddies combat sandbox.
// Everything here is plain data so it can be edited by the designer,
// serialised to JSON and diffed between "baseline" and "proposed" patches.

export type Star = 1 | 2 | 3;
export type Team = 'A' | 'B';
export type DamageType = 'physical' | 'magic' | 'true';

/** Value that differs per star level: [1★, 2★, 3★]. */
export type PerStar = [number, number, number];

/**
 * Scaling formula used by abilities (TFT tooltips show values at 100 AP).
 * amount = ad%/100 * currentAD + ap * AP/100 + hp%/100 * maxHP + flat
 */
export interface Scaling {
  ad?: PerStar; // % of current Attack Damage
  ap?: PerStar; // flat value multiplied by AP/100
  hp?: PerStar; // % of caster max Health
  arm?: PerStar; // % of caster current Armor
  mr?: PerStar; // % of caster current Magic Resist
  flat?: PerStar; // no scaling
}

/**
 * TFT Set 18 role (tftraits.com/roles, lolchess.gg/guide/role):
 *  tank       – 5 mana per attack, gains mana from damage taken, more likely to be targeted
 *  fighter    – 10 mana per attack, +5–30% attack speed by stage
 *  caster     – 7 mana per attack, 2 mana regen
 *  carry      – 10 mana per attack
 *  reaper     – 10 mana per attack, 15% less damage from enemies other than its target
 *  specialist – unique resource (attack counters, rage, no mana)
 */
export type Role = 'tank' | 'fighter' | 'caster' | 'carry' | 'reaper' | 'specialist';

export type TargetRule =
  | 'target' // current target
  | 'self'
  | 'aoe' // target + enemies within radius of target
  | 'adjacentToTarget' // enemies within radius of target, excluding target
  | 'around' // enemies within radius of caster
  | 'nearestN' // N nearest enemies to caster
  | 'targetPlusNearest' // target + (n-1) enemies nearest to the target
  | 'lowestHp' // lowest % HP enemy within radius of caster (whole board if no radius)
  | 'farthest' // farthest enemy within radius of caster
  | 'densest' // enemy with most other enemies within radius, + those enemies
  | 'line' // target + enemies within 1 hex of target (approximation of a line)
  | 'allEnemies';

export type AllyRule = 'lowestHpAllies' | 'topDamageAlly' | 'allAllies' | 'alliesAround';

export type StatKey =
  | 'adPct'
  | 'apFlat'
  | 'asPct'
  | 'armor'
  | 'mr'
  | 'durability'
  | 'damageAmp'
  | 'omnivamp'
  | 'critChance'
  | 'manaRegen'
  | 'hpFlat'
  | 'armorPen'
  | 'range';

export type Effect =
  | {
      t: 'dmg';
      dt: DamageType;
      v: Scaling;
      tgt: TargetRule;
      r?: number;
      n?: number;
      /** split total amount between all units hit */
      split?: boolean;
      /** multiplicative reduction per extra unit hit (line abilities), min 1-falloffMin */
      falloff?: number;
      /** minimum multiplier after falloff (default 0.2) */
      falloffMin?: number;
      /** % bonus when target is below a HP threshold */
      lowHp?: { th: number; mult: number };
      /** bonus amount when target has no adjacent allies */
      isolated?: Scaling;
      /** caster heals for % of damage dealt */
      healPctOfDamage?: number;
      /** delay in seconds before the effect lands */
      delay?: number;
      /** only on first cast of combat */
      once?: boolean;
      /** only on 2nd+ cast */
      afterFirst?: boolean;
      /** number of times the hit is repeated (e.g. 6 orbs spread round-robin) */
      hits?: number;
    }
  | { t: 'dot'; dt: DamageType; v: Scaling; dur: number; tgt: TargetRule; r?: number; n?: number; split?: boolean; once?: boolean; afterFirst?: boolean; delay?: number }
  | { t: 'heal'; v: Scaling; missingHpPct?: number; once?: boolean; afterFirst?: boolean }
  | { t: 'healAlly'; v: Scaling; who: AllyRule; n?: number; r?: number }
  | { t: 'shield'; v: Scaling; dur: number; once?: boolean; afterFirst?: boolean }
  | { t: 'shieldAlly'; v: Scaling; dur: number; who: AllyRule; n?: number; r?: number }
  | { t: 'stun'; dur: PerStar; tgt: TargetRule; r?: number; n?: number; once?: boolean }
  | { t: 'buff'; stat: StatKey; v: PerStar; dur?: number; scaleAp?: boolean; once?: boolean; afterFirst?: boolean }
  | { t: 'buffAlly'; stat: StatKey; v: PerStar; dur?: number; who: AllyRule; n?: number; scaleAp?: boolean }
  | { t: 'buffTeam'; stat: StatKey; v: PerStar; dur?: number }
  | { t: 'maxHp'; v: Scaling; once?: boolean }
  | { t: 'empower'; hits: number; dt: DamageType; v: Scaling; replace?: boolean }
  | { t: 'onHitBuff'; dt: DamageType; v: Scaling; dur: number }
  | { t: 'taunt'; r: number }
  | { t: 'mana'; v: PerStar }
  | { t: 'consumeDots' }
  | { t: 'extraAttack'; count: number }
  | { t: 'markBonus'; dt: DamageType; v: Scaling }
  | { t: 'invulnerable'; dur: number; once?: boolean }
  | { t: 'shred'; armor: number; mr: number; dur: number; tgt: TargetRule; r?: number; n?: number };

export interface Passive {
  /** heal per second (Scaling: hp % per sec, ap per sec) */
  regen?: Scaling;
  /** attacks also hit all enemies adjacent to the target for % damage */
  cleavePct?: number;
  /** on-hit bonus damage on every attack */
  onHit?: { dt: DamageType; v: Scaling };
  /** on-hit heal */
  onHitHeal?: Scaling;
  /** on-hit damage over time (e.g. Draven bleeds) */
  onHitDot?: { dt: DamageType; v: Scaling; dur: number };
  /** every second, damage enemies within radius */
  pulse?: { dt: DamageType; v: Scaling; r: number; heal?: Scaling };
  /** gain mana once when falling below threshold */
  lowHpMana?: { th: number; mana: number };
  omnivamp?: number;
  /** temporary stat bonuses at combat start */
  startBuffs?: { stat: StatKey; v: PerStar; dur: number }[];
  /** execute enemies below % HP when damaging them */
  executeBelow?: number;
}

export interface AbilityDef {
  name: string;
  /** human-readable text of the real ability (patch 18.5) */
  text: string;
  /** how the prototype simplifies it */
  simNote: string;
  effects: Effect[];
}

export interface UnitDef {
  id: string;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5;
  traits: string[];
  hp: PerStar;
  ad: PerStar;
  as: number;
  armor: number;
  mr: number;
  /** starting Ability Power — every Set 18 unit starts at 100 (filled in by UNIT_MAP); ability AP values are written at 100 AP */
  ap?: number;
  range: number;
  manaStart: number;
  manaMax: number;
  /** 'attacks' = mana is an attack counter (Caitlyn, Master Yi): +1 per attack, none from damage */
  manaMode?: 'normal' | 'attacks' | 'none';
  /** Set 18 role — decides mana generation (see Role) */
  role: Role;
  /** AD or AP flavour of the role (display only) */
  flavor: 'AD' | 'AP';
  /** extra mana gained per attack / per second (Gnar rage) */
  manaPerAttack?: number;
  manaRegen?: number;
  ability: AbilityDef;
  passive?: Passive;
}

export type TraitStatus = 'simulated' | 'approximated' | 'not-simulated';

export interface TraitParam {
  key: string;
  label: string;
  /**
   * One value per breakpoint — or a single value when `same` is set
   * (the effect does not change between breakpoints).
   */
  values: number[];
  /** the value is identical at every breakpoint: stored and edited once */
  same?: boolean;
  /** index of the first breakpoint where this effect exists (earlier values are 0 and not editable) */
  from?: number;
  unit?: '%' | 'flat' | 's' | 'stacks' | 'mana';
  scope: 'members' | 'team' | 'special';
  assumed?: boolean;
}

export interface TraitDef {
  id: string;
  name: string;
  kind: 'origin' | 'class' | 'unique';
  breakpoints: number[];
  description: string;
  params: TraitParam[];
  status: TraitStatus;
  /** designer switch: a disabled trait is still counted but grants nothing */
  disabled?: boolean;
  simNote: string;
}

export interface GameData {
  patch: string;
  units: Record<string, UnitDef>;
  traits: Record<string, TraitDef>;
}

export interface Hex {
  col: number; // 0..6
  row: number; // 0..7 (0-3 = team B, 4-7 = team A)
}

export interface Placement {
  uid: string; // unique per placed unit
  unitId: string;
  star: Star;
  team: Team;
  hex: Hex;
}

export interface SimRules {
  tick: number; // seconds per tick
  maxTime: number; // seconds before draw
  moveTime: number; // seconds to move one hex
  critChance: number;
  critDamage: number;
  manaPerAttack: number;
  manaPreMitPct: number;
  manaPostMitPct: number;
  manaDamageCap: number;
  baseAP: number;
  maxAS: number;
  frameEvery: number; // record a playback frame every N ticks (0 = never)
  /** seconds after a cast during which no mana is gained (TFT: ~1 s) */
  manaLockTime: number;
  /** mana gained above the max carries over (up to one cast) */
  manaOverflow: boolean;
  /** Set 18: only Tanks gain mana from damage taken */
  tankOnlyDamageMana: boolean;
  tankManaPerAttack: number;
  casterManaPerAttack: number;
  casterManaRegen: number;
  /** Fighter role bonus (5–30% depending on game stage; sandbox has no stage) */
  fighterAsPct: number;
  /** Reaper role: damage reduction from enemies other than its current target (%) */
  reaperDamageReduction: number;
}

export interface CombatInput {
  data: GameData;
  placements: Placement[];
  seed: number;
  rules?: Partial<SimRules>;
  record?: boolean;
}

export interface UnitFrame {
  uid: string;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  shield: number;
  alive: boolean;
  stunned: boolean;
  casting: boolean;
  /** uid of the unit this one is targeting (for target lines in the UI) */
  target?: string;
  /** live combat stats at this moment (traits, buffs, growth and shred included) */
  stats?: LiveStats;
}

/** A unit's stats at one moment of a fight — what the Unit tab shows during playback. */
export interface LiveStats {
  ad: number;
  ap: number;
  as: number;
  armor: number;
  mr: number;
  range: number;
  /** 0–1 */
  crit: number;
  /** 0–0.9 */
  durability: number;
  damageAmp: number;
  omnivamp: number;
  manaRegen: number;
}

export interface Frame {
  t: number;
  units: UnitFrame[];
}

export type SimEventType = 'attack' | 'cast' | 'damage' | 'heal' | 'shield' | 'death' | 'stun' | 'trait' | 'move';

export interface SimEvent {
  t: number;
  type: SimEventType;
  src?: string;
  tgt?: string;
  amount?: number;
  dt?: DamageType;
  crit?: boolean;
  note?: string;
  /** leaps / dashes: start and end hex */
  from?: Hex;
  to?: Hex;
}

export interface UnitResult {
  uid: string;
  unitId: string;
  team: Team;
  star: Star;
  damageDealt: number;
  physical: number;
  magic: number;
  trueDmg: number;
  damageTaken: number;
  healing: number;
  shielding: number;
  casts: number;
  attacks: number;
  kills: number;
  alive: boolean;
  hpLeft: number;
  maxHp: number;
  deathTime: number | null;
}

export interface ActiveTrait {
  traitId: string;
  count: number;
  level: number; // index into breakpoints, -1 = inactive
  team: Team;
}

export interface CombatResult {
  winner: Team | 'draw';
  duration: number;
  seed: number;
  units: UnitResult[];
  frames: Frame[];
  events: SimEvent[];
  traits: ActiveTrait[];
}
