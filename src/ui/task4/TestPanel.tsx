import { useMemo, useState } from 'react';
import { baselineData } from '../../data';
import { runBatchAsync } from '../../sim/batch';
import { checkLimits, diffData, parseLimits } from '../../sim/patch';
import type { Placement } from '../../sim/types';
import { uid, useProject, type TestRecord } from '../../store/project';
import { GroupedBars, HBars, Legend, type Series } from '../charts';
import { AGENT_COLORS, Icon, Robot } from '../common';
import { ciPts, verdict, type Verdict } from '../../sim/compare';

const SERIES: Series[] = [
  { key: 'base', label: 'Baseline 18.5', color: 'var(--series-1)' },
  { key: 'prop', label: 'Proposed', color: 'var(--series-2)' },
];

const VERDICT_TEXT: Record<Verdict, { cls: string; text: string }> = {
  'as-expected': { cls: 'good', text: 'The observed effect is inside the range you expected.' },
  smaller: { cls: '', text: 'The effect is weaker than expected.' },
  larger: { cls: '', text: 'The effect is stronger than expected — check for side effects.' },
  opposite: { cls: 'bad', text: 'The effect goes in the opposite direction to what you expected.' },
  inconclusive: { cls: '', text: 'The difference is within simulation noise (95% CI) — run more fights or reconsider the change.' },
};

