/*
 * SIMULATED player feedback used by the "web crawl" demo in Core Task 1.
 * These posts are written for the prototype — they are NOT real quotes from real players.
 * Handles are fictional. Each post carries the metadata a real crawler would keep.
 */
export interface FeedbackPost {
  id: string;
  source: 'reddit/r/CompetitiveTFT' | 'reddit/r/TeamfightTactics' | 'official forum' | 'patch-notes comments' | 'upload';
  author: string;
  rank?: 'Iron–Gold' | 'Plat–Emerald' | 'Diamond' | 'Master+' | 'unknown';
  mode?: 'Ranked' | 'Normal' | 'Double Up' | 'unknown';
  date: string;
  text: string;
  upvotes: number;
}

export const SAMPLE_FEEDBACK: FeedbackPost[] = [
  { id: 'f01', source: 'reddit/r/CompetitiveTFT', author: 'u/hex_shaper', rank: 'Master+', mode: 'Ranked', date: '2026-10-22', upvotes: 412,
    text: 'Even after 18.5 Riftbeast Elder Dragon is the comp every lobby fights over. Apex Predator counting as +2 Riftbeast means you hit 7 way too easily and the growth stacks never stop.' },
  { id: 'f02', source: 'reddit/r/CompetitiveTFT', author: 'u/topfour_or_bust', rank: 'Master+', mode: 'Ranked', date: '2026-10-23', upvotes: 288,
    text: 'High elo feels like two viable comps: Riftbeast or Executioner Azir. Everything else is a coinflip for 4th. I want to be forced less into the same two lines.' },
  { id: 'f03', source: 'reddit/r/CompetitiveTFT', author: 'u/greedrolldown', rank: 'Diamond', mode: 'Ranked', date: '2026-10-22', upvotes: 145,
    text: 'The Riftbeast 7 nerf (6% to 5%) barely changed anything. Long fights still snowball once the beasts start growing.' },
  { id: 'f04', source: 'reddit/r/CompetitiveTFT', author: 'u/statsnerd_eu', rank: 'Master+', mode: 'Ranked', date: '2026-10-24', upvotes: 233,
    text: 'Riftbeast is strongest in long fights. If you nerf the base units instead of the growth you just kill the early game version that casual players enjoy.' },
  { id: 'f05', source: 'reddit/r/TeamfightTactics', author: 'u/cozy_capybara', rank: 'Iron–Gold', mode: 'Normal', date: '2026-10-23', upvotes: 512,
    text: 'I want to try fun comps without losing to the same meta build. Every normal game someone is playing Elder Dragon and stomping everyone.' },
  { id: 'f06', source: 'reddit/r/TeamfightTactics', author: 'u/lunar_lover', rank: 'Plat–Emerald', mode: 'Ranked', date: '2026-10-21', upvotes: 96,
    text: 'Lunar positioning is actually really fun this set. Putting Diana next to my carry for the adjacency buff feels rewarding. Please do not nerf Lunar.' },
  { id: 'f07', source: 'reddit/r/TeamfightTactics', author: 'u/duoqueue_dan', rank: 'unknown', mode: 'Double Up', date: '2026-10-22', upvotes: 174,
    text: 'In Double Up my friend and I like to split traits and support each other boards. When one of us goes Riftbeast the other just has to play frontline, it is less fun.' },
  { id: 'f08', source: 'official forum', author: 'NewbieNoodle', rank: 'Iron–Gold', mode: 'Normal', date: '2026-10-20', upvotes: 41,
    text: 'I do not understand why Elder Dragon counts as three Riftbeasts. The trait tooltip is confusing for new players.' },
  { id: 'f09', source: 'reddit/r/CompetitiveTFT', author: 'u/frontline_frank', rank: 'Diamond', mode: 'Ranked', date: '2026-10-23', upvotes: 120,
    text: 'Sentinel goes into every comp because the shield plus mana regen is just too universal. It is the most contested 4 cost by far.' },
  { id: 'f10', source: 'reddit/r/CompetitiveTFT', author: 'u/macro_mira', rank: 'Master+', mode: 'Ranked', date: '2026-10-24', upvotes: 77,
    text: 'Sentinel being contested is fine honestly, it is not overpowered, it is just flexible. Average placement is mid. Do not confuse popularity with power.' },
  { id: 'f11', source: 'patch-notes comments', author: 'pixie_dust', rank: 'Plat–Emerald', mode: 'Ranked', date: '2026-10-21', upvotes: 63,
    text: 'Fae buff in 18.5 is nice, finally see Lillia and Rakan boards again.' },
  { id: 'f12', source: 'reddit/r/TeamfightTactics', author: 'u/azir_enjoyer', rank: 'Plat–Emerald', mode: 'Ranked', date: '2026-10-22', upvotes: 158,
    text: 'Executioner Azir still feels oppressive in Plat and Emerald. The soldiers shred my frontline before I can do anything.' },
  { id: 'f13', source: 'reddit/r/CompetitiveTFT', author: 'u/eco_queen', rank: 'Master+', mode: 'Ranked', date: '2026-10-24', upvotes: 51,
    text: 'Azir after the nerf is fine at high elo, it only looks strong in lower ranks because people do not position against it.' },
  { id: 'f14', source: 'reddit/r/TeamfightTactics', author: 'u/casual_carl', rank: 'Iron–Gold', mode: 'Normal', date: '2026-10-23', upvotes: 210,
    text: 'Riftbeast is the only comp that feels strong in normals. My friends quit playing because every game ends the same way.' },
  { id: 'f15', source: 'reddit/r/CompetitiveTFT', author: 'u/hex_shaper', rank: 'Master+', mode: 'Ranked', date: '2026-10-22', upvotes: 30,
    text: 'Even after 18.5 Riftbeast Elder Dragon is the comp every lobby fights over. Apex Predator counting as +2 Riftbeast means you hit 7 way too easily.' }, // near-duplicate of f01
  { id: 'f16', source: 'official forum', author: 'Brambleback_Main', rank: 'Diamond', mode: 'Ranked', date: '2026-10-24', upvotes: 88,
    text: 'Brambleback Riftbeast is the real problem, not Elder Dragon. Red Buff healing 5% per hit after the buff makes it unkillable.' },
  { id: 'f17', source: 'reddit/r/TeamfightTactics', author: 'u/spellweave_sam', rank: 'Plat–Emerald', mode: 'Ranked', date: '2026-10-21', upvotes: 44,
    text: 'Spellweaver Alune is fun but loses to anything with a big frontline. Would love a small buff.' },
  { id: 'f18', source: 'patch-notes comments', author: 'gg_wp', rank: 'unknown', mode: 'unknown', date: '2026-10-21', upvotes: 2,
    text: 'first' }, // filtered out (too short / off-topic)
  { id: 'f19', source: 'reddit/r/TeamfightTactics', author: 'u/double_trouble', rank: 'unknown', mode: 'Double Up', date: '2026-10-23', upvotes: 92,
    text: 'Double Up is fun when we can combine weird synergies. Riftbeast boards make it pointless to try because they outscale everything late.' },
  { id: 'f20', source: 'reddit/r/CompetitiveTFT', author: 'u/curve_watcher', rank: 'Diamond', mode: 'Ranked', date: '2026-10-24', upvotes: 67,
    text: 'Juggernaut Amumu is a solid alternative frontline right now, I do not think it needs changes.' },
  { id: 'f21', source: 'official forum', author: 'FirstWeekPlayer', rank: 'Iron–Gold', mode: 'Normal', date: '2026-10-22', upvotes: 19,
    text: 'As a beginner the easiest thing to do is copy the Riftbeast comp from a guide. If you nerf it too much I do not know what else to play.' },
  { id: 'f22', source: 'reddit/r/CompetitiveTFT', author: 'u/topfour_or_bust', rank: 'Master+', mode: 'Ranked', date: '2026-10-25', upvotes: 140,
    text: 'Please nerf the Riftbeast growth, not the units. The fantasy of beasts growing is cool, the numbers are just too high in long fights.' },
  { id: 'f23', source: 'reddit/r/TeamfightTactics', author: 'u/eclipse_chaser', rank: 'Plat–Emerald', mode: 'Ranked', date: '2026-10-25', upvotes: 71,
    text: 'Eclipse (3 Solar 3 Lunar) is a fun flex option but too slow to matter against Riftbeast.' },
  { id: 'f24', source: 'reddit/r/TeamfightTactics', author: 'u/cozy_capybara', rank: 'Iron–Gold', mode: 'Normal', date: '2026-10-25', upvotes: 33,
    text: 'Coven is fine, I like the essence thing even if I do not fully get it.' },
];

