import { useMemo, useState } from 'react';
import { baselineData } from '../../data';
import { PROPOSALS, SCENARIOS, type CandidateProposal } from '../../mock/proposals';
import { checkLimits, diffData, parseLimits } from '../../sim/patch';
import { loadDemoTask2 } from '../../store/demo';
import { useProject } from '../../store/project';
import { Icon, Robot } from '../common';

const STANCE = { support: 'good', object: 'bad', neutral: '' } as const;
const ROBOT_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6', '#eda100'];

export default function Task3() {
  const s = useProject();
  const limits = useMemo(() => parseLimits(s.limits, s.working), [s.limits, s.working]);
  const [custom, setCustom] = useState('');

  const violations = (p: CandidateProposal) => {
    const d = baselineData();
    p.apply(d);
    return checkLimits(diffData(baselineData(), d), limits);
  };

  const test = (p: CandidateProposal) => {
    const d = baselineData();
    p.apply(d);
    const sc = SCENARIOS.find((x) => x.id === p.scenario)!;
    s.set({
      working: d,
      placements: sc.placements.map((x) => ({ ...x, hex: { ...x.hex } })),
      scenarioName: sc.name,
      proposal: { id: p.id, title: p.title, origin: 'placeholder', rationale: `${p.change}. ${p.rationale}`, expected: p.expected },
    });
    s.remember('T3', `Proposal chosen for testing: ${p.title}`, `${p.change}\nExpected blue win-rate change: ${p.expected.min} to ${p.expected.max} pts\nRemaining concern: ${p.remaining}`);
    s.go('t4');
  };

  const own = () => {
    s.set({
      working: baselineData(),
      placements: SCENARIOS[0].placements.map((x) => ({ ...x, hex: { ...x.hex } })),
      scenarioName: SCENARIOS[0].name,
      proposal: { id: 'own', title: custom.trim() || 'Designer’s own change', origin: 'designer', rationale: 'Written by the designer; edit numbers in the Balance editor.' },
    });
    s.remember('T3', `Designer wrote own proposal: ${custom.trim() || 'untitled'}`);
    s.go('t4');
  };

  return (
    <div className="stack" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <Robot size={46} color="#6a4fd1" />
        <div className="grow">
          <h1>Core Task 3 · Negotiate a proposal <span className="chip">placeholder</span></h1>
          <p>
            In the full system, the perspective agents from your brief assess a proposal independently, then exchange objections and revisions under a
            Developer Agent that enforces your limits. That negotiation is <b>out of scope for this low-fidelity prototype</b>. Below are example
            outcomes so the walk path can continue into testing.
          </p>
        </div>
      </div>

      {!s.briefApproved && (
        <div className="banner">
          <Icon.warn />
          <div className="grow">No approved brief yet — the stances below are illustrative.</div>
          <button className="btn xs" onClick={() => s.go('t2')}>Go to Task 2</button>
          <button className="btn xs" onClick={loadDemoTask2}>Use demo brief</button>
        </div>
      )}

      <div className="card soft">
        <div className="row wrap" style={{ justifyContent: 'center', gap: 18 }}>
          {(s.brief?.agents ?? []).map((a, i) => (
            <div key={a.id} className="col center" style={{ alignItems: 'center', gap: 4, width: 110 }}>
              <Robot size={44} color={ROBOT_COLORS[i % ROBOT_COLORS.length]} />
              <div className="tiny bold">{a.name}</div>
              <div className="tiny muted">{(a.voteShare * 100).toFixed(0)}% share</div>
            </div>
          ))}
          <div className="col center" style={{ alignItems: 'center', gap: 4, width: 110 }}>
            <Robot size={44} color="#1d2233" />
            <div className="tiny bold">Developer Agent</div>
            <div className="tiny muted">checks limits</div>
          </div>
        </div>
        <p className="small muted center" style={{ marginTop: 10 }}>Negotiation rounds would appear here (max {s.format.maxRounds} rounds, {s.format.turnOrder}).</p>
      </div>

      <h2>Candidate changes <span className="chip orange">mock negotiation output</span></h2>
      {PROPOSALS.map((p) => {
        const v = violations(p);
        return (
          <div className="card" key={p.id}>
            <div className="row">
              <h3 className="grow">{p.title}</h3>
              {v.length ? <span className="chip bad"><Icon.warn /> Breaks a hard limit</span> : <span className="chip good"><Icon.check /> Within limits</span>}
            </div>
            <p className="bold small" style={{ marginTop: 6 }}><code>{p.change}</code></p>
            <p className="small" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{p.rationale}</p>
            <div className="row wrap" style={{ marginTop: 10 }}>
              {p.stances.map((st) => (
                <span key={st.community} className={`chip ${STANCE[st.stance]}`} title={st.reason}>{st.community}: {st.stance}</span>
              ))}
            </div>
            <p className="small" style={{ marginTop: 8 }}><b>Remaining disagreement:</b> {p.remaining}</p>
            {v.length > 0 && <div className="banner bad" style={{ marginTop: 8 }}><Icon.warn /><div>Developer Agent: {[...new Set(v.map((x) => x.reason))].join('; ')}</div></div>}
            <div className="row" style={{ marginTop: 12 }}>
              <span className="small muted grow">Expected effect on the Riftbeast board’s win rate: {p.expected.min} to {p.expected.max} pts</span>
              <button className="btn primary sm" onClick={() => test(p)}>Test this change <Icon.arrow /></button>
            </div>
          </div>
        );
      })}
      <div className="card">
        <h3>Or write your own change</h3>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input grow" placeholder="e.g. Sentinel shield 375 → 340" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <button className="btn" onClick={own}>Open sandbox <Icon.arrow /></button>
        </div>
      </div>
    </div>
  );
}
