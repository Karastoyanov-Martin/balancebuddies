# Agent A: TFT Set 18 (Enchanted Wilds) data, patch 18.5

Retrieved 2026-10-27. Output: `research/agentA.json` (65 units, 36 traits).

## Method
- **Units.** I fetched one op.gg page per unit (`op.gg/tft/meta-trends/champion/<ID>`). Each fetch asked for verbatim quotes of stats, mana, ability text and tooltip variables, including breakdowns such as `155 = 145([AD]) + 10([AP])`. Fields op.gg left blank came from metabot: range on every unit, and mana or traits on a few. For metabot I used the four Set 18 stat tables and, where needed, metabot unit pages.
- **Patch notes.** I read the official Riot notes for 18.2, 18.3, 18.4 and 18.5 (18.5 includes the Oct 22 and Oct 27 mid-patch changes). I also read topmeta.gg (18.5 / 18.5b / 18.5c) and hexkey.app (18.5). I used these notes to check each value and to find op.gg pages that are out of date.
- **Traits.** Sources were metabot trait pages, tftraits.com/set18 and tactics.tools/info/traits, checked against the official patch notes.
- **Not used:** the LoL wiki, tft.tools, leagueofgraphs, mobalytics, and anything under `src/` or `tests/`.
- **Values I did not take from a source:**
  - A constant stated once in the ability text (for example "Stun 1.5 s") is repeated across all three stars only to fit the array format.
  - Where a breakpoint has no stated value I wrote `null`, except in a few trait arrays. There a stated "not active yet" (0) or the 7-piece growth value carried into 10 is written in. Each of these is marked in the trait's notes.
- **Hotfix policy.** Today is the 18.5c day (Oct 27). For Kha'Zix and Brambleback I recorded the 18.5c hotfix values from the official notes, because op.gg still shows the 18.5 launch values. The op.gg values are kept in `conflicts`.

## Problems with the sources (read first)
1. **Many op.gg pages are out of date.** 21 unit pages carry a "Version" label older than 18.5 (18.2, 18.3 or 18.4). Kobuko's page links to `version=18.1`. Several still show values from before 18.4 or 18.5, for example Sivir, Malphite, Sentinel, Tristana, Ashe, Draven, Ezreal, Kobuko and Rammus. I corrected these from the official notes and marked each one in `conflicts`.
2. **metabot is inconsistent across its own pages.**
   - The en "range" table and the fr "attack-speed" table look older (Varus AS 0.70, Alune AS 0.80, Maokai mana 90).
   - The en "armor" table and the de "placement" table look newer.
   - The unit pages say "Last Updated Oct 11" (before 18.5).
   - The unit pages use different star multipliers from op.gg (for example Akali AD 40/72/130 against op.gg 40/60/90). I used op.gg for every star-scaled value.
   - All metabot tables are cut off at about 44 rows, and Yorick is missing from them. His range comes from his metabot unit page.
3. **I could not see the stat behind many scaling icons.** WebFetch shows some op.gg icons as an empty `()`. Those are marked "scaling icon not identifiable (likely AP/AD)". Treat any "likely" as unverified.
4. **WebFetch would not quote tftraits verbatim** (it paraphrased because of quote-length limits), and that page runs digits together (for example "2175/4350/6600"). Trait values that rest only on tftraits are medium confidence at best.

## Coverage
| | Total | High | Medium | Low |
|---|---|---|---|---|
| Units | 65 | 22 | 35 | 8 |
| Traits | 36 | 14 | 18 | 4 |

- **Units.** All 65 have every base field filled: HP, AD, AS, armor, MR, range, mana start and max, traits and ability name.
- **Low-confidence units:** Murkwolf, Rammus, Tristana, Sivir, Ashe, Kobuko, Varus, Gromp and LeBlanc. These have conflicts I could not resolve or totals I could not reconstruct.
- **Traits.** All 36 are present.
- **Incomplete traits:** Primal (no blessing values found), Attuned and Greenfather (each rests on a single detailed source), and Hunter (the 4-piece value is disputed).
- **Trait pages I could not fetch:** metabot returned client errors for Juggernaut, Ravager, Riftbeast, Primal, Flora Fatalis, Attuned, Monolith and Thornmaiden. These rest on tftraits, tactics.tools and the patch notes.

