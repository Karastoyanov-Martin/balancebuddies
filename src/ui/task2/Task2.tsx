import { useMemo, useState } from 'react';
import type { Community } from '../../agents/analysis';
import { buildBrief } from '../../agents/brief';
import { parseLimits } from '../../sim/patch';
import { loadDemoTask1 } from '../../store/demo';
import { uid, useProject } from '../../store/project';
import { AGENT_COLORS, Icon, JsonView, Robot, SimulatedTag, download } from '../common';

const COMM_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6', '#eda100', '#008300', '#e34948'];

export default function Task2() {
  const s = useProject();
  const issue = s.issues.find((i) => i.id === s.selectedIssueId);
  if (!issue) {
    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <h2>No issue selected yet</h2>
        <p className="muted" style={{ marginTop: 6 }}>Core Task 2 starts from the issue you select in Task 1.</p>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={() => s.go('t1')}>Go to Task 1</button>
          <button className="btn" onClick={loadDemoTask1}>Use the demo issue</button>
        </div>
      </div>
    );
  }
  const stage = s.t2Stage;
  return (
    <div>
      <div className="page-head">
        <Robot size={46} color={AGENT_COLORS.setup} />
        <div className="grow">
          <h1>Core Task 2 · Configure perspectives and design priorities</h1>
          <p>The Setup Assistant suggests which player communities this issue affects. You decide who is represented, how much each community matters, and the limits any proposal must respect. The result is a negotiation brief for the perspective agents.</p>
        </div>
      </div>
      <div className="card soft" style={{ marginBottom: 14 }}>
        <div className="row">
          <span className="chip blue">Selected issue</span>
          <b className="grow">{issue.title}</b>
          <button className="btn xs ghost" onClick={() => { s.set({ t1Stage: 'review' }); s.go('t1'); }}>Change</button>
        </div>
      </div>
      <div className="substeps">
        {(['perspectives', 'priorities', 'brief'] as const).map((st, i) => (
          <button key={st} className={`substep ${stage === st ? 'on' : ''} ${['perspectives', 'priorities', 'brief'].indexOf(stage) > i || (st === 'brief' && s.briefApproved) ? 'done' : ''}`} onClick={() => s.set({ t2Stage: st })}>
            <span className="n">{i + 1}</span>
            {['Review & refine perspectives', 'Weights, priorities & limits', 'Confirm the brief'][i]}
          </button>
        ))}
      </div>
      {stage === 'perspectives' && <Perspectives />}
      {stage === 'priorities' && <Priorities />}
      {stage === 'brief' && <Brief />}
    </div>
  );
}

