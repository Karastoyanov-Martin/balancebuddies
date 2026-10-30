# BalanceBuddies — low-fidelity prototype

Multi-agent decision support for game balancing, demonstrated on **TFT Set 18 “Enchanted Wilds”, patch 18.5**.
The prototype walks through three core tasks end to end and runs **fully offline in the browser** (no server, no API keys).

| Core task | What the designer does | What is real vs. simulated |
|---|---|---|
| **1 · Investigate the issue** | Upload CSV/TXT/JSON evidence or run a web crawl → Quantitative + Qualitative Agents → Synthesizing Agent proposes issue candidates → designer writes notes (“ignore Sentinel for now”), watches the revision run, sees what changed per version, selects one | CSV parsing, filtering, de-duplication, theme clustering and statistics are real code. The crawl and the agents’ wording are simulated. |
| **2 · Configure perspectives** | Review suggested communities (add, remove, edit key concerns), split/add representatives, set weights, ranked priorities, hard limits in plain English, negotiation format → approve a JSON negotiation brief | Template-based suggestions; limits are parsed and enforced later in Task 4. |
| **3 · Negotiate** | *Placeholder* — pick a mock negotiated proposal or write your own | Out of scope for the low-fi stage. |
| **4 · Test & reassess** | Place any of the 65 units (1–3★) on a hex board, move them, run a fight with live HP/mana bars, edit trait/unit numbers, A/B-test baseline vs. proposal, compare expected vs. actual, decide keep / investigate / reopen | Real deterministic combat simulation (simplified rules, see below). |

Decisions from every task are appended to **Shared memory** (top-right) and persisted in `localStorage`; *Export* downloads the whole project as JSON.

## Run it

- **Offline / for evaluators:** open `dist/index.html` in a recent desktop Chrome, Edge or Firefox (it is a single self-contained file). Best at ≥ 1280 px wide.
- **Develop:** `npm install` → `npm run dev` (Vite dev server).
- **Test:** `npm test` (Vitest, ~470 tests incl. a check that our data matches every value both research agents agreed on).
- **Re-verify data:** `npm run verify:data` rebuilds `src/data/verification.json` and `research/RECONCILIATION.md` from the two agents' reports.
- **Build:** `npm run build` → writes the single-file `dist/index.html` (all JS/CSS inlined via `vite-plugin-singlefile`). Any static host (e.g. GitHub Pages) can serve that file.

## Code map

```
src/
  main.tsx, App.tsx          app shell: sidebar walk path, shared-memory drawer, export/reset
  store/project.ts           zustand store persisted to localStorage (all task state + shared memory)
  store/demo.ts              shortcuts that load demo evidence / brief for evaluators
  data/units.ts              all 65 Set 18 units: stats per star, mana, range, simplified ability effects
  data/traits.ts             all 36 traits: breakpoints, editable params, simulated/approximated/not-simulated tag
  data/verification.json     per-unit verification status generated from research/
  sim/                       ← the combat simulation (pure TypeScript, no UI)
    engine.ts                tick-based combat: targeting, BFS movement, attacks, crits, mana, abilities, traits
    types.ts                 data model (UnitDef, TraitDef, Effect, Placement, CombatResult …)
    hex.ts / rng.ts          7×8 hex board geometry + pathfinding; seeded PRNG
    traitCount.ts            trait counting (unique units, Apex Predator +2 Riftbeast, Eclipse)
    batch.ts / compare.ts    batch runs, A/B summaries, paired 95% CI, expected-vs-actual verdict
    describe.ts              shared scaling formula + readable ability numbers at a unit's current stats
    patch.ts                 diff of designer edits vs. 18.5 baseline; plain-English limit parsing + checks
  agents/                    simulated agents for Tasks 1–2
    preprocess.ts            CSV parser, feedback extraction, filtering, near-duplicate removal
    analysis.ts              Quantitative, Qualitative, Synthesizing agents + Setup Assistant
    revision.ts              report revisions from designer notes (remove / bring back / prioritise / rank focus / “does X hold for Double Up?”) + version diff
    brief.ts                 negotiation-brief JSON builder (vote share = community weight ÷ representatives)
  mock/                      sample feedback (written for the prototype), stats CSVs, placeholder proposals & board presets
  ui/icons.ts, ui/Avatar.tsx champion icons (Riot Data Dragon, cached) with initials fallback
  ui/HowItWorks.tsx          plain-language explanation of the simulation
  ui/                        React views: Home, task1/, task2/, task3/, task4/ (Board, Pool, Panels, BalanceEditor, TestPanel), charts
tests/                       Vitest suites: hex, engine, roles & mana, every ability effect, every simulated trait, data integrity,
                             research agreement, agents, batch/patch, icons, perf
research/                    the two agents' independent reports, reconciliation report and scripts
```