## Source conflicts
| Item | Value recorded | Disagreeing source(s) |
|---|---|---|
| Kha'Zix damage | 230/310/450; isolated 250/350/530 (official 18.5 notes, Oct 27 mid-patch; topmeta 18.5c; hexkey) | op.gg 250/345/500; 280/390/590 (18.5 before the hotfix) |
| Brambleback armor ignore | 30% base + 10% AP (18.5c official) | op.gg text "50%/50%/85%" |
| Brambleback Red Buff heal | 4% (18.5b official) | op.gg 5% |
| Tristana max mana | 50 (official 18.5 notes; metabot de table) | op.gg (page labelled 18.2) 60; metabot en and fr tables 60 |
| Tristana damage | 175/265/420 (18.4 notes); bonus per attack 12/18/28 (18.5 notes) | op.gg 160/240/385; 10/15/25 |
| Varus mana | 30/120 (op.gg 18.5; metabot 120) | official 18.4 B-patch "30/120 ⇒ 20/110" (hexkey lists it under 18.5). **Unresolved** |
| Varus AS | 0.75 (op.gg; official 18.4) | metabot en and fr tables 0.70 |
| Alune AS | 0.85 (op.gg; official 18.5; metabot armor and de tables) | metabot en range and fr tables 0.80 |
| Diana max mana | 30 (op.gg; metabot unit page; metabot fr table) | metabot en armor and de tables 40. No patch-note change found |
| Maokai mana | 30/100 (metabot unit page; metabot armor and de tables; official 18.2 mid-patch) | metabot en range table 90 |
| Taric max mana | 65 (op.gg; metabot unit page; metabot fr table) | metabot armor and de tables 70 (row possibly misread) |
| Taric armor/MR | 70/70 (op.gg; official 18.5 "65 ⇒ 70") | metabot unit page and fr table 65 |
| Master Yi AD | 63 (op.gg; metabot armor table; official 18.5 "60 ⇒ 63") | metabot fr table 62 |
| Kayle AD | 10/15/23 (op.gg) | metabot tables 0; metabot unit page "—" |
| Mama Beak base AD | 55 (op.gg; metabot) | official 18.4 B-patch "Base AD: 55 ⇒ 60". **Unresolved** |
| Gromp AP area damage | 160/240/375 (op.gg 18.5) | official 18.4 B-patch 180/270/435; 18.3 notes 175/265/410. **Unresolved** |
| LeBlanc copy chance | 10/15/40% (op.gg 18.5) | official 18.2 mid-patch 10/15/30%. **Unresolved** |
| Malphite shield | 735/885/2000 (18.5 notes for 1★/2★; op.gg for 3★) | op.gg (labelled 18.2) 700/850 |
| Sivir damage | AD part 220/330, bounce 18% (18.4 and 18.5 notes) | op.gg (labelled 18.2) 190/285/1050, 20%. 3★ value and 18.5 totals unknown |
| Sentinel shield | AP part 375/475; stun 0.5 s (18.5 notes) | op.gg (labelled 18.3) 350/450 |
| Ashe rift damage | AD base 11/16 (18.5 notes) | op.gg 5/8/200 |
| Ashe trail duration | op.gg 4/4/20 s kept | official 18.2 mid-patch "4s ⇒ 3s" |
| Draven bleed | 150/225/3000 (18.4 notes for 1★/2★) | op.gg 140/210 |
| Ezreal damage | 270/405/1200 (18.4 notes for 1★/2★) | op.gg 250/375 |
| Kobuko heal | AP part 285/335/480 (18.4 notes) | op.gg 265/315/460 (page links version=18.1) |
| Rammus shield | 400/550/700 (18.4 notes) | op.gg (labelled 18.3) 400/550/725 |
| Murkwolf damage breakdown | totals 500/1050/2250 as shown | op.gg's own breakdown "500 = 100[AD] + 20[AP]" does not add up |
| Akali, Yorick, Maokai, Ivern star AD | op.gg | metabot unit pages use a ×1.8 AD multiplier |
| Blackthorn 6-piece | bonus 50% stronger (official 18.5) | metabot 60% |
| Executioner bleed | 25/35% (tftraits; 18.4 notes) | metabot 30/40% |
| Fae | 4.5/7% AD/AP, 3/5% heal (tftraits; 18.4 and 18.5 notes) | metabot (Oct 9) 5/8%, 2.5/4% |
| Inferno burn | 1/1/3/4% (tftraits; 18.3 notes) | metabot 1/1/3.5/4.5% |
| Invoker mana regen | team 1/1/2/2, Invoker 3/4/6/8 (tftraits; 18.3 notes) | metabot "1\|2, 1\|3, 2\|5, 2\|8" |
| Rapidfire AS per attack | 3/5/7/10% (tftraits; 18.5 notes) | metabot 3/5/9/15% (launch values) |
| Sprykin 7-piece | 55% HP / 55% AS (tftraits; 18.4 notes) | metabot 45/45 |
| Solar, three 3★ armor/MR | 12 (18.2 notes) | metabot 15 |
| Juggernaut | 20/30/42% (tftraits; 18.4 notes) | tactics.tools 20/33/45% |
| Hunter AD | 20/30/40/60 (18.3 notes) | tftraits (paraphrased) 20/30/45/60; tactics.tools 20/30/45/65. **Unresolved** |
| Flora Fatalis heal | 7% (tftraits; 18.5 notes) | tactics.tools 8% |
| Eclipse delay | 8 s (tftraits; 18.4 notes) | tactics.tools 10 s |
| hexkey-only 18.5 items | not applied | hexkey lists 18.5 changes to Varus mana, Hecarim mana, Sprykin and Lunar. The official 18.5 notes contain none of these; they match changes in 18.2–18.4 |