function Perspectives() {
  const s = useProject();
  const upd = (id: string, fn: (c: Community) => Community) => s.set({ communities: s.communities.map((c) => (c.id === id ? fn(c) : c)) });
  const [lastRemoved, setLastRemoved] = useState<{ c: Community; at: number } | null>(null);
  const removeCommunity = (c: Community) => {
    const at = s.communities.findIndex((x) => x.id === c.id);
    s.set({ communities: s.communities.filter((x) => x.id !== c.id) });
    setLastRemoved({ c, at });
    s.remember('T2', `Community removed: ${c.name}`, c.description);
  };
  const undoRemove = () => {
    if (!lastRemoved) return;
    const arr = [...s.communities];
    arr.splice(Math.min(lastRemoved.at, arr.length), 0, lastRemoved.c);
    s.set({ communities: arr });
    setLastRemoved(null);
  };
  const addCommunity = () => {
    const id = `custom-${uid()}`;
    s.set({
      communities: [
        ...s.communities,
        { id, name: 'New community', description: 'Describe who they are', concerns: ['Main concern'], evidence: [], representatives: [{ id: `${id}-1`, name: 'Representative', need: 'Main need' }], weight: 10, included: true, temperament: 'Neutral' },
      ],
    });
  };
  return (
    <div className="stack">
      <div className="banner info">
        <Robot size={28} color={AGENT_COLORS.setup} />
        <div>
          <b>Setup Assistant:</b> based on the selected issue and the {s.sources.reduce((a, x) => a + (x.posts?.length ?? 0), 0)} feedback posts, I suggest these communities.
          Suggestions marked <i>included</i> appear in feedback about this issue. You can add, remove or split them — e.g. two representatives when one community has different needs.
          <span style={{ marginLeft: 6 }}><SimulatedTag>Template-based suggestions</SimulatedTag></span>
        </div>
      </div>
      {lastRemoved && (
        <div className="banner">
          <Icon.info />
          <div className="grow small">Removed <b>{lastRemoved.c.name}</b>.</div>
          <button className="btn xs" onClick={undoRemove}>Undo</button>
          <button className="btn xs ghost" onClick={() => setLastRemoved(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
      <div className="grid2">
        {s.communities.map((c, idx) => (
          <div key={c.id} className="card" style={{ borderTop: `4px solid ${COMM_COLORS[idx % COMM_COLORS.length]}`, opacity: c.included ? 1 : 0.6 }}>
            <div className="row">
              <Robot size={34} color={COMM_COLORS[idx % COMM_COLORS.length]} />
              <input className="input bold grow" value={c.name} onChange={(e) => upd(c.id, (x) => ({ ...x, name: e.target.value }))} aria-label="Community name" />
              <label className="row small" style={{ gap: 5 }} title="Excluded communities stay on this page but get no agent in the negotiation">
                <input type="checkbox" checked={c.included} onChange={(e) => upd(c.id, (x) => ({ ...x, included: e.target.checked }))} /> include
              </label>
              <button className="btn xs ghost danger" onClick={() => removeCommunity(c)} aria-label={`Remove ${c.name}`} title="Remove this community"><Icon.trash /></button>
            </div>
            <input className="input small" style={{ marginTop: 8 }} value={c.description} onChange={(e) => upd(c.id, (x) => ({ ...x, description: e.target.value }))} aria-label="Description" />
            <h4 style={{ marginTop: 10 }}>Key concerns</h4>
            {c.concerns.map((k, i) => (
              <div key={i} className="row" style={{ marginTop: 6 }}>
                <span className="small muted">•</span>
                <input className="input small grow" value={k} placeholder="What this community cares about" aria-label={`Concern ${i + 1}`}
                  onChange={(e) => upd(c.id, (x) => ({ ...x, concerns: x.concerns.map((y, j) => (j === i ? e.target.value : y)) }))} />
                <button className="btn xs ghost" disabled={c.concerns.length <= 1} onClick={() => upd(c.id, (x) => ({ ...x, concerns: x.concerns.filter((_, j) => j !== i) }))} aria-label="Remove concern" title={c.concerns.length <= 1 ? 'A community needs at least one concern' : 'Remove concern'}><Icon.trash /></button>
              </div>
            ))}
            <button className="btn xs" style={{ marginTop: 6 }} onClick={() => upd(c.id, (x) => ({ ...x, concerns: [...x.concerns, ''] }))}><Icon.plus /> Add concern</button>
            {c.evidence.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary className="small">Supporting evidence ({c.evidence.length})</summary>
                {c.evidence.map((e, i) => <div key={i} className="quote" style={{ marginTop: 6 }}>{e}</div>)}
              </details>
            )}
            <h4 style={{ marginTop: 10 }}>Representatives</h4>
            {c.representatives.map((r) => (
              <div key={r.id} className="row" style={{ marginTop: 6 }}>
                <input className="input small" style={{ width: 140 }} value={r.name} onChange={(e) => upd(c.id, (x) => ({ ...x, representatives: x.representatives.map((y) => (y.id === r.id ? { ...y, name: e.target.value } : y)) }))} aria-label="Representative name" />
                <input className="input small grow" value={r.need} onChange={(e) => upd(c.id, (x) => ({ ...x, representatives: x.representatives.map((y) => (y.id === r.id ? { ...y, need: e.target.value } : y)) }))} aria-label="Specific need" />
                <button className="btn xs ghost" disabled={c.representatives.length <= 1} onClick={() => upd(c.id, (x) => ({ ...x, representatives: x.representatives.filter((y) => y.id !== r.id) }))} aria-label="Remove representative"><Icon.trash /></button>
              </div>
            ))}
            <button className="btn xs" style={{ marginTop: 8 }} onClick={() => upd(c.id, (x) => ({ ...x, representatives: [...x.representatives, { id: `${x.id}-${uid()}`, name: `${x.name.split(' ')[0]} rep ${x.representatives.length + 1}`, need: 'A different need within this community' }] }))}>
              <Icon.plus /> Split: add representative
            </button>
          </div>
        ))}
        <button className="card" style={{ borderStyle: 'dashed', cursor: 'pointer', display: 'grid', placeItems: 'center', minHeight: 140, background: 'transparent' }} onClick={addCommunity}>
          <span className="row bold"><Icon.plus /> Add a community</span>
        </button>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {!s.communities.some((c) => c.included) && <span className="small muted grow" style={{ alignSelf: 'center' }}>Include at least one community to continue.</span>}
        <button className="btn primary" disabled={!s.communities.some((c) => c.included)} onClick={() => { s.set({ t2Stage: 'priorities' }); s.remember('T2', 'Perspectives refined', s.communities.filter((c) => c.included).map((c) => `• ${c.name} (${c.representatives.length} rep)`).join('\n')); }}>
          Next: weights, priorities & limits <Icon.arrow />
        </button>
      </div>
    </div>
  );
}

function Priorities() {
  const s = useProject();
  const included = s.communities.filter((c) => c.included);
  const total = included.reduce((a, c) => a + c.weight, 0) || 1;
  const interpreted = useMemo(() => parseLimits(s.limits, s.working), [s.limits, s.working]);
  const [newP, setNewP] = useState('');
  const move = (i: number, d: number) => {
    const arr = [...s.priorities];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    s.set({ priorities: arr });
  };
  return (
    <div className="stack">
      <div className="grid2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><Icon.users /><h3 className="grow">Community weights</h3></div>
          <p className="small muted" style={{ marginBottom: 10 }}>How much each community’s view should count in negotiation. Representation and weight are separate: splitting a community into more representatives does <b>not</b> increase its influence.</p>
          {included.map((c) => {
            const idx = s.communities.indexOf(c);
            return (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div className="row small">
                  <span className="status-dot" style={{ background: COMM_COLORS[idx % COMM_COLORS.length] }} />
                  <b className="grow">{c.name}</b>
                  <span className="muted">{c.representatives.length} rep</span>
                  <span className="bold" style={{ width: 44, textAlign: 'right' }}>{Math.round((c.weight / total) * 100)}%</span>
                </div>
                <input type="range" className="slider" min={0} max={100} value={c.weight} aria-label={`${c.name} weight`} onChange={(e) => s.set({ communities: s.communities.map((x) => (x.id === c.id ? { ...x, weight: +e.target.value } : x)) })} />
              </div>
            );
          })}
          <div className="row" style={{ height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }} aria-label="Weight distribution">
            {included.map((c) => {
              const idx = s.communities.indexOf(c);
              return <div key={c.id} title={`${c.name}: ${Math.round((c.weight / total) * 100)}%`} style={{ width: `${(c.weight / total) * 100}%`, height: '100%', background: COMM_COLORS[idx % COMM_COLORS.length] }} />;
            })}
          </div>
        </div>
        <div className="col">
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Design priorities (ranked)</h3>
            {s.priorities.map((p, i) => (
              <div key={p.id} className="row" style={{ marginBottom: 6 }}>
                <span className="chip blue">{i + 1}</span>
                <input className="input small grow" value={p.text} onChange={(e) => s.set({ priorities: s.priorities.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)) })} />
                <button className="btn xs ghost" onClick={() => move(i, -1)} aria-label="Move up"><Icon.up /></button>
                <button className="btn xs ghost" onClick={() => move(i, 1)} aria-label="Move down"><Icon.down /></button>
                <button className="btn xs ghost" onClick={() => s.set({ priorities: s.priorities.filter((x) => x.id !== p.id) })} aria-label="Remove"><Icon.trash /></button>
              </div>
            ))}
            <div className="row">
              <input className="input small grow" placeholder="Add a priority…" value={newP} onChange={(e) => setNewP(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newP.trim()) { s.set({ priorities: [...s.priorities, { id: uid(), text: newP.trim() }] }); setNewP(''); } }} />
              <button className="btn xs" disabled={!newP.trim()} onClick={() => { s.set({ priorities: [...s.priorities, { id: uid(), text: newP.trim() }] }); setNewP(''); }}><Icon.plus /></button>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Hard limits (plain English)</h3>
            <p className="small muted" style={{ marginBottom: 8 }}>One rule per line. Proposals must respect these. Numeric limits and locked units/traits are also enforced in the Task 4 sandbox.</p>
            <textarea className="textarea" rows={4} value={s.limits.join('\n')} onChange={(e) => s.set({ limits: e.target.value.split('\n') })} />
            <div className="banner info" style={{ marginTop: 8 }}>
              <Icon.info />
              <div className="small">
                Interpreted as: max change <b>{interpreted.maxPctChange != null ? `±${interpreted.maxPctChange}%` : 'none'}</b> · locked units <b>{interpreted.lockedUnits.join(', ') || 'none'}</b> · locked traits <b>{interpreted.lockedTraits.join(', ') || 'none'}</b>{interpreted.noNewMechanics ? ' · no new mechanics' : ''}
              </div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Negotiation format <span className="chip">still in design</span></h3>
            <div className="grid2">
              <label className="field">Max rounds<input className="input" type="number" min={1} max={10} value={s.format.maxRounds} onChange={(e) => s.set({ format: { ...s.format, maxRounds: Math.max(1, +e.target.value) } })} /></label>
              <label className="field">Turn order
                <select className="select" value={s.format.turnOrder} onChange={(e) => s.set({ format: { ...s.format, turnOrder: e.target.value as typeof s.format.turnOrder } })}>
                  <option value="round-robin">Round-robin</option>
                  <option value="weighted">Weighted by community weight</option>
                  <option value="moderator-picks">Moderator picks</option>
                </select>
              </label>
            </div>
            <label className="row small" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={s.format.independentFirst} onChange={(e) => s.set({ format: { ...s.format, independentFirst: e.target.checked } })} /> Agents assess the proposal independently before discussing
            </label>
            <label className="field" style={{ marginTop: 8 }}>Stopping rules (one per line)
              <textarea className="textarea" rows={3} value={s.format.stopRules.join('\n')} onChange={(e) => s.set({ format: { ...s.format, stopRules: e.target.value.split('\n') } })} />
            </label>
          </div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => s.set({ t2Stage: 'perspectives' })}><Icon.back /> Back</button>
        <button className="btn primary" onClick={() => s.set({ t2Stage: 'brief' })}>Generate the brief <Icon.arrow /></button>
      </div>
    </div>
  );
}

