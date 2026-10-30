import type { PerStar, UnitDef } from '../sim/types';

/*
 * TFT Set 18 "Enchanted Wilds" — all 65 shop units, patch 18.5 (released 21 Oct 2026).
 *
 * Sources (retrieved 26 Oct 2026):
 *  - Base stats (HP/AD per star, AS, armor, MR, mana): op.gg TFT "meta-trends" unit pages (v18.5)
 *  - Range + cross-check of stats: metabot.gg "Highest Range TFT Champions" (Set 18)
 *  - Ability numbers: op.gg unit pages, LoL Wiki (Ezreal), leagueofgraphs (Taric)
 *  - Patch 18.5 changes applied on top: esports.gg "TFT Patch 18.5" notes
 *
 * Abilities are SIMPLIFIED into a small set of composable effects (see sim/types.ts).
 * `ability.text` keeps the real behaviour, `ability.simNote` says what the sandbox does.
 * AD-scaling values are stored as % of AD; AP values are shown at 100 AP (TFT convention).
 */

const s = (a: number, b: number, c: number): PerStar => [a, b, c];
const hp = (one: number): PerStar => [one, Math.round(one * 1.8), Math.round(one * 3.24)];
const ad = (one: number): PerStar => [one, Math.round(one * 1.5 * 10) / 10, Math.round(one * 2.25 * 10) / 10];

