# Data reconciliation — Agent A vs Agent B vs prototype data

Agent A sources: op.gg unit pages, metabot.gg tables, tftraits.com, official patch notes. Agent B sources: LoL wiki, tft.tools, leagueofgraphs, official patch notes 18.2–18.5 (incl. mid-patches to 27 Oct). Neither agent saw the prototype code.

## Base stats

| Unit | Field | Ours | Agent A | Agent B | Resolution |
|---|---|---|---|---|---|
| Rakan | ad | [45,67.5,101.3] | [45,68,101] | [0,0,0] | ours = A |
| Varus | manaStart | 20 | 30 | 20 | ours = B |
| Varus | manaMax | 110 | 120 | 110 | ours = B |
| Gromp | ad | [30,45,67.5] | [30,45,68] | [45,68,101] | ours = A |
| Kayle | manaStart | 0 | 0 | null | ours = A |
| Kayle | manaMax | 0 | 0 | null | ours = A |
| Diana | manaMax | 30 | 30 | 40 | ours = A |
| Mama Beak | ad | [60,90,135] | [55,83,124] | [60,null,null] | **ours differs from both** |
| Master Yi | ad | [63,95,142] | [63,95,142] | [63,null,null] | ours = A |
| Ahri | hp | [850,1530,3254] | [850,1530,3254] | [850,1530,2754] | ours = A |
| Amumu | hp | [1300,2340,4712] | [1300,2340,4712] | [1300,2340,4212] | ours = A |
| Aphelios | hp | [850,1530,3254] | [850,1530,3254] | [850,1530,2754] | ours = A |
| Brambleback | hp | [1100,1980,4064] | [1100,1980,4064] | [1100,1980,3564] | ours = A |
| Ezreal | hp | [850,1530,2754] | [850,1530,3254] | [850,1530,2754] | ours = B |
| Lillia | hp | [1300,2340,4712] | [1300,2340,4712] | [1300,2340,4212] | ours = A |
| Malphite | hp | [1300,2340,4712] | [1300,2340,4712] | [1300,2340,4212] | ours = A |
| Morgana | hp | [1100,1980,4064] | [1100,1980,4064] | [1100,1980,3564] | ours = A |
| Nidalee | hp | [850,1530,3254] | [850,1530,3254] | [850,1530,2754] | ours = A |
| Nidalee | range | 5 | 1 | 5 | ours = B |
| Sentinel | hp | [1300,2340,4712] | [1300,2340,4712] | [1300,2340,4212] | ours = A |
| Sett | hp | [1200,2160,4388] | [1200,2160,4388] | [1200,2160,3888] | ours = A |
| Sivir | hp | [850,1530,3254] | [850,1530,3254] | [850,1530,2754] | ours = A |
| Soraka | hp | [850,1530,3254] | [850,1530,3254] | [850,1530,2754] | ours = A |
| Zyra | hp | [850,1530,3254] | [850,1530,3254] | [850,1530,2754] | ours = A |
| Alune | hp | [900,1620,6916] | [900,1620,6916] | [900,1620,2916] | ours = A |
| Ashe | hp | [900,1620,6916] | [900,1620,6916] | [900,1620,2916] | ours = A |
| Ashe | range | 6 | 6 | 5 | ours = A |
| Draven | hp | [900,1620,6916] | [900,1620,6916] | [900,1620,2916] | ours = A |
| Draven | range | 6 | 6 | 5 | ours = A |
| Elder Dragon | hp | [1800,3240,9832] | [1800,3240,9832] | [1800,3240,5832] | ours = A |
| Gnar | hp | [900,1620,6916] | [900,1620,6916] | [900,1620,2916] | ours = A |
| Gnar | ad | [100,150,225] | [100,150,225] | [1,2,2] | ours = A |
| Ivern | hp | [1000,1800,7240] | [1000,1800,7240] | null | ours = A |
| Kennen | hp | [1200,2160,7888] | [1200,2160,7888] | [1200,2160,3888] | ours = A |
| Lux | hp | [900,1620,6916] | [900,1620,6916] | [900,1620,2916] | ours = A |
| Lux | range | 6 | 6 | 4 | ours = A |
| Maokai | hp | [1150,2070,7726] | [1150,2070,7726] | [1150,2070,3726] | ours = A |
| Taric | hp | [1300,2340,8212] | [1300,2340,8212] | [1300,2340,4212] | ours = A |

Stat fields: 482 agree across all three; 37 match one agent; 1 differ from both (mostly rounding: sources display 112.5 as 113).

## Ability values not found verbatim in either report

These are mostly values the prototype derives on purpose (e.g. Teemo’s 2 clusters × 55 = 110, Azir’s 2 soldiers × 43 = 86, a channel converted to a 3 s DoT).