export default function TestPanel({ placements, scenarioName }: { placements: Placement[]; scenarioName: string }) {
  const s = useProject();
  const [runs, setRuns] = useState(100);
  // 'fresh' = new random seeds every run (results vary a little between runs, like real games);
  // 'fixed' = always seeds 1…N, so the same test gives exactly the same numbers (repeatable)
  const [seedMode, setSeedMode] = useState<'fresh' | 'fixed'>('fresh');
  const [progress, setProgress] = useState<number | null>(null);
  const [exp, setExp] = useState<{ min: number; max: number }>(s.proposal?.expected ?? { min: -10, max: -2 });
  const [note, setNote] = useState('');
  const changes = useMemo(() => diffData(baselineData(), s.working), [s.working]);
  const violations = useMemo(() => checkLimits(changes, parseLimits(s.limits, s.working)), [changes, s.limits, s.working]);
  const last: TestRecord | undefined = s.tests[s.tests.length - 1];

  const blue = placements.filter((p) => p.team === 'A').length;
  const red = placements.filter((p) => p.team === 'B').length;
  const canRun = blue > 0 && red > 0 && progress == null;

  const run = async () => {
    setProgress(0);
    const total = runs * 2;
    const seedStart = seedMode === 'fixed' ? 1 : 1 + Math.floor(Math.random() * 1_000_000);
    // both sides use the SAME seeds, so the only difference between them is your change
    const baseline = await runBatchAsync(baselineData(), placements, runs, (d) => setProgress(d / total), seedStart, s.rules);
    const proposed = await runBatchAsync(s.working, placements, runs, (d) => setProgress((runs + d) / total), seedStart, s.rules);
    const rec: TestRecord = {
      id: uid(), at: new Date().toISOString(), label: s.proposal?.title ?? (changes.length ? 'Designer edits' : 'Baseline check'),
      runs, scenario: scenarioName, baseline, proposed, changes, expected: exp, seedStart,
    };
    s.set({ tests: [...useProject.getState().tests, rec] });
    const d = (proposed.winRateA - baseline.winRateA) * 100;
    s.remember('T4', `Test #${useProject.getState().tests.length}: ${rec.label}`, `${runs} fights per side (seeds ${seedStart}–${seedStart + runs - 1}) · blue win ${(baseline.winRateA * 100).toFixed(0)}% → ${(proposed.winRateA * 100).toFixed(0)}% (Δ ${d >= 0 ? '+' : ''}${d.toFixed(1)} pts ± ${ciPts(baseline, proposed).toFixed(1)})\nExpected Δ ${exp.min} to ${exp.max} pts · ${changes.length} changes${violations.length ? ` · ${violations.length} limit violations` : ''}`);
    setProgress(null);
  };

  const decide = (choice: 'keep' | 'investigate' | 'reopen') => {
    s.set({ decisions: [...s.decisions, { id: uid(), at: new Date().toISOString(), testId: last?.id ?? null, choice, note }] });
    const label = { keep: 'Keep the change', investigate: 'Investigate further', reopen: 'Reopen negotiation' }[choice];
    s.remember('T4', `Decision: ${label}`, `${last ? `Based on test “${last.label}”. ` : ''}${note}`);
    setNote('');
    if (choice === 'investigate') { s.set({ t1Stage: 'review' }); s.go('t1'); }
    if (choice === 'reopen') s.go('t3');
  };

  return (
    <div className="col">
      <div className="row">
        <Robot size={30} color={AGENT_COLORS.test} />
        <div className="grow small">
          <b>Test assistant</b> — runs the same seeded fights on the 18.5 baseline and on your proposed numbers, so only the change differs.
        </div>
      </div>
      <div className="card soft" style={{ padding: 10 }}>
        <div className="small"><b>Proposal:</b> {s.proposal?.title ?? 'none (free exploration)'} · <b>{changes.length}</b> changed value{changes.length === 1 ? '' : 's'}{violations.length ? <span style={{ color: 'var(--bad)' }}> · {violations.length} limit violation(s)</span> : null}</div>
        <div className="small" style={{ marginTop: 4 }}><b>Board:</b> {scenarioName} · {blue} blue vs {red} red</div>
      </div>
      <div className="grid2" style={{ gap: 8 }}>
        <label className="field">Fights per side
          <select className="select" value={runs} onChange={(e) => setRuns(+e.target.value)}>
            {[50, 100, 200, 400].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="field">Expected Δ blue win rate (pts)
          <div className="row" style={{ gap: 4 }}>
            <input className="input num" type="number" value={exp.min} onChange={(e) => setExp({ ...exp, min: +e.target.value })} aria-label="Expected minimum" />
            <span>to</span>
            <input className="input num" type="number" value={exp.max} onChange={(e) => setExp({ ...exp, max: +e.target.value })} aria-label="Expected maximum" />
          </div>
        </label>
      </div>
      <div className="col small" style={{ gap: 4 }}>
        <span className="muted">Seeds (the dice rolls of each fight)</span>
        <label className="row" style={{ gap: 4 }} title="Every run draws new random seeds, so repeated runs differ a little — shows how much of the result is luck">
          <input type="radio" name="seedmode" checked={seedMode === 'fresh'} onChange={() => setSeedMode('fresh')} /> new random seeds each run
        </label>
        <label className="row" style={{ gap: 4 }} title="Always seeds 1…N: running the same test again gives exactly the same numbers">
          <input type="radio" name="seedmode" checked={seedMode === 'fixed'} onChange={() => setSeedMode('fixed')} /> fixed seeds 1–{runs} (repeatable)
        </label>
      </div>
      <button className="btn primary" disabled={!canRun} onClick={run}>
        <Icon.flask /> {progress != null ? `Running… ${Math.round(progress * 100)}%` : `Run A/B test · ${runs} baseline + ${runs} proposed fights`}
      </button>
      <div className="tiny muted">
        Each of the {runs} fights is played twice — once with the 18.5 numbers, once with yours — using the same seed (the same dice rolls for crits and target ties),
        so any difference comes from your change, not luck.
      </div>
      {progress != null && <div className="meter"><i style={{ width: `${progress * 100}%` }} /></div>}
      {!canRun && progress == null && <div className="tiny muted">Place at least one unit on each side.</div>}

      {last && <Results rec={last} />}

      {last && (
        <div className="card" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 6 }}>Reassess</h3>
          <textarea className="textarea" placeholder="Why? e.g. effect too small in 22 s fights — growth only ticks 4 times; look at long-fight data." value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row wrap" style={{ marginTop: 8 }}>
            <button className="btn sm primary" onClick={() => decide('keep')}><Icon.check /> Keep the change</button>
            <button className="btn sm" onClick={() => decide('investigate')}>Investigate further</button>
            <button className="btn sm" onClick={() => decide('reopen')}>Reopen negotiation</button>
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>Decisions are saved with the test in shared memory. Reopening negotiation is always your call — nothing restarts automatically.</div>
        </div>
      )}

      {s.tests.length > 1 && (
        <div>
          <h4 style={{ marginBottom: 4 }}>Test history</h4>
          <table className="t">
            <thead><tr><th>#</th><th>Change</th><th className="num">Blue win</th><th className="num">Δ pts</th></tr></thead>
            <tbody>
              {s.tests.map((t, i) => {
                const d = (t.proposed.winRateA - t.baseline.winRateA) * 100;
                return (
                  <tr key={t.id}>
                    <td>{i + 1}</td>
                    <td className="small">{t.label}<div className="tiny muted">{t.changes.length} changes · {t.runs} + {t.runs} fights · seeds {t.seedStart ?? 1}–{(t.seedStart ?? 1) + t.runs - 1}</div></td>
                    <td className="num">{(t.baseline.winRateA * 100).toFixed(0)}% → {(t.proposed.winRateA * 100).toFixed(0)}%</td>
                    <td className="num">{d >= 0 ? '+' : ''}{d.toFixed(1)} ± {ciPts(t.baseline, t.proposed).toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Results({ rec }: { rec: TestRecord }) {
  const data = useProject((s) => s.working);
  const { baseline: b, proposed: p } = rec;
  const delta = (p.winRateA - b.winRateA) * 100;
  const ci = ciPts(b, p);
  const v = verdict(delta, ci, rec.expected);
  const outcome = {
    'Blue wins': { base: b.winRateA * 100, prop: p.winRateA * 100 },
    'Red wins': { base: b.winRateB * 100, prop: p.winRateB * 100 },
    Draws: { base: (b.draws / b.runs) * 100, prop: (p.draws / p.runs) * 100 },
  };
  const rows = b.units.slice().sort((x, y) => Math.max(y.avgDamage, p.units.find((u) => u.uid === y.uid)?.avgDamage ?? 0) - Math.max(x.avgDamage, p.units.find((u) => u.uid === x.uid)?.avgDamage ?? 0)).map((u) => u.uid);
  const values = Object.fromEntries(b.units.map((u) => [u.uid, { base: u.avgDamage, prop: p.units.find((x) => x.uid === u.uid)?.avgDamage ?? 0 }]));
  const nameOf = (id: string) => {
    const u = b.units.find((x) => x.uid === id)!;
    return `${data.units[u.unitId]?.name ?? u.unitId} ${u.star}★`;
  };
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="row">
        <h3 className="grow">Results · {rec.runs} fights per side</h3>
        <span className="tiny muted" style={{ marginRight: 8 }}>seeds {rec.seedStart ?? 1}–{(rec.seedStart ?? 1) + rec.runs - 1}</span>
        <span className="tiny muted">{new Date(rec.at).toLocaleTimeString()}</span>
      </div>
      <div className="grid3" style={{ gap: 8, marginTop: 8 }}>
        <div className="stat"><div className="v">{(b.winRateA * 100).toFixed(0)}% → {(p.winRateA * 100).toFixed(0)}%</div><div className="l">Blue win rate</div></div>
        <div className="stat"><div className="v" style={{ color: delta < 0 ? 'var(--bad)' : delta > 0 ? 'var(--good)' : undefined }}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</div><div className="l">Δ pts (±{ci.toFixed(1)}, 95% CI, paired seeds)</div></div>
        <div className="stat"><div className="v">{b.avgDuration.toFixed(1)}s → {p.avgDuration.toFixed(1)}s</div><div className="l">Avg fight length</div></div>
      </div>
      <div className={`banner ${VERDICT_TEXT[v].cls}`} style={{ marginTop: 10 }}>
        <Icon.info />
        <div><b>Expected {rec.expected ? `${rec.expected.min} to ${rec.expected.max}` : '—'} pts · actual {delta >= 0 ? '+' : ''}{delta.toFixed(1)} pts.</b> {VERDICT_TEXT[v].text}</div>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <h4 className="grow">Fight outcomes (%)</h4>
        <Legend series={SERIES} />
      </div>
      <GroupedBars groups={Object.keys(outcome)} series={SERIES} values={outcome} max={100} format={(x) => `${x.toFixed(0)}`} labelGroup="Blue wins" height={170} />
      <div className="row" style={{ marginTop: 10 }}>
        <h4 className="grow">Average damage per unit</h4>
        <Legend series={SERIES} />
      </div>
      <HBars rows={rows} series={SERIES} values={values} rowLabel={nameOf} rowColor={(id) => (b.units.find((u) => u.uid === id)?.team === 'A' ? '#2a78d6' : '#e34948')} format={(x) => Math.round(x).toLocaleString()} />
      <details style={{ marginTop: 8 }}>
        <summary className="small">Table view</summary>
        <table className="t" style={{ marginTop: 6 }}>
          <thead><tr><th>Unit</th><th className="num">Dmg base</th><th className="num">Dmg prop</th><th className="num">Survive base</th><th className="num">Survive prop</th></tr></thead>
          <tbody>
            {rows.map((id) => {
              const ub = b.units.find((u) => u.uid === id)!;
              const up = p.units.find((u) => u.uid === id)!;
              return <tr key={id}><td>{nameOf(id)}</td><td className="num">{Math.round(ub.avgDamage)}</td><td className="num">{Math.round(up.avgDamage)}</td><td className="num">{Math.round(ub.survivalRate * 100)}%</td><td className="num">{Math.round(up.survivalRate * 100)}%</td></tr>;
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}