## Values I could not verify
- **Totals from before a patch.** I could not find current 18.5 totals or 3★ values for:
  - Sivir: 18.5 totals and every 3★ value.
  - Sentinel: shield totals (only the AP part is known).
  - Kobuko: heal totals.
  - Ashe: rift totals.
  - The 3★ values for Malphite, Draven and Ezreal. These come from op.gg pages that are otherwise out of date.
- **Unresolved patch-note disagreements:** Varus mana, Mama Beak AD, Gromp area damage and LeBlanc copy chance. Each is marked low or medium confidence.
- **Unnamed scaling icons.** The scaling stat is unconfirmed (shown as "()") for: Ornn, Pebbles, Elise, LeBlanc, Fiddlesticks, Rammus, Brambleback, Morgana, Nidalee, Sentinel, Sett, Zyra, Alune, Ashe, Elder Dragon, Ivern and Maokai.
- **Damage types I inferred:** Krug, Master Yi and Rammus.
- **Second forms not retrieved:** Gromp AD form, Kog'Maw AP form, Master Yi AP form (only its 18.5 change was recorded), Nidalee AD/cougar form, and Lux's trait variants.
- **Range for Nidalee.** Metabot gives 1, but her AP form throws javelins, so the range may differ by form.
- **Trait values:**
  - Primal blessing values.
  - Riftbeast Alpha Mark buff values (only partly visible in unit texts).
  - Greenfather hex bonuses at 18.5. Only the 18.4 deltas are known: Damage Amp 6/10%, %HP 6/10%, resists 10/14.
  - Summoner numbers for Yorick, Azir and Zyra (tftraits only).
  - Bounty Seeker's bounty table.

## Sources
- op.gg unit pages (65 IDs, listed in each record). The correct Akali ID is `DA_18_Akali_AD`; `DA_18_Akali` and `DA_Akali18` both return the ranking list. Ezreal is `DA_18_Ezreal`.
- op.gg ranking list (traits for Ivern and Morgana): https://op.gg/tft/meta-trends/champion
- metabot tables: https://metabot.gg/en/TFT/18/champions/range, https://metabot.gg/en/TFT/18/champions/armor, https://metabot.gg/fr_FR/TFT/18/champions/attack-speed, https://metabot.gg/de_DE/TFT/18/champions/placement
- metabot unit pages for Akali, Yorick, Ivern, Maokai, Diana, Taric, Kayle, LeBlanc, Zyra and Morgana, plus metabot trait pages.
- Official notes: https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-5 (also -18-4, -18-3, -18-2)
- https://topmeta.gg/en/update/tft-patch-18-5/ , https://topmeta.gg/en/update/tft-patch-18-5b/ , https://topmeta.gg/en/update/tft-patch-18-5c/ , https://hexkey.app/patches/18.5
- https://tftraits.com/set18 (says "content version 18.5.0…, Last updated 2026-10-26", and also that it is PBE data), https://tactics.tools/info/traits
- The esports.gg 18.5 article could not be fetched (client error).