export const UNITS: UnitDef[] = [
  // ───────────────────────────── 1 cost ─────────────────────────────
  {
    id: 'akali', name: 'Akali', cost: 1, traits: ['inferno', 'adaptor', 'ravager'], role: 'fighter', flavor: 'AD',
    hp: hp(650), ad: ad(40), as: 0.75, armor: 35, mr: 35, range: 1, manaStart: 0, manaMax: 25,
    ability: {
      name: 'Kunai Strike',
      text: 'Throw kunai at the target for 145/220/380% AD + 10/15/25 AP physical damage (+35/52/80% AD if Burning). AP form deals magic damage instead. Recasts on kill.',
      simNote: 'AD form only: single-target physical hit. Burning bonus and recast ignored.',
      effects: [{ t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(145, 220, 380), ap: s(10, 15, 25) } }],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). 3★ 380% AD (tft.tools, op.gg); the wiki shows 345%.',
  },
  {
    id: 'camille', name: 'Camille', cost: 1, traits: ['coven', 'ravager'], role: 'fighter', flavor: 'AD',
    hp: hp(700), ad: ad(40), as: 0.75, armor: 40, mr: 40, range: 1, manaStart: 0, manaMax: 25,
    ability: {
      name: 'Defensive Sweep',
      text: 'Slice the target for 150/225/400% AD + 10/15/25 AP physical damage and gain a 60/90/200 Shield for 2 seconds.',
      simNote: 'As described.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(150, 225, 400), ap: s(10, 15, 25) } },
        { t: 'shield', v: { ap: s(60, 90, 200) }, dur: 2 },
      ],
    },
  },
  {
    id: 'cinderling', name: 'Cinderling', cost: 1, traits: ['riftbeast', 'hunter'], role: 'caster', flavor: 'AD',
    hp: hp(500), ad: ad(40), as: 0.7, armor: 25, mr: 25, range: 4, manaStart: 0, manaMax: 50,
    ability: {
      name: 'Razor Leaves',
      text: 'Five leaves converge on the target for 310/465/700% AD + 30/45/70 AP physical damage, applying 20% Wound and 1% Burn for 4s. Scarlet Buff: gain 22% AD per cast.',
      simNote: 'Single-target physical hit + permanent 22% AD per cast. Wound/Burn ignored.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(310, 465, 700), ap: s(30, 45, 70) } },
        { t: 'buff', stat: 'adPct', v: s(22, 22, 22) },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: AD was 45 (stale op.gg) → 40; damage was mis-encoded as a flat total.',
  },
  {
    id: 'karma', name: 'Karma', cost: 1, traits: ['blossom', 'spellweaver'], role: 'caster', flavor: 'AP',
    hp: hp(500), ad: s(25, 38, 56), as: 0.7, armor: 25, mr: 25, range: 4, manaStart: 0, manaMax: 40,
    ability: {
      name: 'Karmic Bond',
      text: 'Tether the target for 280/420/630 magic damage over 1.5s, then burst for 125/185/300 magic damage to enemies within 1 hex and slow their Attack Speed by 30% for 2s.',
      simNote: 'Tether as instant hit; burst as 1-hex AoE; slow ignored.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(280, 420, 630) } },
        { t: 'dmg', dt: 'magic', tgt: 'aoe', r: 1, v: { ap: s(125, 185, 300) } },
      ],
    },
  },
  {
    id: 'kobuko', name: 'Kobuko', cost: 1, traits: ['sprykin', 'brawler'], role: 'tank', flavor: 'AP',
    hp: hp(700), ad: s(55, 83, 124), as: 0.65, armor: 40, mr: 40, range: 1, manaStart: 30, manaMax: 90,
    ability: {
      name: 'Dance of Life',
      text: 'Restore 7% max HP + 285/335/480 AP Health over 2s (18.4). Next attack bashes for 10% max HP + 70/105/150 AP magic damage.',
      simNote: 'Heal applied instantly; empowered next attack.',
      effects: [
        { t: 'heal', v: { ap: s(285, 335, 480), hp: s(7, 7, 7) } },
        { t: 'empower', hits: 1, dt: 'magic', v: { ap: s(70, 105, 150), hp: s(10, 10, 10) } },
      ],
    },
  },
  {
    id: 'leona', name: 'Leona', cost: 1, traits: ['solar', 'defender'], role: 'tank', flavor: 'AP',
    hp: hp(750), ad: ad(50), as: 0.65, armor: 40, mr: 40, range: 1, manaStart: 30, manaMax: 90,
    ability: {
      name: 'Shield Bash',
      text: 'Passive: start combat with 60/80/100 bonus Armor and MR decaying over 12s. Active: bash the target for 150/270/405% Armor as magic damage and Stun for 1.5s.',
      simNote: 'Decaying resists modelled as full bonus for the first 6s.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { arm: s(150, 270, 405) } },
        { t: 'stun', tgt: 'target', dur: s(1.5, 1.5, 1.5) },
      ],
    },
    passive: { startBuffs: [{ stat: 'armor', v: s(60, 80, 100), dur: 6 }, { stat: 'mr', v: s(60, 80, 100), dur: 6 }] },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: mana 40/100 → 30/90; resists 60/70/80 → 60/80/100 (18.2 notes); damage now scales with Armor.',
  },
  {
    id: 'ornn', name: 'Ornn', cost: 1, traits: ['elderwood', 'defender'], role: 'tank', flavor: 'AP',
    hp: hp(700), ad: ad(40), as: 0.6, armor: 40, mr: 40, range: 1, manaStart: 40, manaMax: 100,
    ability: {
      name: 'Bellows Breath',
      text: 'Gain a 400/460/550 Shield for 4s and deal 200/300/450 magic damage to enemies in a cone. Quest: forge Artifacts from damage blocked.',
      simNote: 'Cone approximated as target + 1 hex. Quest (items) ignored.',
      effects: [
        { t: 'shield', v: { ap: s(400, 460, 550) }, dur: 4 },
        { t: 'dmg', dt: 'magic', tgt: 'aoe', r: 1, v: { ap: s(200, 300, 450) } },
      ],
    },
  },
  {
    id: 'pebbles', name: 'Pebbles', cost: 1, traits: ['riftbeast', 'invoker'], role: 'caster', flavor: 'AP',
    hp: hp(500), ad: ad(35), as: 0.8, armor: 25, mr: 25, range: 4, manaStart: 30, manaMax: 70,
    ability: {
      name: 'Azure Laser',
      text: 'Channel a laser consuming 35% max Mana per second: 160/240/360 magic damage per second to the target and -3 MR per second.',
      simNote: 'Channel (~3s) modelled as a 3s damage-over-time on the target.',
      effects: [{ t: 'dot', dt: 'magic', tgt: 'target', dur: 3, v: { ap: s(460, 690, 1030) } }],
    },
  },
  {
    id: 'rakan', name: 'Rakan', cost: 1, traits: ['fae', 'juggernaut', 'vanguard'], role: 'tank', flavor: 'AP',
    hp: hp(700), ad: ad(45), as: 0.6, armor: 35, mr: 35, range: 1, manaStart: 35, manaMax: 105,
    ability: {
      name: 'Entrancing Dance',
      text: 'Gain a 290/340/435 Shield for 4s, then grant the ally with the most damage dealt 90/100/130% decaying Attack Speed for 4s.',
      simNote: 'Decaying AS modelled as half the value for the full 4s.',
      effects: [
        { t: 'shield', v: { ap: s(290, 340, 435) }, dur: 4 },
        { t: 'buffAlly', who: 'topDamageAlly', stat: 'asPct', v: s(45, 50, 65), dur: 4, scaleAp: true },
      ],
    },
  },
  {
    id: 'reksai', name: "Rek'Sai", cost: 1, traits: ['blackthorn', 'brawler'], role: 'tank', flavor: 'AP',
    hp: hp(700), ad: ad(50), as: 0.55, armor: 40, mr: 40, range: 1, manaStart: 40, manaMax: 100,
    ability: {
      name: 'Uproot',
      text: 'Passive: restore 1% max HP + 10/14/20 Health per second (tripled for 3s after casting). Active: lunge out of the ground, Stunning adjacent enemies for 1s and dealing 70/105/160 AP magic damage.',
      simNote: 'Regen modelled without the post-cast triple.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'around', r: 1, v: { ap: s(70, 105, 160) } },
        { t: 'stun', tgt: 'around', r: 1, dur: s(1, 1, 1) },
      ],
    },
    passive: { regen: { hp: s(1, 1, 1), flat: s(10, 14, 20) } },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). ',
  },
  {
    id: 'varus', name: 'Varus', cost: 1, traits: ['inferno', 'rapidfire'], role: 'caster', flavor: 'AD',
    hp: hp(500), ad: ad(40), as: 0.75, armor: 25, mr: 25, range: 4, manaStart: 20, manaMax: 110,
    ability: {
      name: 'Piercing Arrow',
      text: 'Fire an arrow through the most enemies in line with the target for 415/625/1000% AD + 30/45/70 AP physical damage, reduced by 40% per enemy passed (min 40%).',
      simNote: 'Line approximated as target + enemies within 1 hex, with falloff.',
      effects: [{ t: 'dmg', dt: 'physical', tgt: 'line', falloff: 0.4, falloffMin: 0.4, v: { ad: s(415, 625, 1000), ap: s(30, 45, 70) } }],
    },
    dataNote: 'Fixed: AS 0.70 → 0.75 (18.4, both agents); mana 30/120 → 20/110 (official 18.4 mid-patch per both agents; op.gg still shows 30/120); damage was mis-encoded.',
  },
  {
    id: 'veigar', name: 'Veigar', cost: 1, traits: ['blackthorn', 'sprykin', 'spellweaver'], role: 'caster', flavor: 'AP',
    hp: hp(500), ad: s(25, 38, 56), as: 0.7, armor: 25, mr: 25, range: 4, manaStart: 0, manaMax: 30,
    ability: {
      name: 'Primordial Burst',
      text: 'Blast the target for 190/285/430 AP magic damage, increased to 285/430/640 below 30% max HP (18.4). On kill, permanently gain 2% AP.',
      simNote: 'Execute bonus modelled; permanent AP stacking ignored.',
      effects: [{ t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(190, 285, 430) }, lowHp: { th: 0.3, mult: 1.5 } }],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). ',
  },
  {
    id: 'xayah', name: 'Xayah', cost: 1, traits: ['elderwood', 'fae', 'rapidfire'], role: 'carry', flavor: 'AD',
    hp: hp(450), ad: ad(45), as: 0.7, armor: 25, mr: 25, range: 4, manaStart: 0, manaMax: 50,
    ability: {
      name: 'Deadly Plumage',
      text: 'Gain 50% Attack Speed for the next 5 attacks; they become feathers dealing 73/108/165 physical damage and reducing Armor by 2.',
      simNote: '5 empowered attacks + 50% AS for ~5s. Armor reduction ignored.',
      effects: [
        { t: 'buff', stat: 'asPct', v: s(50, 50, 50), dur: 5 },
        { t: 'empower', hits: 5, dt: 'physical', replace: true, v: { ad: s(162, 160, 163) } },
      ],
    },
  },
  {
    id: 'yorick', name: 'Yorick', cost: 1, traits: ['blossom', 'juggernaut', 'summoner'], role: 'tank', flavor: 'AD',
    hp: hp(650), ad: ad(50), as: 0.6, armor: 35, mr: 35, range: 1, manaStart: 50, manaMax: 110,
    ability: {
      name: 'Last Rites',
      text: 'Passive: on death, spawn a Spirit Walker (200/400/750 + 20% HP) that taunts. Active: restore 280/325/435 AP Health and strike the target for 150/225/340% AD physical damage.',
      simNote: 'Spirit Walker summon not simulated.',
      effects: [
        { t: 'heal', v: { ap: s(280, 325, 435) } },
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(150, 225, 340) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },

  // ───────────────────────────── 2 cost ─────────────────────────────
  {
    id: 'alistar', name: 'Alistar', cost: 2, traits: ['elderwood', 'brawler'], role: 'tank', flavor: 'AP',
    hp: hp(950), ad: ad(50), as: 0.6, armor: 45, mr: 45, range: 1, manaStart: 30, manaMax: 90,
    ability: {
      name: 'Triumphant Roar',
      text: 'Cleanse, heal 230/300/400 + 8% max HP, heal the 2 lowest-HP allies for 80/105/130, deal 180/270/420 magic damage to the target and Stun for 1.5s.',
      simNote: 'Cleanse ignored.',
      effects: [
        { t: 'heal', v: { ap: s(230, 300, 400), hp: s(8, 8, 8) } },
        { t: 'healAlly', who: 'lowestHpAllies', n: 2, v: { ap: s(80, 105, 130) } },
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(180, 270, 420) } },
        { t: 'stun', tgt: 'target', dur: s(1.5, 1.5, 1.5) },
      ],
    },
  },
  {
    id: 'caitlyn', name: 'Caitlyn', cost: 2, traits: ['coven', 'hunter'], role: 'specialist', flavor: 'AD',
    hp: hp(550), ad: ad(50), as: 0.7, armor: 30, mr: 30, range: 4, manaStart: 0, manaMax: 3, manaMode: 'attacks',
    ability: {
      name: 'Headshot',
      text: 'Every 3rd attack is a Headshot dealing 200/300/490% AD + 20/30/45 AP physical damage (18.5).',
      simNote: 'Mana is an attack counter (1 per attack).',
      effects: [{ t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(200, 300, 490), ap: s(20, 30, 45) } }],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },
  {
    id: 'elise', name: 'Elise', cost: 2, traits: ['coven', 'vanguard'], role: 'tank', flavor: 'AP',
    hp: hp(900), ad: s(20, 30, 45), as: 0.65, armor: 45, mr: 45, range: 1, manaStart: 20, manaMax: 70,
    ability: {
      name: 'Spider Queen',
      text: 'Transform into a spider: +375/475/725 max HP; attacks deal 35/50/80 bonus magic damage and heal 55/90/170. Later casts grant 175% decaying Attack Speed for 4s.',
      simNote: 'First cast: max HP + on-hit magic for rest of combat. Later casts: +85% AS for 4s.',
      effects: [
        { t: 'maxHp', v: { ap: s(375, 475, 725) }, once: true },
        { t: 'onHitBuff', dt: 'magic', v: { ap: s(35, 50, 80) }, dur: 999 },
        { t: 'buff', stat: 'asPct', v: s(85, 85, 85), dur: 4, afterFirst: true },
      ],
    },
  },
  {
    id: 'gromp', name: 'Gromp', cost: 2, traits: ['riftbeast', 'adaptor'], role: 'caster', flavor: 'AP',
    hp: hp(550), ad: ad(30), as: 0.7, armor: 30, mr: 30, range: 4, manaStart: 0, manaMax: 45,
    ability: {
      name: 'Belchy Bubble',
      text: 'AP form: bubble explodes on the first enemy hit for 225/340/535 AP magic damage, then 180/270/435 AP magic damage over 3s in 1 hex. Purple Buff: +30% AP every 5s.',
      simNote: 'AP form only. Purple Buff ignored.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(225, 340, 535) } },
        { t: 'dot', dt: 'magic', tgt: 'aoe', r: 1, dur: 3, v: { ap: s(180, 270, 435) } },
      ],
    },
    dataNote: 'Splash damage: patch notes give 180/270/435 (low confidence); op.gg shows 160/240/375.',
  },
  {
    id: 'kayle', name: 'Kayle', cost: 2, traits: ['solar', 'rapidfire'], role: 'specialist', flavor: 'AP',
    hp: hp(550), ad: s(10, 15, 23), as: 0.75, armor: 30, mr: 30, range: 4, manaStart: 0, manaMax: 0, manaMode: 'none',
    ability: {
      name: 'Solar Judgement',
      text: 'Passive (no mana). Ascensions by level: attacks deal 65/97/110 bonus magic damage; then 20% Shred; then waves of 35 magic damage; then infinite range.',
      simNote: 'Only the 1st Ascension (on-hit magic damage) is simulated.',
      effects: [],
    },
    passive: { onHit: { dt: 'magic', v: { ap: s(65, 97, 110) } } },
  },
  {
    id: 'leblanc', name: 'LeBlanc', cost: 2, traits: ['elderwood', 'spellweaver'], role: 'caster', flavor: 'AP',
    hp: hp(550), ad: ad(30), as: 0.7, armor: 30, mr: 30, range: 4, manaStart: 0, manaMax: 40,
    ability: {
      name: 'Mirror Image',
      text: 'Launch a mirror image at the target: 260/390/615 AP magic damage, 100/150/230 AP to adjacent enemies. Passive: 10/15/30% chance to copy an ally after combat (+4% per takedown).',
      simNote: 'Copy passive ignored.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(260, 390, 615) } },
        { t: 'dmg', dt: 'magic', tgt: 'adjacentToTarget', r: 1, v: { ap: s(100, 150, 230) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Copy chance 30% at 3★ per 18.2 mid-patch (op.gg shows 40%).',
  },
  {
    id: 'murkwolf', name: 'Murkwolf', cost: 2, traits: ['riftbeast', 'ravager'], role: 'reaper', flavor: 'AD',
    hp: hp(700), ad: ad(50), as: 0.75, armor: 40, mr: 40, range: 1, manaStart: 0, manaMax: 40,
    ability: {
      name: 'Rending Claws',
      text: 'Leap to the lowest-Health enemy within 3 hexes for 100/150/225% AD + 20/30/45 AP physical damage. Next 2 attacks gain 175% AS and deal 65/100/160% AD bonus physical damage. Grey Buff: Precision + 25–75% crit chance.',
      simNote: 'Leap retargets; 2 empowered attacks. Grey Buff ignored.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'lowestHp', r: 3, v: { ad: s(100, 150, 225), ap: s(20, 30, 45) } },
        { t: 'empower', hits: 2, dt: 'physical', v: { ad: s(65, 100, 160) } },
        { t: 'buff', stat: 'asPct', v: s(175, 175, 175), dur: 1.5 },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded (op.gg total 500/1050/2250 is internally inconsistent).',
  },
  {
    id: 'scuttlecrab', name: 'Scuttlecrab', cost: 2, traits: ['riftbeast', 'juggernaut'], role: 'tank', flavor: 'AD',
    hp: hp(950), ad: ad(50), as: 0.65, armor: 45, mr: 45, range: 1, manaStart: 40, manaMax: 100,
    ability: {
      name: 'Can You Dig It?',
      text: 'Passive: attacks become a dance hitting all adjacent enemies. Active: burrow, gaining 15% Durability for 3s and healing 325/400/675. Green Buff: allies below 50% restore 15% max HP.',
      simNote: 'Cleave modelled; Green Buff ignored.',
      effects: [
        { t: 'buff', stat: 'durability', v: s(15, 15, 15), dur: 3 },
        { t: 'heal', v: { ap: s(325, 400, 675) } },
      ],
    },
    passive: { cleavePct: 100 },
  },
  {
    id: 'sejuani', name: 'Sejuani', cost: 2, traits: ['solar', 'juggernaut'], role: 'tank', flavor: 'AP',
    hp: hp(900), ad: ad(50), as: 0.6, armor: 45, mr: 45, range: 1, manaStart: 40, manaMax: 100,
    ability: {
      name: "Sun's Wrath",
      text: 'Gain a 225/250/275 + 10% max HP Shield for 4s, cleave a cone for 90/135/205 magic damage and strike a line for 120/180/270 magic damage.',
      simNote: 'Cone = target + 1 hex; line = target + 1 hex.',
      effects: [
        { t: 'shield', v: { ap: s(225, 250, 275), hp: s(10, 10, 10) }, dur: 4 },
        { t: 'dmg', dt: 'magic', tgt: 'aoe', r: 1, v: { ap: s(90, 135, 205) } },
        { t: 'dmg', dt: 'magic', tgt: 'line', v: { ap: s(120, 180, 270) } },
      ],
    },
  },
  {
    id: 'shen', name: 'Shen', cost: 2, traits: ['inferno', 'defender'], role: 'tank', flavor: 'AP',
    hp: hp(900), ad: ad(50), as: 0.65, armor: 45, mr: 45, range: 1, manaStart: 30, manaMax: 90,
    ability: {
      name: 'Ki Barrier',
      text: 'Shield self for 375/450/575 and a nearby damaged ally for 225/300/400 for 4s. Both gain +40% AS and 35/55/80 bonus magic damage on their next 3 attacks.',
      simNote: 'Ally = lowest-HP ally. Empower applies to Shen only.',
      effects: [
        { t: 'shield', v: { ap: s(375, 450, 575) }, dur: 4 },
        { t: 'shieldAlly', who: 'lowestHpAllies', n: 1, v: { ap: s(225, 300, 400) }, dur: 4 },
        { t: 'empower', hits: 3, dt: 'magic', v: { ap: s(35, 55, 80) } },
      ],
    },
  },
  {
    id: 'teemo', name: 'Teemo', cost: 2, traits: ['sprykin', 'invoker'], role: 'caster', flavor: 'AP',
    hp: hp(550), ad: s(35, 53, 79), as: 0.75, armor: 30, mr: 30, range: 4, manaStart: 0, manaMax: 50,
    ability: {
      name: 'Fungus Among Us',
      text: 'Throw 2 mushroom clusters at the 3 nearest enemies (55/82/155 magic each) and a giant mushroom at the target (135/200/310 magic). May forage loot.',
      simNote: 'Loot ignored.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'nearestN', n: 3, v: { ap: s(110, 164, 310) } },
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(135, 200, 310) } },
      ],
    },
  },
  {
    id: 'warwick', name: 'Warwick', cost: 2, traits: ['blackthorn', 'ravager'], role: 'fighter', flavor: 'AD',
    hp: hp(750), ad: s(45, 68, 101), as: 0.75, armor: 45, mr: 45, range: 1, manaStart: 0, manaMax: 40,
    ability: {
      name: 'Jaws of The Beast',
      text: 'Bite the target for 230/345/535% AD physical damage, heal 25% of damage dealt and gain 20% Attack Speed for the rest of combat.',
      simNote: 'As described (AS stacks per cast).',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(230, 345, 535) }, healPctOfDamage: 25 },
        { t: 'buff', stat: 'asPct', v: s(20, 20, 20) },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },
  {
    id: 'yunara', name: 'Yunara', cost: 2, traits: ['blossom', 'executioner'], role: 'caster', flavor: 'AD',
    hp: hp(550), ad: s(42, 63, 95), as: 0.75, armor: 30, mr: 30, range: 4, manaStart: 0, manaMax: 35,
    ability: {
      name: 'Cultivation of Spirit',
      text: 'Dash, then launch an orb at the target for 160/240/370% AD + 10/15/25 AP physical damage. It splits into 2 nearby enemies for 35% of that.',
      simNote: 'Dash ignored.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(160, 240, 370), ap: s(10, 15, 25) } },
        { t: 'dmg', dt: 'physical', tgt: 'adjacentToTarget', r: 2, n: 2, v: { ad: s(56, 84, 129.5), ap: s(3.5, 5.25, 8.75) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },

  // ───────────────────────────── 3 cost ─────────────────────────────
  {
    id: 'azir', name: 'Azir', cost: 3, traits: ['blackthorn', 'executioner', 'summoner'], role: 'carry', flavor: 'AP',
    hp: hp(650), ad: ad(30), as: 0.75, armor: 35, mr: 35, range: 4, manaStart: 0, manaMax: 35,
    ability: {
      name: 'Arise!',
      text: 'Gain 150% AS for the next 6 attacks and summon 2 soldiers; attacks command the soldiers, each dealing 43/65/105 magic damage (18.5 nerf from 46/69/110).',
      simNote: 'Soldiers modelled as 6 empowered attacks dealing 2 soldier hits each.',
      effects: [
        { t: 'buff', stat: 'asPct', v: s(150, 150, 150), dur: 3.2 },
        { t: 'empower', hits: 6, dt: 'magic', replace: true, v: { ap: s(86, 130, 210) } },
      ],
    },
  },
  {
    id: 'cassiopeia', name: 'Cassiopeia', cost: 3, traits: ['coven', 'spellweaver'], role: 'caster', flavor: 'AP',
    hp: hp(650), ad: ad(30), as: 0.75, armor: 35, mr: 35, range: 4, manaStart: 0, manaMax: 30,
    ability: {
      name: 'Noxious Blast',
      text: 'Poison the target and the nearest non-poisoned enemy for 425/630/1020 magic damage over 15s. Poisons stack.',
      simNote: 'Target + nearest enemy each receive the full poison.',
      effects: [{ t: 'dot', dt: 'magic', tgt: 'targetPlusNearest', n: 2, dur: 15, v: { ap: s(425, 630, 1020) } }],
    },
  },
  {
    id: 'diana', name: 'Diana', cost: 3, traits: ['lunar', 'ravager', 'vanguard'], role: 'fighter', flavor: 'AP',
    hp: s(850, 1530, 2754), ad: ad(30), as: 0.8, armor: 50, mr: 50, range: 1, manaStart: 0, manaMax: 30,
    ability: {
      name: 'Pale Barrier',
      text: 'Gain a 150/275/500 Shield for 2s and launch 6 moonlight orbs spread among enemies within 2 hexes, each dealing 75/115/180 magic damage.',
      simNote: 'Orbs distributed round-robin among enemies within 2 hexes.',
      effects: [
        { t: 'shield', v: { ap: s(150, 275, 500) }, dur: 2 },
        { t: 'dmg', dt: 'magic', tgt: 'around', r: 2, hits: 6, v: { ap: s(75, 115, 180) } },
      ],
    },
  },
  {
    id: 'fiddlesticks', name: 'Fiddlesticks', cost: 3, traits: ['flora_fatalis', 'defender', 'spellweaver'], role: 'tank', flavor: 'AP',
    hp: hp(1000), ad: ad(50), as: 0.65, armor: 55, mr: 55, range: 1, manaStart: 30, manaMax: 90,
    ability: {
      name: 'Harvest',
      text: 'Reduce the MR of the 3 nearest enemies by 10, then drain them over 2s for 70/105/170 magic damage each, healing 410/485/850.',
      simNote: 'Drain = 2s DoT on 3 nearest + instant heal.',
      effects: [
        { t: 'shred', armor: 0, mr: 10, dur: 99, tgt: 'nearestN', n: 3 },
        { t: 'dot', dt: 'magic', tgt: 'nearestN', n: 3, dur: 2, v: { ap: s(70, 105, 170) } },
        { t: 'heal', v: { ap: s(410, 485, 850) } },
      ],
    },
    dataNote: 'Range not listed by sources; melee assumed.',
  },
  {
    id: 'hecarim', name: 'Hecarim', cost: 3, traits: ['elderwood', 'vanguard'], role: 'tank', flavor: 'AP',
    hp: hp(1100), ad: ad(50), as: 0.65, armor: 50, mr: 50, range: 1, manaStart: 50, manaMax: 110,
    ability: {
      name: 'Spirit of Dread',
      text: 'Gain 50 Armor and MR for 3s and heal 375/475/685 over the duration. Launch riders at the 3 nearest enemies: 80/120/195 magic damage and Stun 1.5/1.5/1.75s.',
      simNote: 'Heal applied instantly.',
      effects: [
        { t: 'buff', stat: 'armor', v: s(50, 50, 50), dur: 3 },
        { t: 'buff', stat: 'mr', v: s(50, 50, 50), dur: 3 },
        { t: 'heal', v: { ap: s(375, 475, 685) } },
        { t: 'dmg', dt: 'magic', tgt: 'nearestN', n: 3, v: { ap: s(80, 120, 195) } },
        { t: 'stun', tgt: 'nearestN', n: 3, dur: s(1.5, 1.5, 1.75) },
      ],
    },
  },
  {
    id: 'khazix', name: "Kha'Zix", cost: 3, traits: ['rival'], role: 'reaper', flavor: 'AP',
    hp: hp(950), ad: ad(40), as: 0.85, armor: 55, mr: 55, range: 1, manaStart: 0, manaMax: 25,
    ability: {
      name: 'Taste Their Fear',
      text: 'Leap to the farthest enemy within 3 hexes for 230/310/450 AP magic damage (18.5 mid-patch, 27 Oct). Isolated targets take 250/350/530 AP instead and refund 10 Mana.',
      simNote: 'Leap retargets the farthest enemy within 3 hexes.',
      effects: [{ t: 'dmg', dt: 'magic', tgt: 'farthest', r: 3, v: { ap: s(230, 310, 450) }, isolated: { ap: s(20, 40, 80) } }],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Includes the 27 Oct 18.5 mid-patch nerf.',
  },
  {
    id: 'kogmaw', name: "Kog'Maw", cost: 3, traits: ['caustic', 'invoker', 'adaptor'], role: 'caster', flavor: 'AD',
    hp: hp(650), ad: ad(40), as: 0.8, armor: 35, mr: 35, range: 4, manaStart: 15, manaMax: 55,
    ability: {
      name: 'Raining Artillery',
      text: 'Launch acid at the target and the nearest other enemy for 145/220/375% AD + 20/30/50 AP physical damage; 140% damage to enemies below 50% HP.',
      simNote: 'As described (AD form).',
      effects: [{ t: 'dmg', dt: 'physical', tgt: 'targetPlusNearest', n: 2, v: { ad: s(145, 220, 375), ap: s(20, 30, 50) }, lowHp: { th: 0.5, mult: 1.4 } }],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },
  {
    id: 'krug', name: 'Krug', cost: 3, traits: ['riftbeast', 'brawler'], role: 'tank', flavor: 'AD',
    hp: hp(1100), ad: s(55, 83, 124), as: 0.6, armor: 40, mr: 40, range: 1, manaStart: 80, manaMax: 135,
    ability: {
      name: 'Rock and Roll',
      text: 'Gain 175/225/325 max HP, then roll into the target for 135/200/335% AD + 8% max HP damage. On death split into two taunting Kruglettes.',
      simNote: 'Kruglettes / Slate Buff not simulated.',
      effects: [
        { t: 'maxHp', v: { flat: s(175, 225, 325) } },
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(135, 200, 335), hp: s(8, 8, 8) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },
  {
    id: 'mamabeak', name: 'Mama Beak', cost: 3, traits: ['riftbeast', 'summoner', 'rapidfire'], role: 'carry', flavor: 'AD',
    hp: hp(650), ad: ad(60), as: 0.75, armor: 35, mr: 35, range: 4, manaStart: 20, manaMax: 60,
    ability: {
      name: 'Flock Family',
      text: 'Summon 4 untargetable Tiny Beaks for 5s; whenever Mama Beak attacks they attack the same enemy for 20/30/50% AD physical damage each (18.5). Orange Buff: -2 Armor per hit.',
      simNote: 'Tiny Beaks = +4 hits of on-hit physical damage for 5s.',
      effects: [{ t: 'onHitBuff', dt: 'physical', dur: 5, v: { ad: s(80, 120, 200) } }],
    },
    dataNote: 'AD 55 → 60 per the official 18.4 mid-patch (both agents found it; op.gg still shows 55). Tiny Beaks = +4 × 20/30/50% AD on-hit for 5s.',
  },
  {
    id: 'masteryi', name: 'Master Yi', cost: 3, traits: ['blossom', 'adaptor'], role: 'specialist', flavor: 'AD',
    hp: hp(850), ad: s(63, 95, 142), as: 0.8, armor: 55, mr: 55, range: 1, manaStart: 0, manaMax: 3, manaMode: 'attacks',
    ability: {
      name: 'Wuju Style',
      text: 'Every 3rd attack is a Double Strike that grants stacking Attack Speed (12%, more with Adaptor). AD form starting AD 63 (18.5).',
      simNote: 'The 3rd attack becomes two attacks + 12% permanent AS.',
      effects: [
        { t: 'extraAttack', count: 2 },
        { t: 'buff', stat: 'asPct', v: s(12, 12, 12) },
      ],
    },
  },
  {
    id: 'rammus', name: 'Rammus', cost: 3, traits: ['sprykin', 'defender'], role: 'tank', flavor: 'AD',
    hp: hp(1100), ad: ad(50), as: 0.6, armor: 50, mr: 50, range: 1, manaStart: 30, manaMax: 80,
    ability: {
      name: 'Defensive Ball Curl',
      text: 'Taunt nearby enemies; for 4s gain a 400/550/700 AP Shield (18.4) and 60 Armor/MR. When the Shield breaks, deal 50/75/120% Armor + 50/75/120% MR physical damage within 2 hexes.',
      simNote: 'Shield-break damage applied when the cast ends.',
      effects: [
        { t: 'taunt', r: 2 },
        { t: 'shield', v: { ap: s(400, 550, 700) }, dur: 4 },
        { t: 'buff', stat: 'armor', v: s(60, 60, 60), dur: 4 },
        { t: 'buff', stat: 'mr', v: s(60, 60, 60), dur: 4 },
        { t: 'dmg', dt: 'physical', tgt: 'around', r: 2, delay: 4, v: { arm: s(50, 75, 120), mr: s(50, 75, 120) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). ',
  },
  {
    id: 'rengar', name: 'Rengar', cost: 3, traits: ['rival'], role: 'fighter', flavor: 'AD',
    hp: hp(900), ad: ad(60), as: 0.75, armor: 55, mr: 55, range: 1, manaStart: 10, manaMax: 50,
    ability: {
      name: 'Savagery',
      text: 'Jump to the lowest-%HP enemy within 3 hexes and stab for 255/385/650% AD physical damage. Heal 60/90/90 AP, up to 120/180/180 based on target missing HP.',
      simNote: 'Heal uses the average of min/max.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'lowestHp', r: 3, v: { ad: s(255, 385, 650) } },
        { t: 'heal', v: { ap: s(90, 135, 135) } },
      ],
    },
    dataNote: 'Damage verified by both agents (was mis-encoded). Heal 3★ conflicts: op.gg 90/180, tft.tools 150/300.',
  },
  {
    id: 'tristana', name: 'Tristana', cost: 3, traits: ['fae', 'sprykin', 'hunter'], role: 'carry', flavor: 'AD',
    hp: hp(650), ad: s(55, 83, 124), as: 0.75, armor: 35, mr: 35, range: 4, manaStart: 0, manaMax: 50,
    ability: {
      name: 'Explosive Charge',
      text: 'Attach a charge to the target for 4s; gain infinite range and 60% AS. It then explodes for 175/265/420% AD + 12/18/28% AD per attack made meanwhile, split among enemies within 2 hexes (18.5).',
      simNote: 'Explosion assumes ~6 attacks while charged. Mana 0/50 after 18.5.',
      effects: [
        { t: 'buff', stat: 'asPct', v: s(60, 60, 60), dur: 4 },
        { t: 'buff', stat: 'range', v: s(8, 8, 8), dur: 4 },
        { t: 'dmg', dt: 'physical', tgt: 'aoe', r: 2, split: true, delay: 4, v: { ad: s(235, 355, 560) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Sandbox assumes 5 attacks during the charge.',
  },
  {
    id: 'vi', name: 'Vi', cost: 3, traits: ['primal', 'juggernaut'], role: 'tank', flavor: 'AD',
    hp: hp(1100), ad: s(45, 68, 101), as: 0.75, armor: 50, mr: 50, range: 1, manaStart: 0, manaMax: 60,
    ability: {
      name: 'Furious Fists',
      text: 'Passive: attacks restore 2% max HP. Active: heal 200/265/360, gain 85/100/125% AS and 15% Durability, Unstoppable for 3s.',
      simNote: 'AS buff assumed to last 3s (same as Unstoppable).',
      effects: [
        { t: 'heal', v: { ap: s(200, 265, 360) } },
        { t: 'buff', stat: 'asPct', v: s(85, 100, 125), dur: 3 },
        { t: 'buff', stat: 'durability', v: s(15, 15, 15), dur: 3 },
      ],
    },
    passive: { onHitHeal: { hp: s(2, 2, 2) } },
  },

  // ───────────────────────────── 4 cost ─────────────────────────────
  {
    id: 'ahri', name: 'Ahri', cost: 4, traits: ['blossom', 'spellweaver'], role: 'caster', flavor: 'AP',
    hp: s(850, 1530, 3254), ad: ad(40), as: 0.8, armor: 40, mr: 40, range: 4, manaStart: 20, manaMax: 100,
    ability: {
      name: 'Spirit Bomb',
      text: 'Target the spot within 4 hexes with the most enemies; explode in a 3-hex radius for 455/685/3500 magic damage, falling off 21% per hex from the centre.',
      simNote: 'Densest enemy cluster within 2 hexes; falloff per hex.',
      effects: [{ t: 'dmg', dt: 'magic', tgt: 'densest', r: 2, falloff: 0.21, v: { ap: s(455, 685, 3500) } }],
    },
  },
  {
    id: 'amumu', name: 'Amumu', cost: 4, traits: ['inferno', 'juggernaut'], role: 'tank', flavor: 'AP',
    hp: s(1300, 2340, 4712), ad: ad(70), as: 0.7, armor: 60, mr: 60, range: 1, manaStart: 30, manaMax: 125,
    ability: {
      name: 'Tantrum',
      text: 'Passive: every second heal 2.5% max HP + 20/25/100 and deal 12/18/150 magic damage within 1 hex. Active: 100/150/2000 magic damage within 2 hexes and Stun 1/1/6s (longer if Burning).',
      simNote: 'Burning stun extension ignored.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'around', r: 2, v: { ap: s(100, 150, 2000) } },
        { t: 'stun', tgt: 'around', r: 2, dur: s(1, 1, 6) },
      ],
    },
    passive: { pulse: { dt: 'magic', r: 1, v: { ap: s(12, 18, 150) }, heal: { hp: s(2.5, 2.5, 2.5), ap: s(20, 25, 100) } } },
  },
  {
    id: 'aphelios', name: 'Aphelios', cost: 4, traits: ['lunar', 'rapidfire'], role: 'carry', flavor: 'AD',
    hp: s(850, 1530, 3254), ad: ad(60), as: 0.8, armor: 40, mr: 40, range: 4, manaStart: 20, manaMax: 70,
    ability: {
      name: "Moonlight's Onslaught",
      text: 'Swipe the target 5 times over 2s for 70/105/850% AD physical damage each, then fire a blast for 450/675/5000% AD + 40/60/225 AP physical damage split among enemies within 2 hexes.',
      simNote: 'Swipes as one hit; blast split in a 2-hex area.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(350, 525, 4250) } },
        { t: 'dmg', dt: 'physical', tgt: 'aoe', r: 2, split: true, v: { ad: s(450, 675, 5000), ap: s(40, 60, 225) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },
  {
    id: 'brambleback', name: 'Brambleback', cost: 4, traits: ['riftbeast', 'ravager'], role: 'fighter', flavor: 'AD',
    hp: s(1100, 1980, 4064), ad: ad(120), as: 0.55, armor: 65, mr: 65, range: 1, manaStart: 0, manaMax: 40,
    ability: {
      name: 'Crimson Fury',
      text: 'For 8s gain 100/100/300% bonus AD and ignore 30% + 10% AP Armor (18.5 mid-patch). Passive: on target death, leap at the next target for 135/205/1000% AD. Red Buff: attacks Burn and heal 4% max HP (18.5b).',
      simNote: 'Leap passive ignored. Armor ignore = 30% + 10% × AP/100. Red Buff heal modelled as on-hit heal.',
      effects: [
        { t: 'buff', stat: 'adPct', v: s(100, 100, 300), dur: 8 },
        { t: 'buff', stat: 'armorPen', v: s(30, 30, 30), dur: 8 },
        { t: 'buff', stat: 'armorPen', v: s(10, 10, 10), dur: 8, scaleAp: true },
      ],
    },
    passive: { onHitHeal: { hp: s(4, 4, 4) } },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Includes the 22 and 27 Oct mid-patch changes.',
  },
  {
    id: 'ezreal', name: 'Ezreal', cost: 4, traits: ['elderwood', 'executioner'], role: 'caster', flavor: 'AD',
    hp: s(850, 1530, 2754), ad: ad(45), as: 0.75, armor: 40, mr: 40, range: 4, manaStart: 0, manaMax: 30,
    ability: {
      name: "Forest's Flurry",
      text: 'Blink away and deal 270/405/1200% AD physical damage (18.4); gain 30/30/100% Attack Speed. Every 4th cast: a blast through the largest group for 385/580/2500% AD.',
      simNote: 'Every-4th-cast blast ignored. AS gain stacks per cast.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(270, 405, 1200) } },
        { t: 'buff', stat: 'asPct', v: s(30, 30, 100) },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). AS gain: tft.tools/op.gg 30/30/100%, wiki 25/25/100% AP.',
  },
  {
    id: 'lillia', name: 'Lillia', cost: 4, traits: ['fae', 'defender'], role: 'tank', flavor: 'AP',
    hp: s(1300, 2340, 4712), ad: ad(40), as: 0.65, armor: 60, mr: 60, range: 1, manaStart: 40, manaMax: 140,
    ability: {
      name: 'Lilting Lullaby',
      text: 'Heal 350/525/800 and send 4 butterflies at nearby enemies for 90/135/2000 magic damage, putting them to Sleep for 1.5/1.75/8s (woken by 1000 damage).',
      simNote: 'Sleep modelled as a stun.',
      effects: [
        { t: 'heal', v: { ap: s(350, 525, 800) } },
        { t: 'dmg', dt: 'magic', tgt: 'nearestN', n: 4, v: { ap: s(90, 135, 2000) } },
        { t: 'stun', tgt: 'nearestN', n: 4, dur: s(1.5, 1.75, 8) },
      ],
    },
  },
  {
    id: 'malphite', name: 'Malphite', cost: 4, traits: ['blackthorn', 'monolith'], role: 'tank', flavor: 'AP',
    hp: s(1300, 2340, 4712), ad: ad(70), as: 0.55, armor: 70, mr: 70, range: 1, manaStart: 30, manaMax: 80,
    ability: {
      name: 'Petrified Bark',
      text: 'Gain a 735/885/2000 AP Shield for 4s (18.5). When it breaks, deal 40/60/2000 AP + 30/45/999% Armor + 30/45/999% MR magic damage within 2/2/3 hexes.',
      simNote: 'Burst lands when the shield expires (4s) with the 1★ armor scaling baked in.',
      effects: [
        { t: 'shield', v: { ap: s(735, 885, 2000) }, dur: 4 },
        { t: 'dmg', dt: 'magic', tgt: 'around', r: 2, delay: 4, v: { ap: s(40, 60, 2000), arm: s(30, 45, 999), mr: s(30, 45, 999) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). ',
  },
  {
    id: 'morgana', name: 'Morgana', cost: 4, traits: ['coven', 'invoker'], role: 'fighter', flavor: 'AP',
    hp: s(1100, 1980, 4064), ad: ad(45), as: 0.75, armor: 60, mr: 60, range: 2, manaStart: 0, manaMax: 65,
    ability: {
      name: 'Withering Curse',
      text: 'Passive: 25% Omnivamp. Blast up to 3 nearby enemies for 70/105/500 magic damage (18.5) and Curse them for 4s, creating a zone dealing 33/50/500 per second. Cursed enemies take 25/38/240 bonus damage.',
      simNote: 'Curse bonus ignored; zone = 4s DoT around target.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'nearestN', n: 3, v: { ap: s(70, 105, 500) } },
        { t: 'dot', dt: 'magic', tgt: 'aoe', r: 1, dur: 4, v: { ap: s(132, 200, 2000) } },
      ],
    },
    passive: { omnivamp: 25 },
  },
  {
    id: 'nidalee', name: 'Nidalee', cost: 4, traits: ['primal', 'adaptor'], role: 'carry', flavor: 'AP',
    hp: s(850, 1530, 3254), ad: s(35, 53, 79), as: 0.8, armor: 30, mr: 30, range: 5, manaStart: 0, manaMax: 45,
    ability: {
      name: 'Javelin Toss',
      text: 'AP form: next 3 attacks gain 150% AS and become javelins dealing 185/275/2000 magic damage; the 3rd hits the farthest enemy for 330/500/3000. AD form: cougar assassin.',
      simNote: 'AP form; 3 empowered attacks averaging the javelin values.',
      effects: [
        { t: 'buff', stat: 'asPct', v: s(150, 150, 150), dur: 2.5 },
        { t: 'empower', hits: 3, dt: 'magic', replace: true, v: { ap: s(233, 350, 2333) } },
      ],
    },
    dataNote: 'Range: AP (javelin) form 5 per tft.tools/tactics.tools; metabot shows 1 (cougar form).',
  },
  {
    id: 'sentinel', name: 'Sentinel', cost: 4, traits: ['riftbeast', 'vanguard', 'invoker'], role: 'tank', flavor: 'AP',
    hp: s(1300, 2340, 4712), ad: ad(75), as: 0.6, armor: 60, mr: 60, range: 1, manaStart: 60, manaMax: 150,
    ability: {
      name: 'Azure Shockwave',
      text: 'Gain a 375/475/2000 + 10% max HP Shield for 4s (18.5), send a fissure toward the most enemies for 100/150/3500 magic damage, knocking up for 0.5s (18.5) and Mana Reaving. Blue Buff: allies gain 2 Mana Regen per cast.',
      simNote: 'Fissure approximated as densest cluster; Mana Reave ignored.',
      effects: [
        { t: 'shield', v: { ap: s(375, 475, 2000), hp: s(10, 10, 10) }, dur: 4 },
        { t: 'dmg', dt: 'magic', tgt: 'densest', r: 1, v: { ap: s(100, 150, 3500) } },
        { t: 'stun', tgt: 'densest', r: 1, dur: s(0.5, 0.5, 0.5) },
        { t: 'buffTeam', stat: 'manaRegen', v: s(2, 2, 2) },
      ],
    },
  },
  {
    id: 'sett', name: 'Sett', cost: 4, traits: ['blossom', 'brawler'], role: 'tank', flavor: 'AD',
    hp: s(1200, 2160, 4388), ad: ad(80), as: 0.65, armor: 60, mr: 60, range: 1, manaStart: 60, manaMax: 135,
    ability: {
      name: 'Haymaker',
      text: 'Passive: first time below 40% HP gain 100 Mana. Active: heal 12% max HP + 250/300/2000 AP (18.5), then punch a large cone for 150/225/5000% AD + 6% max HP physical damage.',
      simNote: 'Cone = target + 1 hex. Heal % component applied to missing HP.',
      effects: [
        { t: 'heal', v: { ap: s(250, 300, 2000), hp: s(12, 12, 12) } },
        { t: 'dmg', dt: 'physical', tgt: 'aoe', r: 1, v: { ad: s(150, 225, 5000), hp: s(6, 6, 6) } },
      ],
    },
    passive: { lowHpMana: { th: 0.4, mana: 100 } },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded; heal is % max HP, not missing HP.',
  },
  {
    id: 'sivir', name: 'Sivir', cost: 4, traits: ['primal', 'hunter'], role: 'caster', flavor: 'AD',
    hp: s(850, 1530, 3254), ad: ad(50), as: 0.8, armor: 40, mr: 40, range: 4, manaStart: 0, manaMax: 40,
    ability: {
      name: 'Boomerang Blade',
      text: 'Throw a crossblade at the target for 220/330/1050% AD + 15/20/100 AP physical damage (18.5); it bounces 8 times for 18% of the initial hit.',
      simNote: 'Bounces spread round-robin among enemies within 2 hexes of the target.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(220, 330, 1050), ap: s(15, 20, 100) } },
        { t: 'dmg', dt: 'physical', tgt: 'aoe', r: 2, hits: 8, v: { ad: s(39.6, 59.4, 189), ap: s(2.7, 3.6, 18) } },
      ],
    },
    dataNote: 'Damage verified by both agents (was mis-encoded). 3★ value is pre-18.5 (no newer source).',
  },
  {
    id: 'soraka', name: 'Soraka', cost: 4, traits: ['flora_fatalis', 'executioner'], role: 'caster', flavor: 'AP',
    hp: s(850, 1530, 3254), ad: ad(30), as: 0.75, armor: 40, mr: 40, range: 4, manaStart: 0, manaMax: 30,
    ability: {
      name: 'Starcall',
      text: 'Call a star on the target for 235/355/1000 magic damage (18.5). If a star already fell on them, call 3 more stars for 110/165/1000 magic damage each (18.5).',
      simNote: 'Marks the target; re-casting on a marked target adds 3 stars.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(235, 355, 1000) } },
        { t: 'markBonus', dt: 'magic', v: { ap: s(330, 495, 3000) } },
      ],
    },
  },
  {
    id: 'zyra', name: 'Zyra', cost: 4, traits: ['summoner', 'thornmaiden'], role: 'caster', flavor: 'AP',
    hp: s(850, 1530, 3254), ad: ad(40), as: 0.75, armor: 40, mr: 40, range: 4, manaStart: 0, manaMax: 45,
    ability: {
      name: 'Rampant Growth',
      text: 'Spawn 2/2/4 plants that attack the nearest enemy 10 times for 35/53/225 magic damage each.',
      simNote: 'Plants modelled as a 5s DoT on the target.',
      effects: [{ t: 'dot', dt: 'magic', tgt: 'target', dur: 5, v: { ap: s(700, 1060, 9000) } }],
    },
    dataNote: 'Start mana not listed by sources; 0 assumed.',
  },

  // ───────────────────────────── 5 cost ─────────────────────────────
  {
    id: 'alune', name: 'Alune', cost: 5, traits: ['attuned', 'lunar', 'spellweaver'], role: 'caster', flavor: 'AP',
    hp: s(900, 1620, 6916), ad: ad(40), as: 0.85, armor: 45, mr: 45, range: 4, manaStart: 0, manaMax: 35,
    ability: {
      name: 'Moonfall',
      text: 'Rain 9 moonshards split among the 3 nearest enemies for 58/88/500 magic damage each (18.5). Full moon: crash the moon for 2350/3600/7500 split among all enemies.',
      simNote: 'Full-moon cast ignored; each of 3 nearest takes 3 shards.',
      effects: [{ t: 'dmg', dt: 'magic', tgt: 'nearestN', n: 3, v: { ap: s(174, 264, 1500) } }],
    },
  },
  {
    id: 'ashe', name: 'Ashe', cost: 5, traits: ['blossom', 'hunter'], role: 'caster', flavor: 'AD',
    hp: s(900, 1620, 6916), ad: ad(75), as: 0.8, armor: 45, mr: 45, range: 6, manaStart: 0, manaMax: 80,
    ability: {
      name: 'Spirit Rift',
      text: 'Fire an arrow through the most enemies for 465/700/1000% AD physical damage (-80/80/40% per enemy, min 20%), leaving a 3s rift dealing 11/16% AD + 2/3/20 + 1.5% max HP physical damage per second and slowing.',
      simNote: 'Line approximated; rift = 4s DoT around the target (max-HP part ignored).',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'line', falloff: 0.8, v: { ad: s(465, 700, 1000) } },
        { t: 'dot', dt: 'physical', tgt: 'aoe', r: 1, dur: 3, v: { ad: s(33, 48, 600), flat: s(6, 9, 60) } },
      ],
    },
    dataNote: 'Arrow verified by both agents (was mis-encoded). Rift: 3s per 18.2 mid-patch, 11/16% AD per 18.5; 3★ rift values uncertain; max-HP part not simulated.',
  },
  {
    id: 'draven', name: 'Draven', cost: 5, traits: ['bounty_seeker'], role: 'carry', flavor: 'AD',
    hp: s(900, 1620, 6916), ad: ad(48), as: 0.85, armor: 45, mr: 45, range: 6, manaStart: 0, manaMax: 110,
    ability: {
      name: 'Whirling Death',
      text: 'Passive: attacks bleed for 150/225/3000% AD physical over 12s (18.4). Active: two axes at the enemy with most bleeds (100/150/400% AD each), consuming bleeds instantly; axes return for 30/45/100% AD.',
      simNote: 'Axes hit the current target and pop its remaining bleeds.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'target', v: { ad: s(200, 300, 800) } },
        { t: 'consumeDots' },
      ],
    },
    passive: { onHitDot: { dt: 'physical', dur: 12, v: { ad: s(150, 225, 3000) } } },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: values are % AD, not flat.',
  },
  {
    id: 'elderdragon', name: 'Elder Dragon', cost: 5, traits: ['apex_predator', 'riftbeast'], role: 'fighter', flavor: 'AD',
    hp: s(1800, 3240, 9832), ad: ad(125), as: 0.5, armor: 75, mr: 75, range: 2, manaStart: 20, manaMax: 60,
    ability: {
      name: 'Heat Without Equal',
      text: 'Passive: attacks deal 75/75/100% damage to enemies adjacent to the target; executes enemies below 12% HP. First cast: fly up (invulnerable), Stun all enemies 1.25s, gain 15% Omnivamp, ignite. Then Flame Breath: 285/435/7000% AD + 20/30/200 AP physical in a line.',
      simNote: 'Ignite ignored. First cast = stun all + omnivamp; every cast = Flame Breath.',
      effects: [
        { t: 'invulnerable', dur: 1.5, once: true },
        { t: 'stun', tgt: 'allEnemies', dur: s(1.25, 1.25, 99), once: true },
        { t: 'buff', stat: 'omnivamp', v: s(15, 15, 100), once: true },
        { t: 'dmg', dt: 'physical', tgt: 'line', falloff: 0.2, v: { ad: s(285, 435, 7000), ap: s(20, 30, 200) } },
      ],
    },
    passive: { cleavePct: 75, executeBelow: 0.12 },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total.',
  },
  {
    id: 'gnar', name: 'Gnar', cost: 5, traits: ['brawler', 'elderwood', 'sprykin'], role: 'specialist', flavor: 'AD',
    hp: s(900, 1620, 6916), ad: ad(100), as: 0.9, armor: 55, mr: 55, range: 2, manaStart: 0, manaMax: 70,
    manaPerAttack: 5, manaRegen: 5,
    ability: {
      name: 'Rage Gene',
      text: 'Rage (5/s + 5 per attack). Transform into Mega Gnar: leap into the largest group within 3 hexes for 100/150/2000 physical within 2 hexes, Shred 15/20/250, Stun 1s, gain 400/600/15000 HP. Then Grab n\' Throw: 380/570/9000 to the target, 135/205/4500 to enemies passed.',
      simNote: 'Transform on first cast; Grab n\' Throw on later casts.',
      effects: [
        { t: 'dmg', dt: 'physical', tgt: 'densest', r: 2, once: true, v: { ad: s(100, 150, 2000) } },
        { t: 'stun', tgt: 'densest', r: 2, dur: s(1, 1, 15), once: true },
        { t: 'maxHp', v: { flat: s(400, 600, 15000) }, once: true },
        { t: 'dmg', dt: 'physical', tgt: 'target', afterFirst: true, v: { ad: s(380, 570, 9000) } },
        { t: 'dmg', dt: 'physical', tgt: 'adjacentToTarget', r: 1, afterFirst: true, v: { ad: s(135, 205, 4500) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: damage was mis-encoded as a flat total. Rage = mana (5/s + 5 per attack).',
  },
  {
    id: 'ivern', name: 'Ivern', cost: 5, traits: ['greenfather'], role: 'caster', flavor: 'AP',
    hp: s(1000, 1800, 7240), ad: ad(60), as: 0.8, armor: 55, mr: 55, range: 3, manaStart: 50, manaMax: 80,
    ability: {
      name: 'Greenfather',
      text: 'Shield 2/2/10 allies for 185/350/3000 and grant 10/15/100% Damage Amp for 6s; after 6s deal 155/235/2000 magic damage to enemies adjacent to them.',
      simNote: 'Delayed burst lands around Ivern\'s target.',
      effects: [
        { t: 'shieldAlly', who: 'lowestHpAllies', n: 2, v: { ap: s(185, 350, 3000) }, dur: 6 },
        { t: 'buffAlly', who: 'lowestHpAllies', n: 2, stat: 'damageAmp', v: s(10, 15, 100), dur: 6 },
        { t: 'dmg', dt: 'magic', tgt: 'aoe', r: 1, delay: 6, v: { ap: s(155, 235, 2000) } },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: start mana 0 → 50.',
  },
  {
    id: 'kennen', name: 'Kennen', cost: 5, traits: ['executioner', 'inferno'], role: 'reaper', flavor: 'AP',
    hp: s(1200, 2160, 7888), ad: ad(50), as: 0.85, armor: 60, mr: 60, range: 2, manaStart: 0, manaMax: 40,
    ability: {
      name: 'Firestorm',
      text: 'Gain 15% AP per Burning enemy and a 230/300/3000 Shield for 2.5s. Rush through a group for 80/120/1500 magic damage, then create a 2-hex storm dealing 475/715/5000 split over 2s.',
      simNote: 'Burning AP gain ignored.',
      effects: [
        { t: 'shield', v: { ap: s(230, 300, 3000) }, dur: 2.5 },
        { t: 'dmg', dt: 'magic', tgt: 'densest', r: 1, v: { ap: s(80, 120, 1500) } },
        { t: 'dot', dt: 'magic', tgt: 'densest', r: 2, dur: 2, split: true, v: { ap: s(475, 715, 5000) } },
      ],
    },
  },
  {
    id: 'lux', name: 'Lux', cost: 5, traits: ['avatar'], role: 'caster', flavor: 'AP',
    hp: s(900, 1620, 6916), ad: ad(40), as: 0.8, armor: 40, mr: 40, range: 6, manaStart: 20, manaMax: 70,
    ability: {
      name: 'Final Spark',
      text: 'Fire a laser at the largest group for 375/565/6500 magic damage (falling off 25% per enemy). Passive: allies sharing a trait gain 3 Mana when she casts. (Avatar: chosen trait counts twice.)',
      simNote: 'Base Lux only — Avatar trait choice not simulated.',
      effects: [{ t: 'dmg', dt: 'magic', tgt: 'line', falloff: 0.25, falloffMin: 0.4, v: { ap: s(375, 565, 6500) } }],
    },
  },
  {
    id: 'maokai', name: 'Maokai', cost: 5, traits: ['juggernaut', 'old_growth'], role: 'tank', flavor: 'AP',
    hp: s(1150, 2070, 7726), ad: ad(80), as: 0.65, armor: 60, mr: 60, range: 1, manaStart: 30, manaMax: 100,
    ability: {
      name: 'Sow the Seeds',
      text: 'Deal 69/124/3726 magic damage to the target and restore 330/400/2000 + 10% missing HP. Passive: saplings jump at enemies after blocking damage and on death.',
      simNote: 'Saplings not simulated.',
      effects: [
        { t: 'dmg', dt: 'magic', tgt: 'target', v: { ap: s(69, 124, 3726) } },
        { t: 'heal', v: { ap: s(330, 400, 2000) }, missingHpPct: 10 },
      ],
    },
    dataNote: 'Verified by 2 independent research agents (27 Oct 2026). Fixed: max mana 90 → 100.',
  },
  {
    id: 'taric', name: 'Taric', cost: 5, traits: ['emerald_aspect', 'vanguard'], role: 'tank', flavor: 'AP',
    hp: s(1300, 2340, 8212), ad: ad(55), as: 0.75, armor: 70, mr: 70, range: 1, manaStart: 0, manaMax: 65,
    ability: {
      name: 'Emerald Radiance',
      text: 'Passive: first time Taric or his pair drops below 50% HP, shield allies within 3 hexes. Active: restore 275/450/3000 HP; Taric and his pair deal 130/200/1000 bonus magic damage on their next 2 attacks (18.5). Resists 70 (18.5).',
      simNote: 'Pairing and passive shield not simulated.',
      effects: [
        { t: 'heal', v: { ap: s(275, 450, 3000) } },
        { t: 'empower', hits: 2, dt: 'magic', v: { ap: s(130, 200, 1000) } },
      ],
    },
    dataNote: 'Start mana not listed; 0 assumed.',
  },
];

/** Every Set 18 unit starts with 100 Ability Power; it is stored per unit so designers can edit it. */
export const BASE_AP = 100;

export const UNIT_MAP: Record<string, UnitDef> = Object.fromEntries(UNITS.map((u) => [u.id, { ...u, ap: u.ap ?? BASE_AP }]));