function Brief() {
  const s = useProject();
  const issue = s.issues.find((i) => i.id === s.selectedIssueId)!;
  const brief = useMemo(
    () => buildBrief({ issue, communities: s.communities, priorities: s.priorities.filter((p) => p.text.trim()), limits: s.limits, format: s.format, data: s.working, now: s.brief?.createdAt }),
    [issue, s.communities, s.priorities, s.limits, s.format, s.working, s.brief?.createdAt],
  );
  const json = JSON.stringify(brief, null, 2);
  const approve = () => {
    const b = { ...brief, createdAt: new Date().toISOString() };
    s.set({ brief: b, briefApproved: true });
    s.remember('T2', 'Negotiation brief approved', `${b.agents.length} perspective agents · ${b.designer.priorities.length} priorities · ${b.designer.hardLimits.text.length} hard limits`);
    s.go('t3');
  };
  return (
    <div className="grid2" style={{ gridTemplateColumns: '1fr 1.2fr', alignItems: 'start' }}>
      <div className="col">
        <div className="card">
          <div className="card-head">
            <Robot size={32} color={AGENT_COLORS.setup} />
            <h3 className="grow">Perspective agents in this brief</h3>
          </div>
          <table className="t">
            <thead><tr><th>Agent</th><th>Speaks for</th><th className="num">Vote share</th></tr></thead>
            <tbody>
              {brief.agents.map((a) => (
                <tr key={a.id}><td><b>{a.name}</b><div className="tiny muted">{a.community}</div></td><td className="small">{a.personality.speaksFor}</td><td className="num">{(a.voteShare * 100).toFixed(1)}%</td></tr>
              ))}
            </tbody>
          </table>
          <p className="tiny muted" style={{ marginTop: 6 }}>Vote share = community weight ÷ number of its representatives. A moderator (Developer Agent) checks proposals against your hard limits.</p>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Priorities & limits</h3>
          <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>{brief.designer.priorities.map((p) => <li key={p.rank}>{p.text}</li>)}</ol>
          <div className="sep" />
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{brief.designer.hardLimits.text.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
        <div className="row">
          <button className="btn" onClick={() => s.set({ t2Stage: 'priorities' })}><Icon.back /> Edit</button>
          <div className="grow" />
          <button className="btn primary" onClick={approve}><Icon.check /> Approve brief</button>
        </div>
        {s.briefApproved && <div className="banner good"><Icon.check /> Approved and saved to shared memory. You can still edit and re-approve during later iterations.</div>}
      </div>
      <div className="card">
        <div className="card-head">
          <h3 className="grow">negotiation-brief.json</h3>
          <button className="btn sm" onClick={() => navigator.clipboard?.writeText(json)}><Icon.copy /> Copy</button>
          <button className="btn sm" onClick={() => download('negotiation-brief.json', json)}><Icon.download /> Download</button>
        </div>
        <JsonView value={brief} />
      </div>
    </div>
  );
}
