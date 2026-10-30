import type { TraitDef } from '../sim/types';

/*
 * Set 18 traits (36). Breakpoints/effects from tftraits.com/set18 (retrieved 26 Oct 2026),
 * with patch 18.5 changes applied (esports.gg 18.5 notes: Blackthorn, Elderwood 9, Fae,
 * Flora Fatalis, Rapidfire, Riftbeast 7).
 *
 * `status` tells the designer how faithfully the sandbox models the trait:
 *   simulated      – modelled as described
 *   approximated   – combat-relevant part modelled with stated simplifications
 *   not-simulated  – economy / shop / summons / player choice; counted but no effect
 * Params marked `assumed` are values the sources did not state precisely.
 */
export const TRAITS: TraitDef[] = [
  {
    id: 'adaptor', name: 'Adaptor', kind: 'class', breakpoints: [2, 3, 4],
    description: 'Adaptors use whichever of AD or AP is higher and gain +25/35/50%.',
    params: [
      { key: 'adPct', label: 'Bonus AD (%)', values: [25, 35, 50], unit: '%', scope: 'members' },
      { key: 'apFlat', label: 'Bonus AP', values: [25, 35, 50], unit: 'flat', scope: 'members' },
    ],
    status: 'approximated', simNote: 'Both AD and AP bonuses are granted (the real trait picks the higher one).',
  },
  {
    id: 'apex_predator', name: 'Apex Predator', kind: 'unique', breakpoints: [1],
    description: 'Elder Dragon takes 2 board slots and counts as +2 Riftbeast.',
    params: [{ key: 'riftbeastBonus', label: 'Extra Riftbeast count', values: [2], unit: 'flat', scope: 'special' }],
    status: 'simulated', simNote: 'Adds +2 to the Riftbeast count. Board-slot cost ignored.',
  },
  {
    id: 'attuned', name: 'Attuned', kind: 'unique', breakpoints: [1],
    description: 'Alune shifts the moon phase after each cast: at or below half moon +5% Durability (18.5), above +7% Damage Amp.',
    params: [
      { key: 'durability', label: 'Durability while waning (%)', values: [5], unit: '%', scope: 'special' },
      { key: 'damageAmp', label: 'Damage Amp while waxing (%)', values: [7], unit: '%', scope: 'special' },
    ],
    status: 'approximated', simNote: 'Alternates between the two bonuses on each cast, starting with Durability.',
  },
  {
    id: 'avatar', name: 'Avatar', kind: 'unique', breakpoints: [1],
    description: 'Avatars turn other Avatars in the shop into their chosen trait; that trait counts twice.',
    params: [], status: 'not-simulated', simNote: 'Shop mechanic.',
  },
  {
    id: 'blackthorn', name: 'Blackthorn', kind: 'origin', breakpoints: [2, 4, 6],
    description: 'An ally on the Blackthorn hex is sacrificed to give the team max Health (175/350/600). 18.5: 6-piece enhanced bonus 60%→50%.',
    params: [{ key: 'hpFlat', label: 'Team bonus Health', values: [175, 350, 600], unit: 'flat', scope: 'team' }],
    status: 'approximated', simNote: 'Team Health bonus granted without sacrificing a unit.',
  },
  {
    id: 'blossom', name: 'Blossom', kind: 'origin', breakpoints: [3, 5, 7, 9, 11],
    description: 'Upgrades Wisps (shop). Blossom champions gain AD/AP and 10% max Health.',
    params: [
      { key: 'adPct', label: 'Bonus AD (%)', values: [12, 30, 50, 55, 100], unit: '%', scope: 'members' },
      { key: 'apFlat', label: 'Bonus AP', values: [12, 30, 50, 55, 100], unit: 'flat', scope: 'members' },
      { key: 'hpPct', label: 'Bonus max Health (%)', same: true, values: [10], unit: '%', scope: 'members' },
    ],
    status: 'approximated', simNote: 'Combat stats only; Wisp economy not simulated.',
  },
  {
    id: 'bounty_seeker', name: 'Bounty Seeker', kind: 'unique', breakpoints: [1],
    description: 'Choose a bounty; Draven progresses it.', params: [], status: 'not-simulated', simNote: 'Meta-progression.',
  },
  {
    id: 'brawler', name: 'Brawler', kind: 'class', breakpoints: [2, 4, 6],
    description: 'Team gains 120 max Health; Brawlers gain +25/40/65% max Health.',
    params: [
      { key: 'hpFlat', label: 'Team bonus Health', same: true, values: [120], unit: 'flat', scope: 'team' },
      { key: 'hpPct', label: 'Brawler bonus Health (%)', values: [25, 40, 65], unit: '%', scope: 'members' },
    ],
    status: 'simulated', simNote: 'As described.',
  },
  {
    id: 'caustic', name: 'Caustic', kind: 'unique', breakpoints: [1],
    description: "Caustic damage Shreds and Sunders enemies by 30% for 4 seconds.",
    params: [
      { key: 'shredPct', label: 'Armor & MR reduction (%)', values: [30], unit: '%', scope: 'members' },
      { key: 'duration', label: 'Duration (s)', values: [4], unit: 's', scope: 'members' },
    ],
    status: 'simulated', simNote: 'Every damage instance from the Caustic unit refreshes the reduction.',
  },
  {
    id: 'coven', name: 'Coven', kind: 'origin', breakpoints: [3, 4, 5, 7],
    description: 'Gain Essence on kills and losses (economy).', params: [], status: 'not-simulated', simNote: 'Economy trait.',
  },
  {
    id: 'defender', name: 'Defender', kind: 'class', breakpoints: [2, 4, 6],
    description: 'Team gains 12 Armor and Magic Resist; Defenders gain 25/60/115 instead.',
    params: [
      { key: 'teamResist', label: 'Team Armor & MR', same: true, values: [12], unit: 'flat', scope: 'special' },
      { key: 'memberResist', label: 'Defender Armor & MR', values: [25, 60, 115], unit: 'flat', scope: 'special' },
    ],
    status: 'simulated', simNote: 'Team gets the team value; Defenders get the Defender value instead (verified by both research agents).',
  },
  {
    id: 'eclipse', name: 'Eclipse', kind: 'unique', breakpoints: [1],
    description: 'Activated by fielding 3 Solar and 3 Lunar. After 8s of combat, kill the lowest-Health enemy every 3.5s.',
    params: [
      { key: 'startDelay', label: 'First execution after (s)', values: [8], unit: 's', scope: 'special' },
      { key: 'interval', label: 'Execution interval (s)', values: [3.5], unit: 's', scope: 'special' },
    ],
    status: 'simulated', simNote: 'Active when ≥3 Solar and ≥3 Lunar unique units are on the team.',
  },
  {
    id: 'elderwood', name: 'Elderwood', kind: 'origin', breakpoints: [3, 5, 7, 9, 11],
    description: 'Places Elderwood plants (Stonebark Tree, Lifebloom, Deepwood Protector) that grow stronger. 18.5: 9-piece summon Health 140%→125%.',
    params: [], status: 'not-simulated', simNote: 'Plant summons are not simulated yet.',
  },
  {
    id: 'emerald_aspect', name: 'Emerald Aspect', kind: 'unique', breakpoints: [1],
    description: "Pair an ally with Taric to share his ability bonuses.", params: [], status: 'not-simulated', simNote: 'Pairing not simulated.',
  },
  {
    id: 'executioner', name: 'Executioner', kind: 'class', breakpoints: [2, 3, 4],
    description: 'Executioners gain Precision and 15% Critical Strike Chance (2); enemies bleed for bonus true damage (3); bleed rises (4).',
    params: [
      { key: 'critChance', label: 'Crit chance (%)', same: true, values: [15], unit: '%', scope: 'members' },
      { key: 'bleedPct', label: 'Bleed (bonus true dmg % of damage dealt)', from: 1, values: [0, 25, 35], unit: '%', scope: 'members' },
    ],
    status: 'approximated', simNote: 'Precision ignored; the 3 s bleed is applied instantly as bonus true damage (25/35% verified by both agents).',
  },
  {
    id: 'fae', name: 'Fae', kind: 'origin', breakpoints: [2, 4],
    description: 'Damage, healing and shielding attract Pixies granting AD/AP and a heal at low Health (18.5: 3/5%).',
    params: [
      { key: 'adPct', label: 'Team bonus AD (%)', values: [4.5, 7], unit: '%', scope: 'team' },
      { key: 'apFlat', label: 'Team bonus AP', values: [4.5, 7], unit: 'flat', scope: 'team' },
      { key: 'lowHpHealPct', label: 'Heal below 50% HP (% max HP)', values: [3, 5], unit: '%', scope: 'team' },
    ],
    status: 'approximated', simNote: 'Pixie thresholds ignored; bonuses granted at combat start.',
  },
  {
    id: 'flora_fatalis', name: 'Flora Fatalis', kind: 'origin', breakpoints: [1, 2],
    description: 'Takedowns grant 10 Mana (1); also heal the lowest-Health ally for 7% max Health (2, 18.5).',
    params: [
      { key: 'takedownMana', label: 'Mana per takedown', same: true, values: [10], unit: 'mana', scope: 'members' },
      { key: 'healPct', label: 'Heal lowest ally (% max HP)', from: 1, values: [0, 7], unit: '%', scope: 'team' },
    ],
    status: 'simulated', simNote: 'As described.',
  },
  {
    id: 'greenfather', name: 'Greenfather', kind: 'unique', breakpoints: [1],
    description: 'Gain seeds when Ivern casts; every 5 seeds grow a buffing hex.', params: [], status: 'not-simulated', simNote: 'Board-hex mechanic.',
  },
  {
    id: 'hunter', name: 'Hunter', kind: 'class', breakpoints: [2, 3, 4, 5],
    description: 'Hunters gain +20/30/40/60% AD. Hunters that keep their target gain 10% Damage Amp after 3 seconds.',
    params: [
      { key: 'adPct', label: 'Bonus AD (%)', values: [20, 30, 40, 60], unit: '%', scope: 'members' },
      { key: 'lockAmp', label: 'Damage Amp after 3s on same target (%)', same: true, values: [10], unit: '%', scope: 'members' },
    ],
    status: 'simulated', simNote: 'Damage Amp applies once a Hunter has attacked the same target for 3s.',
  },
  {
    id: 'inferno', name: 'Inferno', kind: 'origin', breakpoints: [2, 3, 5, 7],
    description: 'Burn and Wound enemies; ignite shop slots after combat.',
    params: [
      { key: 'burnPct', label: 'Burn (% max HP true dmg / s)', values: [1, 1, 3, 4], unit: '%', scope: 'members' },
      { key: 'woundPct', label: 'Wound (healing reduction %)', same: true, values: [33], unit: '%', scope: 'members', assumed: true },
    ],
    status: 'approximated', simNote: 'Inferno damage applies a 3s Burn + Wound. Shop ignite not simulated.',
  },
  {
    id: 'invoker', name: 'Invoker', kind: 'class', breakpoints: [2, 3, 4, 5],
    description: 'Team gains Mana Regen; Invokers gain more.',
    params: [
      { key: 'teamRegen', label: 'Team Mana Regen / s', values: [1, 1, 2, 2], unit: 'mana', scope: 'team' },
      { key: 'memberRegen', label: 'Invoker Mana Regen / s', values: [3, 4, 6, 8], unit: 'mana', scope: 'members' },
    ],
    status: 'simulated', simNote: 'Invokers receive the higher value instead of the team value.',
  },
  {
    id: 'juggernaut', name: 'Juggernaut', kind: 'class', breakpoints: [2, 4, 6],
    description: 'Team gains Durability; Juggernauts gain more.',
    params: [
      { key: 'teamDurability', label: 'Team Durability (%)', values: [4, 4, 8], unit: '%', scope: 'team' },
      { key: 'memberDurability', label: 'Juggernaut Durability (%)', values: [20, 30, 42], unit: '%', scope: 'members' },
    ],
    status: 'simulated', simNote: 'Juggernauts receive the higher value instead of the team value.',
  },
  {
    id: 'lunar', name: 'Lunar', kind: 'origin', breakpoints: [2, 3, 4, 5],
    description: 'Lunar champions and adjacent allies gain Attack Speed and AP; Lunar champions gain double.',
    params: [
      { key: 'asPct', label: 'Attack Speed (%)', values: [7, 10, 14, 18], unit: '%', scope: 'special' },
      { key: 'apFlat', label: 'AP', values: [7, 12, 16, 20], unit: 'flat', scope: 'special' },
    ],
    status: 'simulated', simNote: 'Adjacency is checked at combat start — positioning matters.',
  },
  {
    id: 'monolith', name: 'Monolith', kind: 'unique', breakpoints: [1],
    description: 'Gain 10 Armor and MR for each enemy targeting this unit.',
    params: [{ key: 'perTargeter', label: 'Armor & MR per enemy targeting', values: [10], unit: 'flat', scope: 'members' }],
    status: 'simulated', simNote: 'Recomputed every tick.',
  },
  {
    id: 'old_growth', name: 'Old Growth', kind: 'unique', breakpoints: [1],
    description: 'Each enemy death within 3/10/10 hexes gives the strongest Old Growth 30/100/1000 permanent max Health (by Maokai star).',
    params: [
      { key: 'hp1', label: 'Max Health per death (Maokai 1★)', values: [30], unit: 'flat', scope: 'special' },
      { key: 'hp2', label: 'Max Health per death (Maokai 2★)', values: [100], unit: 'flat', scope: 'special' },
      { key: 'hp3', label: 'Max Health per death (Maokai 3★)', values: [1000], unit: 'flat', scope: 'special' },
      { key: 'r1', label: 'Radius in hexes (1★)', values: [3], unit: 'flat', scope: 'special' },
      { key: 'r2', label: 'Radius in hexes (2★)', values: [10], unit: 'flat', scope: 'special' },
      { key: 'r3', label: 'Radius in hexes (3★)', values: [10], unit: 'flat', scope: 'special' },
    ],
    status: 'simulated', simNote: 'Gains Health in combat (not carried between fights).',
  },
  {
    id: 'primal', name: 'Primal', kind: 'origin', breakpoints: [2, 4],
    description: 'Choose a Primal Blessing (2), then a second one (4).', params: [], status: 'not-simulated', simNote: 'Player choice not simulated.',
  },
  {
    id: 'rapidfire', name: 'Rapidfire', kind: 'class', breakpoints: [2, 3, 4, 5],
    description: 'Team gains 10% Attack Speed. Rapidfire champions gain AS per attack (18.5: 3/5/7/10%), up to 10 stacks.',
    params: [
      { key: 'teamAs', label: 'Team Attack Speed (%)', same: true, values: [10], unit: '%', scope: 'team' },
      { key: 'asPerAttack', label: 'AS per attack (%)', values: [3, 5, 7, 10], unit: '%', scope: 'members' },
      { key: 'maxStacks', label: 'Max stacks', same: true, values: [10], unit: 'stacks', scope: 'members' },
    ],
    status: 'simulated', simNote: 'As described.',
  },
  {
    id: 'ravager', name: 'Ravager', kind: 'class', breakpoints: [2, 4, 6],
    description: 'Ravagers gain 10% Omnivamp and 12/25/40% bonus damage, doubled against units below 50% Health.',
    params: [
      { key: 'omnivamp', label: 'Omnivamp (%)', same: true, values: [10], unit: '%', scope: 'members' },
      { key: 'damageAmp', label: 'Damage Amp (%)', values: [12, 25, 40], unit: '%', scope: 'members' },
    ],
    status: 'simulated', simNote: 'Doubling below 50% target Health included.',
  },
  {
    id: 'riftbeast', name: 'Riftbeast', kind: 'origin', breakpoints: [3, 5, 7, 10],
    description: 'Alpha Mark (3); overrun shops every 3 combats (5); Riftbeasts grow every 5 seconds (7, 18.5: AD/AP 6%→5%); +2 team size (10).',
    params: [
      { key: 'growthPct', label: 'AD & AP gained every 5 s (%)', from: 2, values: [0, 0, 5, 5], unit: '%', scope: 'members' },
    ],
    status: 'approximated', simNote: 'Only the 7+ growth effect is combat-relevant here; Alpha Mark and shop effects not simulated.',
  },
  {
    id: 'rival', name: 'Rival', kind: 'origin', breakpoints: [1, 2],
    description: 'Only your strongest Rival is active; Rivals collect takedowns.', params: [], status: 'not-simulated', simNote: 'Progression mechanic.',
  },
  {
    id: 'solar', name: 'Solar', kind: 'origin', breakpoints: [3],
    description: 'Team gains a 5% max Health Shield and 8% bonus magic damage, +1% each per unique 3-star.',
    params: [
      { key: 'shieldPct', label: 'Start Shield (% max HP)', values: [5], unit: '%', scope: 'team' },
      { key: 'magicAmp', label: 'Bonus magic damage (%)', values: [8], unit: '%', scope: 'team' },
      { key: 'perThreeStar', label: 'Per unique 3★ Solar (+%)', values: [1], unit: '%', scope: 'team' },
    ],
    status: 'approximated', simNote: 'Higher 3-star thresholds (AS/resists, true damage, ascension) not simulated.',
  },
  {
    id: 'spellweaver', name: 'Spellweaver', kind: 'class', breakpoints: [2, 4, 6],
    description: 'Team gains 10 AP; Spellweavers gain 10/30/55 AP and more AP each cast.',
    params: [
      { key: 'teamAp', label: 'Team AP', same: true, values: [10], unit: 'flat', scope: 'special' },
      { key: 'memberAp', label: 'Spellweaver AP', values: [10, 30, 55], unit: 'flat', scope: 'special' },
      { key: 'apPerCast', label: 'Spellweaver AP per cast', values: [1, 1, 2], unit: 'flat', scope: 'members' },
    ],
    status: 'approximated', simNote: 'Spellweavers get the Spellweaver value instead of the team value (sources do not say whether it stacks).',
  },
  {
    id: 'sprykin', name: 'Sprykin', kind: 'origin', breakpoints: [3, 5, 7],
    description: 'Gain the Big Furry Friend and pick a Rider; bonus Health and Attack Speed.',
    params: [
      { key: 'hpPct', label: 'Bonus max Health (%)', values: [15, 40, 55], unit: '%', scope: 'members' },
      { key: 'asPct', label: 'Bonus Attack Speed (%)', values: [15, 35, 55], unit: '%', scope: 'members' },
    ],
    status: 'approximated', simNote: 'Big Furry Friend not summoned; bonuses applied to Sprykin units.',
  },
  {
    id: 'summoner', name: 'Summoner', kind: 'class', breakpoints: [2, 3],
    description: 'Empowers summons (Yorick, Azir, Mama Beak, Zyra).', params: [], status: 'not-simulated', simNote: 'Summons are abstracted inside abilities.',
  },
  {
    id: 'thornmaiden', name: 'Thornmaiden', kind: 'unique', breakpoints: [1],
    description: 'Team gains 5% Durability, or 10% with 6+ Zyra plants alive.',
    params: [{ key: 'durability', label: 'Team Durability (%)', values: [5], unit: '%', scope: 'team' }],
    status: 'approximated', simNote: 'Plant-count upgrade ignored.',
  },
  {
    id: 'vanguard', name: 'Vanguard', kind: 'class', breakpoints: [2, 4, 6],
    description: 'Vanguards gain a max-Health Shield at combat start and when first below 50% Health (18/30/40%). (6): 5% Durability while shielded.',
    params: [
      { key: 'shieldPct', label: 'Shield (% max HP)', values: [18, 30, 40], unit: '%', scope: 'members' },
      { key: 'shieldDuration', label: 'Shield duration (s)', same: true, values: [10], unit: 's', scope: 'members' },
      { key: 'shieldedDurability', label: 'Durability while shielded (%)', from: 2, values: [0, 0, 5], unit: '%', scope: 'members' },
    ],
    status: 'simulated', simNote: 'Shield lasts 10 s (one source).',
  },
];

export const TRAIT_MAP: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));