## Simulation model (Task 4)

Prototype rules: **no items, no shop (spawn any unit/star), no economy, positions editable before and after each fight.** The in-app *How it works* panel (Task 4 header / Home) explains the model in plain language.

**Set 18 roles drive mana:** Tanks 5 mana per attack + mana from damage taken (1% pre + 3% post-mitigation, cap 42.5) and are preferred as targets on ties; Casters 7 per attack + 2 mana/s; Fighters 10 + bonus attack speed (5–30% by stage, sandbox default 15%); Carries 10; Reapers 10 + 15% damage reduction from non-targets; Specialists have their own resource. After casting there is a 1 s mana lock; overflow mana carries into the next cast. Ability values with an AD icon are **% of current AD**; AP values are at 100 AP.
Each tick (50 ms) every unit: takes DoT/burn damage → regenerates → gains mana regen → if not stunned/moving, casts at full mana or attacks its target if in range, otherwise moves one hex (BFS) towards the nearest enemy. Damage pipeline: damage amp → armor/MR `100/(100+R)` → durability → shields → health; mana from attacks (10) and from damage taken (1% pre + 3% post-mitigation, cap 42.5). Base crit 25% / 140%. Fights end when a side is wiped or at 30 s (draw). All constants are editable under *Sim rules*.

**Live stats:** every playback frame records each unit's current AD, AP, AS, Armor, MR, range, crit, durability, amp, omnivamp and mana regen, so the Unit tab shows how buffs, trait growth and shred change them during the fight, plus the ability's numbers at that moment (e.g. `375 × 1.50 (150 AP) = 563`). Every unit has an editable Ability Power (100 by default). In the trait editor each column is one breakpoint; numbers that are the same at every breakpoint have one field, and "—" marks effects that only start at a higher breakpoint. Saved work from older builds is re-shaped to the current data on load, keeping edited numbers.

Abilities are simplified to composable effects (damage, DoT, heal, shield, stun, buffs, empowered attacks, taunt …) using each unit’s patch-18.5 numbers; every unit shows the real ability text next to the simplification. Traits are tagged **simulated**, **approximated** or **not simulated** (economy, shop, summons, player choices). A *seed* fixes a fight's random rolls (crits and ties between equally near targets), so the same board, numbers and seed always replay the same fight. A/B tests play N seeds twice — 18.5 baseline and proposal on the *same seeds* — so the win-rate difference is reported with a paired 95% CI. Each run draws new random seeds by default ("fixed seeds 1–N" makes a run repeatable); the seeds used are stored with the test.

## Data verification (27 Oct 2026)

Two research agents collected all 65 units and 36 traits independently, from different sources and without access to this code: **Agent A** (op.gg, metabot.gg, tftraits.com, Riot patch notes) and **Agent B** (LoL Wiki, tft.tools, leagueofgraphs, Riot patch notes incl. mid-patches to 27 Oct). Their raw outputs and reports are in `research/` (`agentA.json`, `agentB.json`, `agentA_report.md`, `agentB_report.md`); `research/RECONCILIATION.md` lists every remaining disagreement and how it was resolved. Costs were checked against Riot's Data Dragon. Each unit shows its verification status in the sandbox's Unit tab.

Champion icons are fetched at runtime from Riot's public Data Dragon CDN, cropped and cached in the browser so they also work offline afterwards (initials are shown until then). BalanceBuddies isn't endorsed by Riot Games.

## Data sources (retrieved 26–27 Oct 2026)

Unit stats & ability numbers: op.gg TFT meta-trends unit pages (v18.5); range/stat cross-check and the public unit-stats snapshot: metabot.gg (Set 18); traits: tftraits.com/set18; patch 18.5 changes (21 Oct 2026): esports.gg. Trait values the sources did not state precisely are marked `assumed` in `data/traits.ts`; per-unit corrections and remaining disagreements are documented in `research/RECONCILIATION.md`. Player feedback posts and the comp-by-rank table are **simulated** for the prototype.
#   b a l a n c e b u d d i e s  
 