/** Plain-text keyword dictionaries used by the (simulated) Qualitative Agent. */
export const THEMES: { id: string; label: string; keywords: string[]; relates: string[] }[] = [
  { id: 'riftbeast_dominance', label: 'Riftbeast / Elder Dragon dominance', keywords: ['riftbeast', 'elder dragon', 'apex', 'growth', 'beasts', 'brambleback', 'outscale'], relates: ['riftbeast', 'elderdragon', 'brambleback'] },
  { id: 'comp_diversity', label: 'Few viable compositions', keywords: ['viable', 'two', 'same meta', 'same way', 'forced', 'only comp', 'same two', 'coinflip', 'pointless'], relates: [] },
  { id: 'sentinel_contest', label: 'Sentinel is universally contested', keywords: ['sentinel', 'contested', 'universal'], relates: ['sentinel'] },
  { id: 'azir', label: 'Executioner Azir strength', keywords: ['azir', 'executioner', 'soldiers'], relates: ['azir', 'executioner'] },
  { id: 'social_play', label: 'Double Up / playing with friends', keywords: ['double up', 'friend', 'support each other', 'combine'], relates: [] },
  { id: 'beginner_access', label: 'Beginner accessibility', keywords: ['beginner', 'new player', 'confusing', 'guide', 'understand'], relates: [] },
  { id: 'positive_lunar', label: 'Positive: Lunar positioning', keywords: ['lunar', 'adjacency', 'diana'], relates: ['lunar'] },
  { id: 'other', label: 'Other / satisfied', keywords: ['fae', 'coven', 'amumu', 'juggernaut', 'spellweaver', 'eclipse'], relates: [] },
];
