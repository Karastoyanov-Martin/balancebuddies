import { useState } from 'react';
import { useProject } from '../store/project';
import HowItWorks from './HowItWorks';
import { AGENT_COLORS, Icon, Robot } from './common';

const TASKS = [
  { id: 't1' as const, n: 1, color: 'var(--brand-soft)', ink: 'var(--brand)', title: 'Investigate and frame the balance issue', text: 'Upload gameplay statistics and player feedback (or run a simulated web crawl). Quantitative and Qualitative Agents analyse it; a Synthesizing Agent proposes balance-issue candidates you review, comment on and select.' },
  { id: 't2' as const, n: 2, color: 'var(--teal-soft)', ink: 'var(--teal)', title: 'Configure perspectives and design priorities', text: 'A Setup Assistant suggests the player communities affected by the issue. You refine representatives, set weights, priorities and hard limits in plain English, and approve a negotiation brief (JSON).' },
  { id: 't3' as const, n: 3, color: 'var(--purple-soft)', ink: 'var(--purple)', title: 'Negotiate a proposal (not in this prototype)', text: 'Multi-round negotiation between perspective agents is out of scope for the low-fi stage. A placeholder lets you pick a candidate change (or write your own) to carry into testing.' },
  { id: 't4' as const, n: 4, color: 'var(--accent-soft)', ink: '#b45a17', title: 'Choose a change, test it, and reassess', text: 'A simplified, mathematical TFT combat sandbox with all 65 Set 18 units. Place units, edit trait/unit numbers, watch HP and mana change, A/B-test baseline vs. your change, compare expected vs. actual, and decide.' },
];

export default function Home() {
  const go = useProject((s) => s.go);
  const [how, setHow] = useState(false);
  return (
    <div className="stack" style={{ maxWidth: 1100 }}>
      <div className="card hero">
        <div className="col">
          <h4>Problem</h4>
          <h1 style={{ fontSize: 20, lineHeight: 1.35 }}>
            Game designers struggle to choose balance changes that reduce dominant strategies without weakening viable options for other players,
            because gameplay performance and player experiences differ across ranks and play styles.
          </h1>
          <p className="muted">
            BalanceBuddies is a multi-agent decision-support tool. The designer stays the decision-maker; agents investigate evidence, keep
            community perspectives separate and help test changes. This prototype walks through Core Tasks 1, 2 and 4.
          </p>
          <div className="row wrap" style={{ marginTop: 6 }}>
            <button className="btn primary" onClick={() => go('t1')}>Start the walk-through <Icon.arrow /></button>
            <button className="btn" onClick={() => go('t4')}>Jump to the combat sandbox</button>
            <button className="btn ghost" onClick={() => setHow(true)}>How the simulation works</button>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 4 }}>
          <Robot size={64} color={AGENT_COLORS.quant} label="Quantitative Agent" />
          <Robot size={64} color={AGENT_COLORS.qual} label="Qualitative Agent" />
          <Robot size={64} color={AGENT_COLORS.synth} label="Synthesizing Agent" />
          <Robot size={64} color={AGENT_COLORS.setup} label="Setup Assistant" />
        </div>
      </div>

      <div className="grid2">
        {TASKS.map((t) => (
          <div key={t.id} className="task-card" onClick={() => go(t.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(t.id)}>
            <div className="n" style={{ background: t.color, color: t.ink }}>{t.n}</div>
            <div>
              <h3>{t.title}</h3>
              <p className="small" style={{ color: 'var(--ink-2)', marginTop: 4 }}>{t.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="card flat">
          <h3 style={{ marginBottom: 8 }}>What is real vs. simulated</h3>
          <table className="t">
            <tbody>
              <tr><td>File upload, CSV parsing, filtering, de-duplication, theme clustering, statistics</td><td><span className="chip good">Real (conventional code)</span></td></tr>
              <tr><td>Web crawl, agent “thinking” and wording of findings</td><td><span className="chip orange">Simulated</span></td></tr>
              <tr><td>Community suggestions, negotiation brief JSON</td><td><span className="chip orange">Template-based</span></td></tr>
              <tr><td>Multi-agent negotiation (Task 3)</td><td><span className="chip">Placeholder</span></td></tr>
              <tr><td>Combat simulation, trait math, A/B testing (Task 4)</td><td><span className="chip good">Real (simplified rules)</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="card flat">
          <h3 style={{ marginBottom: 8 }}>Sandbox rules (Task 4)</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)' }}>
            <li><b>No items</b> — units fight with base stats + traits only.</li>
            <li><b>Positions can be moved</b> before and after each simulated fight.</li>
            <li><b>No shop</b> — spawn any unit at 1★, 2★ or 3★.</li>
            <li><b>No economy</b> — gold, interest, Wisps and essence are ignored.</li>
            <li>Abilities are <b>simplified</b> to their core numbers; each trait is tagged simulated / approximated / not simulated.</li>
            <li><b>Set 18 roles</b> drive mana: Tanks 5/attack + mana from damage, Casters 7/attack + 2/s, others 10/attack; 1 s mana lock after casting.</li>
            <li>Data: all 65 units and 36 traits of Set 18 “Enchanted Wilds”, patch 18.5 incl. mid-patches to 27 Oct 2026, cross-checked by two independent research agents (op.gg, metabot.gg, tftraits.com, LoL Wiki, tft.tools, Riot patch notes) and Riot Data Dragon.</li>
          </ul>
        </div>
      </div>
      <p className="tiny muted">
        BalanceBuddies is a non-commercial university prototype and isn’t endorsed by Riot Games. It doesn’t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, Teamfight Tactics and all associated properties are trademarks or registered trademarks of Riot Games, Inc. Champion icons are loaded from Riot’s public Data Dragon service.
      </p>
      {how && <HowItWorks onClose={() => setHow(false)} />}
    </div>
  );
}