- **Kobuko**: #1 heal hp: 7/7/7; #2 empower hp: 10/10/10
- **Pebbles**: #1 dot ap: 460/690/1030
- **Rakan**: #2 buffAlly value: 45/50/65
- **Xayah**: #2 empower ad: 162/160/163
- **Alistar**: #1 heal hp: 8/8/8
- **Elise**: #3 buff value: 85/85/85
- **Sejuani**: #1 shield hp: 10/10/10
- **Teemo**: #1 dmg ap: 110/164/310
- **Azir**: #2 empower ap: 86/130/210
- **Kha'Zix**: #1 dmg isolated ap: 20/40/80
- **Mama Beak**: #1 onHitBuff ad: 80/120/200
- **Rengar**: #2 heal ap: 90/135/135
- **Tristana**: #2 buff value: 8/8/8; #3 dmg ad: 235/355/560
- **Aphelios**: #1 dmg ad: 350/525/4250
- **Brambleback**: #2 buff value: 40/40/40
- **Morgana**: #2 dot ap: 132/200/2000
- **Nidalee**: #2 empower ap: 233/350/2333
- **Sentinel**: #4 buffTeam value: 2/2/2
- **Sett**: #2 dmg hp: 6/6/6
- **Sivir**: #2 dmg ad: 39.6/59.4/189; #2 dmg ap: 2.7/3.6/18
- **Soraka**: #2 markBonus ap: 330/495/3000
- **Zyra**: #1 dot ap: 700/1060/9000
- **Alune**: #1 dmg ap: 174/264/1500
- **Ashe**: #2 dot ad: 33/48/600; #2 dot flat: 6/9/60
- **Draven**: #1 dmg ad: 200/300/800

## Traits

| Trait | Breakpoints (ours / A / B) | Status |
|---|---|---|
| Adaptor | 2/3/4 / 2/3/4 / 2/3/4 | agree |
| Apex Predator | 1 / 1 / 1 | agree |
| Attuned | 1 / 1 / 1 | agree |
| Avatar | 1 / 1 / 1 | agree |
| Blackthorn | 2/4/6 / 2/4/6 / 2/4/6 | agree |
| Blossom | 3/5/7/9/11 / 3/5/7/9/11 / 3/5/7/9/11 | agree |
| Bounty Seeker | 1 / 1 / 1 | agree |
| Brawler | 2/4/6 / 2/4/6 / 2/4/6 | agree |
| Caustic | 1 / 1 / 1 | agree |
| Coven | 3/4/5/7 / 3/4/5/7 / 3/4/5/7 | agree |
| Defender | 2/4/6 / 2/4/6 / 2/4/6 | agree |
| Eclipse | 1 / 1 / 1 | agree |
| Elderwood | 3/5/7/9/11 / 3/5/7/9/11 / 3/5/7/9/11 | agree |
| Emerald Aspect | 1 / 1 / 1 | agree |
| Executioner | 2/3/4 / 2/3/4 / 2/3/4 | agree |
| Fae | 2/4 / 2/4 / 2/4 | agree |
| Flora Fatalis | 1/2 / 1/2 / 1/2 | agree |
| Greenfather | 1 / 1 / 1 | agree |
| Hunter | 2/3/4/5 / 2/3/4/5 / 2/3/4/5 | agree |
| Inferno | 2/3/5/7 / 2/3/5/7 / 2/3/5/7 | agree |
| Invoker | 2/3/4/5 / 2/3/4/5 / 2/3/4/5 | agree |
| Juggernaut | 2/4/6 / 2/4/6 / 2/4/6 | agree |
| Lunar | 2/3/4/5 / 2/3/4/5 / 2/3/4/5 | agree |
| Monolith | 1 / 1 / 1 | agree |
| Old Growth | 1 / 1 / 1 | agree |
| Primal | 2/4 / 2/4 / 2/4 | agree |
| Rapidfire | 2/3/4/5 / 2/3/4/5 / 2/3/4/5 | agree |
| Ravager | 2/4/6 / 2/4/6 / 2/4/6 | agree |
| Riftbeast | 3/5/7/10 / 3/5/7/10 / 3/5/7/10 | agree |
| Rival | 1/2 / 1/2 / 1/2 | agree |
| Solar | 3 / 3 / 1 | check |
| Spellweaver | 2/4/6 / 2/4/6 / 2/4/6 | agree |
| Sprykin | 3/5/7 / 3/5/7 / 3/5/7 | agree |
| Summoner | 2/3 / 2/3 / 2/3 | agree |
| Thornmaiden | 1 / 1 / 1 | agree |
| Vanguard | 2/4/6 / 2/4/6 / 2/4/6 | agree |

## Costs vs Riot Data Dragon

All 65 costs match Riot’s own tft-champion.json.