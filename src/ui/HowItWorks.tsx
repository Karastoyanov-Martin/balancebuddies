import { DEFAULT_RULES } from '../sim/engine';
import { Modal } from './common';
import { STATUS_HELP } from './task4/Panels';

const R = DEFAULT_RULES;

/** Plain-language explanation of the combat model and how it compares to real TFT. */
export default function HowItWorks({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How the combat simulation works" onClose={onClose} wide>
      <div className="col small how" style={{ gap: 14, maxWidth: 720 }}>
        <p>
          The sandbox is a <b>deterministic, tick-based model</b> of a TFT fight: every {R.tick * 1000} ms each living unit updates in a fixed order.
          The same board, data and <i>seed</i> always produce the same fight; the seed only decides random events (crits and ties between equally near targets).
          It is built from TFT’s published rules, Riot patch notes and community data sites — <b>not</b> from Riot’s game code, so it approximates the real game rather than replicating it.
        </p>

        <section>
          <h3>Seeds and randomness</h3>
          <p>
            A computer can’t roll real dice, so it uses a <b>seed</b>: a number that fixes the whole sequence of “random” rolls in a fight.
            In this sandbox the rolls decide only two things: <b>whether each attack crits</b> (25% base) and <b>who is picked when several enemies are equally close</b>
            (ability targets included). Everything else — movement, attack timing, mana, damage — follows fixed rules.
          </p>
          <ul>
            <li><b>Same board + same numbers + same seed = the exact same fight</b>, every time. That is what makes a fight replayable and a bug reproducible.</li>
            <li>A different seed gives a different but equally valid fight — like replaying the same round with different luck.</li>
            <li>An <b>A/B test</b> plays N seeds twice: once with the 18.5 numbers, once with your changes. Because both sides get the same luck in each fight,
              the difference you see comes from your change. By default every test run draws new seeds, so running it again shows how much the result moves by chance
              (usually a few points — that is what the ± range is). Choose “fixed seeds” to get exactly the same numbers again.</li>
          </ul>
        </section>

        <section>
          <h3>One tick, step by step</h3>
          <ol>
            <li>Damage-over-time, burns and regeneration are applied; mana regeneration is added.</li>
            <li>Stunned or moving units skip the rest of the tick.</li>
            <li>The unit picks a target if it has none: the <b>nearest enemy</b> in hex distance (ties go to Tanks — “more likely to be targeted” — then random). Taunts override this.</li>
            <li>If the target is in range: at full mana it <b>casts</b>; otherwise it attacks when its attack timer allows (one attack every 1 ÷ attack speed seconds).</li>
            <li>If not in range it walks one hex along the shortest free path (breadth-first search), taking {R.moveTime} s per hex.</li>
            <li>Delayed effects land, then the fight ends if one side is empty, or at {R.maxTime} s as a draw.</li>
          </ol>
        </section>

        <section>
          <h3>Damage</h3>
          <p>
            raw damage × (1 + damage amp) → × 100 ÷ (100 + Armor or MR) for physical/magic (true damage ignores this) → × (1 − durability) → shields absorb first → health.
            Attacks crit {Math.round(R.critChance * 100)}% of the time for {Math.round(R.critDamage * 100)}% damage. Omnivamp heals for a share of damage dealt.
          </p>
          <p>
            Ability numbers follow TFT’s tooltip convention: values with an <b>AD</b> icon are <b>% of the unit’s current AD</b> (Camille’s 150/225/400 means 150% × 40 AD = 60 at 1★);
            values with an <b>AP</b> icon are the damage at 100 AP and scale with AP ÷ 100 (every unit starts at 100 AP; you can change a unit's AP in the editor, and traits like Spellweaver add to it). Some abilities scale with max Health, Armor or MR.
          </p>
        </section>

        <section>
          <h3>Mana (Set 18 roles)</h3>
          <table className="t">
            <thead><tr><th>Role</th><th>Mana per attack</th><th>Other</th></tr></thead>
            <tbody>
              <tr><td>Tank</td><td>{R.tankManaPerAttack}</td><td>Gains mana when taking damage (1% of pre- + 3% of post-mitigation damage, max {R.manaDamageCap} per hit). More likely to be targeted.</td></tr>
              <tr><td>Caster</td><td>{R.casterManaPerAttack}</td><td>+{R.casterManaRegen} mana per second.</td></tr>
              <tr><td>Fighter</td><td>{R.manaPerAttack}</td><td>+5–30% attack speed by game stage — the sandbox has no stages and uses {R.fighterAsPct}% (editable).</td></tr>
              <tr><td>Carry</td><td>{R.manaPerAttack}</td><td>—</td></tr>
              <tr><td>Reaper</td><td>{R.manaPerAttack}</td><td>Takes {R.reaperDamageReduction}% less damage from enemies other than its target.</td></tr>
              <tr><td>Specialist</td><td>own rule</td><td>Caitlyn / Master Yi count attacks, Gnar builds Rage, Kayle has no mana.</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 6 }}>After casting, a unit can’t gain mana for {R.manaLockTime} s (mana lock); mana above the maximum carries over to the next cast.</p>
        </section>

        <section>
          <h3>Traits and star levels</h3>
          <p>
            Traits are counted per side (duplicate champions count once; Elder Dragon adds +2 Riftbeast) and their bonuses are applied at the start of combat.
            A few are dynamic: Lunar checks adjacency, Rapidfire stacks attack speed, Riftbeast 7 grows every 5 s, Vanguard shields again below 50% HP, Eclipse executes, Flora Fatalis and Old Growth react to deaths.
            Each trait carries a status:
          </p>
          <ul>
            {(['simulated', 'approximated', 'not-simulated'] as const).map((k) => <li key={k}>{STATUS_HELP[k]}</li>)}
          </ul>
          <p>Any trait can be switched off for testing. Star levels use each unit’s per-star Health and AD from the data (roughly ×1.8 Health and ×1.5 AD per star; 3★ 4- and 5-costs get Riot’s extra boost).</p>
        </section>

        <section>
          <h3>Same as TFT vs. simplified</h3>
          <table className="t">
            <tbody>
              <tr><td><span className="chip good">Same rules</span></td><td>Unit stats per star, armor/MR formula, crits, durability, damage amp, shields, omnivamp, role mana rules, mana lock and overflow, trait breakpoints and values, hex board size, nearest-target walking.</td></tr>
              <tr><td><span className="chip warn">Simplified</span></td><td>Abilities reduced to their main numbers (channels become damage over time, cones and lines become small areas, some passives skipped); casts are instant; movement speed and attack wind-up are generic; summons are folded into abilities.</td></tr>
              <tr><td><span className="chip">Left out</span></td><td>Items, augments, shop, economy, Wisps, player choices (Primal, Avatar), summoned units, the stage-based Fighter bonus, overtime damage.</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>What about the “DPS” stat on op.gg and wiki pages?</h3>
          <p>
            It is just <b>Attack Damage × Attack Speed</b> (e.g. Pebbles 35 × 0.8 = 28). It is a quick summary of auto-attack damage per second
            before crits, armor, abilities and traits — useful to compare units at a glance, but it says nothing about how a fight plays out. The sandbox doesn’t store it;
            it simulates the attacks themselves, so the effective damage per second appears in the damage meter after a fight.
          </p>
        </section>

        <section>
          <h3>Where the numbers come from</h3>
          <p>
            Patch 18.5 data (incl. mid-patch changes up to 27 Oct 2026) was collected by two independent research agents using different sources (A: op.gg, metabot.gg, tftraits.com, patch notes;
            B: LoL Wiki, tft.tools, leagueofgraphs, patch notes) and compared with the prototype’s data. Costs were checked against Riot’s Data Dragon. Each unit shows its verification status in the Unit tab.
          </p>
        </section>
      </div>
    </Modal>
  );
}
