# Agent B: TFT Set 18 (Enchanted Wilds) data audit, patch 18.5

Retrieved 2026-10-27. Output: `research/agentB.json` (65 units, 36 traits).

## Method

1. **Base stats and ability text** come from tft.tools info pages (`tft.tools/info/set-18/units/<id>` and `/traits/<id>`). These were the only pages that rendered full stat blocks (HP, AD, AS, Armor, MR, range, mana) for every unit. The second source is the LoL wiki `<Name>/TFT` pages, but only 9 of them had a filled Set 18 section: Akali, Camille, Ornn, Rek'Sai, Veigar, Yorick, Ezreal, Fiddlesticks and Lux. Many wiki pages returned client errors; others (Caitlyn, Kayle) have no Set 18 section, and Leona and Xayah have a Set 18 section with no stats.
2. **tft.tools is stale.** Its data matches the 18.2 notes but not the 18.2 B-patch or anything later. Examples:
   - Camille 160/240/410, Veigar 175/265/395, Caitlyn 190/285/470.
   - Varus mana 30/120, even on the tft.tools page labelled "Patch 18.5".
   - The wiki is mixed: mostly about 18.3, but Lux is pre-18.2.
3. **Official patch notes** for 18.2, 18.3, 18.4 and 18.5 (teamfighttactics.leagueoflegends.com), including the mid-patch updates of 14 Sep, 7 Oct, 22 Oct and 27 Oct, were read line by line. For every field a note touches, the JSON records the newest "⇒ new" value and records the older values in `conflicts`. Fields no note touches keep the tft.tools or wiki value. That relies on the assumption that nothing changed without being in the notes.
4. The 18.5 main notes and the 22 Oct mid-patch were cross-checked against mid.gg (identical). The 27 Oct mid-patch (Kha'Zix, Brambleback, Hand of Justice) appears only on the official page.
5. I did not compute any values. Where a patch note changed the 1-star value only, or gave no 3-star value, the missing star values are `null`. Examples: Mama Beak AD, Master Yi AD, Ashe trail, Taric 3-star shield.
6. 4-star values (shown by both sources) are mentioned in `notes` only.
7. Labels in `ability.numbers` describe the tooltip term ("first term", "%AD"). tft.tools shows scaling as icons with no text, so many scalings are marked "not labelled".

## Sources used

- tft.tools info unit and trait pages (65 units, 33 traits), plus tft.tools stats pages for Leona, Cinderling and Varus.
- LoL wiki: 9 unit pages with Set 18 data; trait pages TFT:Brawler and TFT:Monolith.
- Official patch notes 18.2, 18.3, 18.4 and 18.5, and the official "Enchanted Wilds Overview" (launch-era trait text).
- mid.gg 18.5 summary (cross-check).
- leagueofgraphs (Leona only; its Ezreal page still shows Set 15).
- seemeta (Apex Predator, Greenfather).
- mobalytics `/set18/synergies` (text only; numbers blank).
- The mobalytics champion pages, outof.games, esports.gg and the wiki TFT:Enchanted_Wilds page all failed to load.

## Coverage

| | Units (65) | Traits (36) |
|---|---|---|
| high confidence (2+ sources agree, or every value is from the patch notes) | 4 (Camille, Ornn, Rek'Sai, Yorick) | 4 |
| medium (one stat source, plus patch notes where relevant) | 51 | 22 |
| low (single source with gaps, unresolved conflict, or display errors) | 10 | 10 |

- Units with a stat line fully filled: 61 of 65.
- Units with null or missing stat fields:
  - Mama Beak and Master Yi: AD at 2 and 3 stars.
  - Ivern: HP (tft.tools shows 0/0/0).
  - Kayle: mana (she has none).
- Gromp and Nidalee: only the AP form's stat block was retrieved. Akali, Kog'Maw and Master Yi: only the AD form's.
- Traits with no numbers verified: Primal (blessings unrendered), Thornmaiden (all values null), Bounty Seeker (current bounty table not verifiable). Riftbeast's 10-unit team-size bonus is also unresolved.

## Source conflicts

| Item | Source A | Source B | Recorded |
|---|---|---|---|
| Akali 3★ damage | tft.tools 380% AD | wiki 345% AD | 380 (unresolved, no note) |
| Akali max mana | wiki 30 | tft.tools 25; 18.2 notes "0/30 ⇒ 0/25" | 25 |
| Camille damage | tft.tools 160/240/410 | wiki 150/225/375; 18.4 notes 150/225/400 | 150/225/400 |
| Leona decaying resists | leagueofgraphs 60/70/80 | tft.tools 60/80/100; 18.2 notes | 60/80/100 |
| Ornn 3★ Forge Power | tft.tools "doubled" | wiki +85%; 18.3 notes +100% ⇒ +85% | +85% |
| Veigar damage | tft.tools 175/265/395 | wiki 200/300/450; 18.4 notes 190/285/430 | 190/285/430 |
| Veigar AP per kill | tft.tools 3% | wiki and 18.3 notes 2% | 2% |
| Varus mana / AS | tft.tools 30/120, 0.7 | 18.4 notes 20/110, 0.75 | 20/110, 0.75 |
| Fiddlesticks heal | wiki 395/470/790% AP | tft.tools 410/485/850 | wiki value (unresolved) |
| Fiddlesticks HP | wiki 1000/1800/3240 | tft.tools 0/0/0 (display bug) | wiki |
| Ezreal damage | wiki 235/355 | tft.tools 250/375; 18.4 notes 270/405 | 270/405/1200 |
| Ezreal AS gain | wiki 25/25/100 (% AP) | tft.tools 30/30/100% | 30/30/100 (unresolved) |
| Lux laser | wiki 355/550/5000 | 18.2 notes 375/565, 3★ 6500 | 375/565/6500 |
| Lux origin modifiers | wiki (e.g. Blackthorn stun 1s, Coven -8) | launch overview (1.25s, -20) | wiki text kept; low confidence |
| Gromp AP splash | 18.3 notes 160/240/360 ⇒ 175/265/410 | 18.4 notes 160/240/375 ⇒ 180/270/435 (also a "⇒ 160/240/375" line) | 180/270/435, LOW |
| Mama Beak ability | tft.tools 22/33/48; 18.4 notes "22/30/48 ⇒ 22/30/52" | 18.5 notes "22/33/52 ⇒ 20/30/50" | 20/30/50 (the notes' "old" values disagree with each other) |
| Kha'Zix | 18.5 notes old value 255/360/515 | 18.3B notes new value 265/370/535 | 27 Oct mid-patch 230/310/450 and 250/350/530 |
| Coven Essence per loss | tft.tools 18/32/32/60 | 18.3 notes old 18/25/32/60 ⇒ 22/28/35/60 | 22/28/35/60 |
| Blackthorn health | overview 225/350/350 | tft.tools and 18.2 notes 175/350/600 | 175/350/600 |
| Blackthorn enhanced bonus at 4 | tft.tools 60% | overview 25% | null (6 = 50% per 18.5) |
| Riftbeast at 10 | tft.tools +2 team size | overview +1 | null |

Smaller patch-note overrides of tft.tools (old value kept in `conflicts`): Alistar, Caitlyn, Karma, Kobuko, Rakan, Xayah, Kayle, LeBlanc, Murkwolf, Shen, Teemo, Warwick, Azir, Cassiopeia, Hecarim, Rammus, Rengar, Tristana, Master Yi, Brambleback, Lillia, Malphite, Morgana, Nidalee, Sentinel, Sett, Sivir, Soraka, Alune, Ashe, Draven, Kennen, Maokai, Taric. For traits, the same applies to Attuned, Defender, Eclipse, Executioner, Fae, Flora Fatalis, Hunter, Inferno, Invoker, Juggernaut, Lunar, Rapidfire and Sprykin.

## Values I could not verify

- Thornmaiden: every number. Primal: blessing names and numbers. Bounty Seeker: current bounty table. Blackthorn: the sacrifice table by role, star and cost.
- Ivern HP. Mama Beak and Master Yi AD at 2 and 3 stars. The Gromp AD-form and Nidalee AD-form stat blocks. Kog'Maw AP-form numbers. Akali AP-form Tank bonus.
- Exact scaling stats for most tft.tools terms (shown as icons).
- 3-star values that a later note may have changed without stating them: Sivir 1050, Malphite 2000, Taric shield, Ashe trail.
- Krug's roll damage type (not stated).
- Gnar AD "1/2/2" (looks like a display quirk; recorded as shown, low confidence).
- Elderwood plant base stats, Greenfather Water and Flower hex values, Riftbeast team size at 10.

## Caveats

- WebFetch summaries can hallucinate. For the patch notes I re-fetched specific sections to confirm the lines, but one-off summary errors are still possible. The duplicate Alistar, Gromp, Murkwolf and Warwick lines appearing in both the 18.3 and 18.4 notes are one example.
- The 27 Oct mid-patch is dated today, so live clients may not all have it yet.
