import { useCallback, useMemo, useRef, useState } from 'react';
import { qualAgent, quantAgent, RANK_BANDS, setupAssistant, synthAgent, type IssueCandidate, type QualReport, type QuantReport } from '../../agents/analysis';
import { diffIsEmpty, diffReports, reviseReport, type NoteIntent, type RemovedIssue, type ReportDiff } from '../../agents/revision';
import { feedbackFromFile, parseCsv, preprocessFeedback } from '../../agents/preprocess';
import { SAMPLE_FEEDBACK, type FeedbackPost } from '../../mock/feedback';
import { COMP_BY_RANK_CSV, UNIT_STATS_CSV } from '../../mock/stats';
import { uid, useProject, type Source } from '../../store/project';
import { AGENT_COLORS, AgentConsole, Icon, Robot, SimulatedTag, type ConsoleLine } from '../common';

const CRAWL_SOURCES = ['reddit/r/CompetitiveTFT', 'reddit/r/TeamfightTactics', 'official forum', 'patch-notes comments'] as const;

export function useEvidence() {
  const sources = useProject((s) => s.sources);
  return useMemo(() => {
    const tables = sources.filter((s) => s.type === 'stats' && s.text).map((s) => parseCsv(s.text!, s.name));
    const posts: FeedbackPost[] = sources.flatMap((s) => s.posts ?? []);
    return { tables, posts };
  }, [sources]);
}

export default function Task1() {
  const s = useProject();
  const stage = s.t1Stage;
  const canAnalyze = s.sources.length > 0;
  return (
    <div>
      <div className="page-head">
        <Robot size={46} color={AGENT_COLORS.synth} />
        <div className="grow">
          <h1>Core Task 1 · Investigate and frame the balance issue</h1>
          <p>Collect evidence, let the Quantitative and Qualitative Agents analyse it in parallel, then review the Synthesizing Agent’s issue candidates. You can ask for revisions as many times as you like before selecting an issue.</p>
        </div>
      </div>
      <div className="substeps">
        {(['collect', 'analyze', 'review'] as const).map((st, i) => (
          <button
            key={st}
            className={`substep ${stage === st ? 'on' : ''} ${(['collect', 'analyze', 'review'].indexOf(stage) > i || (st === 'review' && s.selectedIssueId)) ? 'done' : ''}`}
            disabled={(st === 'analyze' && !canAnalyze) || (st === 'review' && !s.issues.length)}
            onClick={() => s.set({ t1Stage: st })}
          >
            <span className="n">{i + 1}</span>
            {['Collect evidence', 'Agent analysis', 'Review report & select issue'][i]}
          </button>
        ))}
      </div>
      {stage === 'collect' && <Collect />}
      {stage === 'analyze' && <Analyze />}
      {stage === 'review' && <Review />}
    </div>
  );
}

// ───────────────────────── 1. Collect ─────────────────────────
function Collect() {
  const s = useProject();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { posts } = useEvidence();
  const pre = useMemo(() => preprocessFeedback(posts), [posts]);

  const addFiles = async (files: FileList | File[]) => {
    const added: Source[] = [];
    for (const f of Array.from(files)) {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      const base = { id: uid(), name: f.name, kind: 'upload' as const, size: f.size, addedAt: new Date().toISOString() };
      if (ext === 'csv') {
        const text = await f.text();
        added.push({ ...base, type: 'stats', text });
      } else if (['txt', 'md', 'json'].includes(ext)) {
        const text = await f.text();
        const ps = feedbackFromFile(f.name, text);
        added.push({ ...base, type: 'feedback', posts: ps });
      } else {
        added.push({ ...base, type: 'other', note: 'Format not readable in the prototype (stored as reference only)' });
      }
    }
    s.set({ sources: [...s.sources, ...added] });
  };

  const addSamples = () => {
    const now = new Date().toISOString();
    s.set({
      sources: [
        ...s.sources.filter((x) => !x.name.startsWith('unit_stats_18.5') && !x.name.startsWith('comp_by_rank_18.5')),
        { id: uid(), name: 'unit_stats_18.5.csv', kind: 'sample', type: 'stats', size: UNIT_STATS_CSV.length, addedAt: now, text: UNIT_STATS_CSV, note: 'Real public snapshot (metabot.gg, patch 18.5)' },
        { id: uid(), name: 'comp_by_rank_18.5.csv', kind: 'sample', type: 'stats', size: COMP_BY_RANK_CSV.length, addedAt: now, text: COMP_BY_RANK_CSV, note: 'Simulated internal telemetry export' },
      ],
    });
  };

  const stats = s.sources.filter((x) => x.type === 'stats').length;
  const fb = s.sources.filter((x) => x.type === 'feedback').length;

  return (
    <div className="stack">
      <div className="grid2">
        <div className="card">
          <div className="card-head">
            <Icon.upload />
            <h3 className="grow">Upload documents</h3>
            <span className="chip good">Real parsing</span>
          </div>
          <div
            className={`dropzone ${over ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
            onClick={() => input.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="bold">Drop files here or click to browse</div>
            <div className="small muted" style={{ marginTop: 4 }}>
              .csv → gameplay statistics · .txt / .md / .json → player feedback (one post per line or paragraph) · other formats are stored as references
            </div>
            <input ref={input} type="file" multiple hidden accept=".csv,.txt,.md,.json,.pdf,.docx,.xlsx" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn sm" onClick={addSamples}><Icon.plus /> Add sample statistics (2 CSV files)</button>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            CSV formats the Quantitative Agent understands: <code>comp, rank_band, games, avg_place, top4_rate, pick_rate</code> or <code>unit, cost, avg_place, top4_rate, pick_rate</code>.
          </p>
        </div>
        <CrawlCard />
      </div>

      <div className="card">
        <div className="card-head">
          <h3 className="grow">Evidence collected</h3>
          <span className="chip blue">{stats} statistics</span>
          <span className="chip teal">{fb} feedback sources · {posts.length} posts</span>
        </div>
        {s.sources.length === 0 && <p className="muted">No evidence yet. Upload files, add the sample statistics, or run the crawl.</p>}
        {s.sources.map((src) => (
          <div className="file-row" key={src.id}>
            <div className="file-icon" style={{ background: src.type === 'stats' ? 'var(--brand-soft)' : src.type === 'feedback' ? 'var(--teal-soft)' : 'var(--surface-3)', color: src.type === 'stats' ? 'var(--brand)' : 'var(--teal)' }}>
              {src.type === 'stats' ? 'CSV' : src.type === 'feedback' ? 'TXT' : 'DOC'}
            </div>
            <div className="grow">
              <div className="bold small">{src.name}</div>
              <div className="tiny muted">
                {src.kind === 'crawl' ? 'Simulated crawl' : src.kind === 'sample' ? 'Sample' : 'Uploaded'} ·{' '}
                {src.type === 'stats' ? `${parseCsv(src.text ?? '').rows.length} rows` : src.type === 'feedback' ? `${src.posts?.length ?? 0} posts` : `${Math.round(src.size / 1024)} KB`}
                {src.note ? ` · ${src.note}` : ''}
              </div>
            </div>
            <button className="btn xs ghost" onClick={() => s.set({ sources: s.sources.filter((x) => x.id !== src.id) })} aria-label={`Remove ${src.name}`}><Icon.trash /></button>
          </div>
        ))}
        {posts.length > 0 && (
          <div className="banner info" style={{ marginTop: 12 }}>
            <Icon.info />
            <div>
              <b>Conventional preprocessing (before any agent):</b> {pre.total} posts → {pre.filtered.length} filtered as too short/off-topic, {pre.duplicates.length} near-duplicates removed, <b>{pre.kept.length} kept</b> for the Qualitative Agent.
            </div>
          </div>
        )}
        <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          {stats === 0 || fb === 0 ? <span className="small muted">Tip: both statistics and feedback give the agents something to compare.</span> : null}
          <button className="btn primary" disabled={!s.sources.length} onClick={() => s.set({ t1Stage: 'analyze', analysisRun: s.analysisRun + 1 })}>
            <Icon.brain /> Send to agents
          </button>
        </div>
      </div>
    </div>
  );
}

function CrawlCard() {
  const [picked, setPicked] = useState<string[]>([...CRAWL_SOURCES]);
  const [keywords, setKeywords] = useState('riftbeast, elder dragon, azir, sentinel, comps, double up, beginner');
  const [running, setRunning] = useState(0);
  const lines: ConsoleLine[] = useMemo(() => {
    const kws = keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const matched = SAMPLE_FEEDBACK.filter((p) => picked.includes(p.source));
    const out: ConsoleLine[] = [{ text: `$ crawl --since 2026-10-21 (patch 18.5) --keywords "${kws.join('", "')}"`, kind: 'dim' }];
    for (const src of picked) {
      const n = matched.filter((p) => p.source === src).length;
      out.push({ text: `→ fetching ${src} … ${n} matching threads` });
    }
    out.push({ text: `✓ ${matched.length} posts collected · metadata kept: rank flair, mode, date, upvotes`, kind: 'ok' });
    return out;
  }, [picked, keywords]);

  const finish = useCallback(() => {
    const posts = SAMPLE_FEEDBACK.filter((p) => picked.includes(p.source));
    const st = useProject.getState();
    st.set({
      sources: [
        ...st.sources.filter((x) => x.kind !== 'crawl'),
        { id: uid(), name: `web-crawl ${new Date().toLocaleDateString()}.json`, kind: 'crawl', type: 'feedback', size: JSON.stringify(posts).length, addedAt: new Date().toISOString(), posts, note: 'Simulated crawl — posts are written for the prototype, not real quotes' },
      ],
    });
    st.remember('T1', 'Simulated web crawl', `${posts.length} posts from ${picked.length} sources`);
  }, [picked]);

  return (
    <div className="card">
      <div className="card-head">
        <Icon.globe />
        <h3 className="grow">Collect player feedback (web crawl)</h3>
        <SimulatedTag />
      </div>
      <div className="col">
        <div className="row wrap">
          {CRAWL_SOURCES.map((src) => (
            <span key={src} className={`chip click ${picked.includes(src) ? 'on' : ''}`} onClick={() => setPicked((p) => (p.includes(src) ? p.filter((x) => x !== src) : [...p, src]))}>
              {src}
            </span>
          ))}
        </div>
        <label className="field">
          Keywords
          <input className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </label>
        <div className="row">
          <button className="btn" disabled={!picked.length} onClick={() => setRunning((r) => r + 1)}>
            <Icon.globe /> {running ? 'Run crawl again' : 'Run crawl'}
          </button>
          <span className="small muted">Collects posts since patch 18.5 (21 Oct 2026).</span>
        </div>
        {running > 0 && <AgentConsole lines={lines} runKey={running} speed={220} onDone={finish} />}
      </div>
    </div>
  );
}

// ───────────────────────── 2. Analyze ─────────────────────────
function quantLines(q: QuantReport): ConsoleLine[] {
  return [
    { text: '[conventional] parsing tables …', kind: 'dim' },
    ...q.tablesUsed.map((t) => ({ text: `  ✓ ${t}` })),
    ...q.tablesSkipped.map((t) => ({ text: `  ! skipped ${t} (unrecognised columns)`, kind: 'warn' as const })),
    { text: '[conventional] placement by rank band, pick-rate outliers, cost-tier means', kind: 'dim' },
    { text: '[agent] interpreting statistical patterns …', kind: 'dim' },
    ...q.findings.map((f) => ({ text: `  • ${f.title}` })),
    { text: `✓ ${q.findings.length} findings`, kind: 'ok' },
  ];
}
function qualLines(l: QualReport): ConsoleLine[] {
  return [
    { text: `[conventional] ${l.pre.total} posts → filter ${l.pre.filtered.length}, dedupe ${l.pre.duplicates.length}, keep ${l.pre.kept.length}`, kind: 'dim' },
    { text: '[conventional] clustering by theme keywords …', kind: 'dim' },
    { text: '[agent] reading clusters for concerns, context and disagreements …', kind: 'dim' },
    ...l.clusters.slice(0, 6).map((c) => ({ text: `  • ${c.label}: ${c.posts.length} posts (${c.tone})` })),
    ...l.conflicts.map((c) => ({ text: `  ⚡ ${c}`, kind: 'warn' as const })),
    { text: `✓ ${l.clusters.length} themes`, kind: 'ok' },
  ];
}

function Analyze() {
  const s = useProject();
  const { tables, posts } = useEvidence();
  const quant = useMemo(() => quantAgent(tables), [tables]);
  const qual = useMemo(() => qualAgent(posts), [posts]);
  const [doneQ, setDoneQ] = useState(false);
  const [doneL, setDoneL] = useState(false);
  const [synthDone, setSynthDone] = useState(false);
  const issues = useMemo(() => synthAgent(quant, qual, s.notes), [quant, qual, s.notes]);

  const finishSynth = useCallback(() => {
    setSynthDone(true);
    const st = useProject.getState();
    st.set({ issues, reportVersion: Math.max(1, st.reportVersion), dismissed: [] });
    st.remember('T1', `Balance report v${Math.max(1, st.reportVersion)} generated`, issues.map((i) => `• ${i.title}`).join('\n'));
  }, [issues]);

  return (
    <div className="stack">
      <div className="grid2">
        <div className="card">
          <div className="agent card-head">
            <Robot color={AGENT_COLORS.quant} />
            <div className="grow">
              <div className="name">Quantitative Agent</div>
              <div className="small muted">Interprets gameplay statistics ({tables.length} tables)</div>
            </div>
            <SimulatedTag>Simulated agent · real stats</SimulatedTag>
          </div>
          <AgentConsole lines={quantLines(quant)} runKey={`q${s.analysisRun}`} onDone={() => setDoneQ(true)} />
          {doneQ && (
            <div style={{ marginTop: 10 }}>
              {quant.findings.length === 0 && <p className="muted small">No statistics to analyse.</p>}
              {quant.findings.map((f) => (
                <div className="finding" key={f.id}>
                  <div className="row"><span className={`chip ${f.severity === 'high' ? 'bad' : f.severity === 'medium' ? 'warn' : ''}`}>{f.severity}</span><span className="ttl grow">{f.title}</span></div>
                  <p className="small" style={{ marginTop: 4, color: 'var(--ink-2)' }}>{f.detail}</p>
                  <div className="kv">{f.numbers.map((n) => <span key={n.label}>{n.label}: <b>{n.value}</b></span>)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="agent card-head">
            <Robot color={AGENT_COLORS.qual} />
            <div className="grow">
              <div className="name">Qualitative Agent</div>
              <div className="small muted">Interprets player feedback ({posts.length} posts)</div>
            </div>
            <SimulatedTag />
          </div>
          <AgentConsole lines={qualLines(qual)} runKey={`l${s.analysisRun}`} speed={300} onDone={() => setDoneL(true)} />
          {doneL && (
            <div style={{ marginTop: 10 }}>
              {qual.clusters.slice(0, 5).map((c) => (
                <div className="finding" key={c.themeId}>
                  <div className="row">
                    <span className={`chip ${c.tone === 'negative' ? 'bad' : c.tone === 'positive' ? 'good' : 'warn'}`}>{c.tone}</span>
                    <span className="ttl grow">{c.label}</span>
                    <span className="small muted">{c.posts.length} posts · {Math.round(c.weight * 100)}%</span>
                  </div>
                  <div className="quote" style={{ marginTop: 6 }}>“{c.posts[0].text}” <span className="tiny muted">— {c.posts[0].author}, {c.posts[0].rank}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {doneQ && doneL && (
        <div className="card">
          <div className="agent card-head">
            <Robot color={AGENT_COLORS.synth} />
            <div className="grow">
              <div className="name">Synthesizing Agent</div>
              <div className="small muted">Compares both analyses, highlights agreements and conflicts, proposes issue candidates</div>
            </div>
            <SimulatedTag />
          </div>
          <AgentConsole
            runKey={`s${s.analysisRun}`}
            onDone={finishSynth}
            lines={[
              { text: 'aligning quantitative findings with feedback themes …', kind: 'dim' },
              ...issues.map((i) => ({ text: `  ${i.agreement === 'agree' ? '✓ agree   ' : i.agreement === 'partial' ? '~ partial ' : '⚡ conflict'}  ${i.title}`, kind: (i.agreement === 'conflict' ? 'warn' : undefined) as ConsoleLine['kind'] })),
              { text: `✓ ${issues.length} balance-issue candidates ready for designer review`, kind: 'ok' },
            ]}
          />
          {synthDone && (
            <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn primary" onClick={() => s.set({ t1Stage: 'review' })}>Review the report <Icon.arrow /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 3. Review ─────────────────────────
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1).replace(/_/g, ' ');
/** "the Sentinel issue" — a name the revision rules recognise */
const issueName = (i: IssueCandidate) => `the ${cap(i.affected[0] ?? i.id.replace(/^issue-/, ''))} issue`;

type Run = { note: string; notes: string[]; version: number; intents: NoteIntent[]; next: IssueCandidate[]; diff: ReportDiff; checks: string[] };

function Review() {
  const s = useProject();
  const { tables, posts } = useEvidence();
  const quant = useMemo(() => quantAgent(tables), [tables]);
  const qual = useMemo(() => qualAgent(posts), [posts]);
  const base = useMemo(() => synthAgent(quant, qual, []), [quant, qual]);
  const report = useMemo(() => reviseReport(base, s.notes, qual), [base, s.notes, qual]);
  const lastDiff = useMemo(
    () => (s.notes.length ? diffReports(reviseReport(base, s.notes.slice(0, -1), qual).issues, report.issues) : null),
    [base, s.notes, qual, report],
  );
  const [note, setNote] = useState('');
  const [run, setRun] = useState<Run | null>(null);
  const [tab, setTab] = useState<'stats' | 'feedback'>('stats');
  const [open, setOpen] = useState<string | null>(s.issues[0]?.id ?? null);

  const revise = (text: string) => {
    const t = text.trim();
    if (!t || run) return;
    const notes = [...s.notes, t];
    const next = reviseReport(base, notes, qual);
    const intents = next.perNote[next.perNote.length - 1];
    const diff = diffReports(s.issues, next.issues);
    const checks = diff.evidence.flatMap((e) => e.lines);
    setRun({ note: t, notes, version: s.reportVersion + 1, intents, next: next.issues, diff, checks });
    setNote('');
  };

  const finish = useCallback(() => {
    if (!run) return;
    const st = useProject.getState();
    st.set({ notes: run.notes, issues: run.next, reportVersion: run.version });
    const d = run.diff;
    st.remember('T1', `Designer asked for revision → report v${run.version}`, `${run.note}\n${summary(d)}`);
    setRun(null);
  }, [run]);

  const select = (i: IssueCandidate) => {
    const communities = setupAssistant(i, posts.length ? posts : []);
    s.set({ selectedIssueId: i.id, communities, brief: null, briefApproved: false, t2Stage: 'perspectives' });
    s.remember('T1', `Issue selected: ${i.title}`, `Agreement: ${i.agreement} · confidence ${Math.round(i.confidence * 100)}%\nConditions: ${i.conditions}`);
    s.go('t2');
  };

  const moveOf = (id: string) => lastDiff?.moved.find((m) => m.issue.id === id);
  const isRestored = (id: string) => !!lastDiff?.restored.some((r) => r.id === id);
  const hasNewEvidence = (id: string) => !!lastDiff?.evidence.some((e) => e.issue.id === id);

  return (
    <div className="stack">
      <div className="row">
        <h2 className="grow">Balance report <span className="chip blue">v{s.reportVersion}</span></h2>
        <span className="small muted">{s.sources.length} sources · {posts.length} posts · {tables.length} tables</span>
      </div>
      {run && <RevisionRun run={run} onDone={finish} />}
      {!run && lastDiff && <WhatChanged version={s.reportVersion} diff={lastDiff} removed={report.removed} onRestore={(i) => revise(`Bring back ${issueName(i)}`)} />}
      <div className="grid2" style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
        <div className={`col ${run ? 'updating' : ''}`}>
          {s.issues.map((i, idx) => {
            const mv = moveOf(i.id);
            return (
              <div key={i.id} className={`issue ${s.selectedIssueId === i.id ? 'sel' : ''}`} onClick={() => setOpen(open === i.id ? null : i.id)}>
                <div className="row">
                  <span className="chip">#{idx + 1}</span>
                  <h3 className="grow">{i.title}</h3>
                  {mv && mv.toRank < mv.fromRank && <span className="chip good" title={`Was #${mv.fromRank} in v${s.reportVersion - 1}`}>▲ from #{mv.fromRank}</span>}
                  {mv && mv.toRank > mv.fromRank && <span className="chip bad" title={`Was #${mv.fromRank} in v${s.reportVersion - 1}`}>▼ from #{mv.fromRank}</span>}
                  {isRestored(i.id) && <span className="chip purple">back in v{s.reportVersion}</span>}
                  {hasNewEvidence(i.id) && <span className="chip blue">new evidence</span>}
                </div>
                <div className="row wrap" style={{ marginTop: 8 }}>
                  <span className={`chip ${i.agreement === 'agree' ? 'good' : i.agreement === 'partial' ? 'warn' : 'bad'}`}>
                    {i.agreement === 'agree' ? 'Stats & feedback agree' : i.agreement === 'partial' ? 'Partial agreement' : 'Sources conflict'}
                  </span>
                  <span className="small muted">Confidence</span>
                  <div className="meter" style={{ width: 90 }}><i style={{ width: `${i.confidence * 100}%` }} /></div>
                  <span className="small">{Math.round(i.confidence * 100)}%</span>
                  {mv && Math.abs(mv.toConf - mv.fromConf) > 1e-9 && (
                    <span className={`small bold`} style={{ color: mv.toConf > mv.fromConf ? 'var(--good)' : 'var(--bad)' }}>
                      ({mv.toConf > mv.fromConf ? '+' : ''}{Math.round((mv.toConf - mv.fromConf) * 100)})
                    </span>
                  )}
                </div>
                <p className="small" style={{ marginTop: 8, color: 'var(--ink-2)' }}>{i.summary}</p>
                {i.revisedNote && <p className="tiny" style={{ marginTop: 6, color: 'var(--purple)' }}>{i.revisedNote}</p>}
                {open === i.id && (
                  <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <div className="small"><b>Conditions:</b> {i.conditions}</div>
                    <div className="small" style={{ marginTop: 4 }}><b>Agreement:</b> {i.agreementNote}</div>
                    <div className="grid2" style={{ marginTop: 10 }}>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>Quantitative evidence</h4>
                        {i.quant.length ? i.quant.map((q, k) => <div key={k} className="quote">{q}</div>) : <div className="small muted">none</div>}
                      </div>
                      <div>
                        <h4 style={{ marginBottom: 4 }}>Qualitative evidence</h4>
                        {i.qual.length ? i.qual.map((q, k) => <div key={k} className={`quote ${lastDiff?.evidence.some((e) => e.lines.includes(q)) ? 'new' : ''}`}>{q}</div>) : <div className="small muted">none</div>}
                      </div>
                    </div>
                    <div className="row wrap" style={{ marginTop: 10 }}>
                      {i.affected.map((a) => <span key={a} className="chip purple">{a}</span>)}
                    </div>
                  </div>
                )}
                <div className="row" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn sm ghost" onClick={() => setOpen(open === i.id ? null : i.id)}>{open === i.id ? 'Hide evidence' : 'Show evidence'}</button>
                  <button className="btn sm ghost" disabled={!!run} onClick={() => revise(`Remove ${issueName(i)} for now`)} title="Asks the agents to take this candidate out of the report (you can bring it back)">Remove from report</button>
                  <div className="grow" />
                  <button className="btn sm primary" disabled={!!run} onClick={() => select(i)}>Investigate this issue <Icon.arrow /></button>
                </div>
              </div>
            );
          })}
          {!s.issues.length && <div className="card soft small muted">Every candidate has been removed. Bring one back below or write a note such as “bring back Sentinel”.</div>}
          {report.removed.length > 0 && (
            <div className="card flat" style={{ padding: 10 }}>
              <h4 style={{ marginBottom: 6 }}>Removed from the report ({report.removed.length})</h4>
              {report.removed.map((r) => (
                <div key={r.issue.id} className="row" style={{ marginBottom: 6 }}>
                  <span className="small grow" style={{ textDecoration: 'line-through', color: 'var(--ink-3)' }}>{r.issue.title}</span>
                  <span className="tiny muted" title={r.by}>{r.temporary ? 'for now' : 'removed'}</span>
                  <button className="btn xs" disabled={!!run} onClick={() => revise(`Bring back ${issueName(r.issue)}`)}>Bring back</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col">
          <div className="card">
            <div className="card-head">
              <Robot size={32} color={AGENT_COLORS.synth} />
              <h3 className="grow">Ask the agents to revise</h3>
              <SimulatedTag>Simulated agent · rule-based</SimulatedTag>
            </div>
            <textarea
              className="textarea"
              placeholder="e.g. Ignore Sentinel for now; focus on Diamond+ lobbies; does the Azir issue hold for Double Up?"
              value={note}
              disabled={!!run}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) revise(note); }}
            />
            <div className="row" style={{ marginTop: 8 }}>
              <span className="tiny muted grow">Understands: remove / ignore · bring back · prioritise / deprioritise · focus on high or low ranks · “does X hold for Double Up / Normal / Ranked?”</span>
              <button className="btn sm" disabled={!note.trim() || !!run} onClick={() => revise(note)}>Request revision</button>
            </div>
            {s.notes.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <h4 style={{ marginBottom: 4 }}>Revision history</h4>
                {s.notes.map((n, k) => (
                  <div key={k} className="quote">
                    <b>v{k + 2}</b>: {n}
                    <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                      {(report.perNote[k] ?? []).map((it, j) => <span key={j} className={`chip ${it.kind === 'unclear' ? '' : it.kind === 'remove' ? 'bad' : it.kind === 'restore' ? 'purple' : 'blue'}`}>{it.explain}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="tabs">
              <button className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>Statistics</button>
              <button className={tab === 'feedback' ? 'on' : ''} onClick={() => setTab('feedback')}>Feedback themes</button>
            </div>
            {tab === 'stats' && <CompTable quant={quant} />}
            {tab === 'feedback' && (
              <div className="col">
                {qual.clusters.map((c) => (
                  <details key={c.themeId}>
                    <summary className="small"><b>{c.label}</b> · {c.posts.length} posts</summary>
                    <div style={{ marginTop: 6 }}>
                      {c.posts.map((p) => (
                        <div key={p.id} className="quote">“{p.text}” <span className="tiny muted">— {p.author}, {p.rank}, {p.mode}, ▲{p.upvotes}</span></div>
                      ))}
                    </div>
                  </details>
                ))}
                {!qual.clusters.length && <p className="small muted">No feedback collected.</p>}
                <p className="tiny muted">Posts are simulated for the prototype unless you uploaded your own.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function summary(d: ReportDiff): string {
  const parts = [
    d.removed.length && `${d.removed.length} removed`,
    d.restored.length && `${d.restored.length} brought back`,
    d.moved.length && `${d.moved.length} re-ranked`,
    d.evidence.length && `evidence added to ${d.evidence.length}`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'no changes';
}

/** The agents working on a revision: note → understanding → re-ranking → new version. */
function RevisionRun({ run, onDone }: { run: Run; onDone: () => void }) {
  const lines: ConsoleLine[] = [
    { text: `[designer] “${run.note}”`, kind: 'dim' },
    { text: '[synthesizing] reading the note against the current report …', kind: 'dim' },
    ...run.intents.flatMap((it): ConsoleLine[] => {
      if (it.kind === 'unclear') return [{ text: `  ? “${it.clause}” — ${it.explain}; no change`, kind: 'warn' }];
      if (it.kind === 'check')
        return [
          { text: `  → ${it.explain}` },
          { text: `[qualitative] filtering ${it.scope} posts and matching them to the issue …`, kind: 'dim' },
          ...run.checks.filter((c) => c.startsWith(`${it.scope} check`)).map((c) => ({ text: `    ${c}` })),
        ];
      return [{ text: `  → ${it.explain}` }];
    }),
    { text: `[synthesizing] re-ranking ${run.next.length} candidate${run.next.length === 1 ? '' : 's'} by confidence …`, kind: 'dim' },
    diffIsEmpty(run.diff)
      ? { text: `✓ report v${run.version}: no changes`, kind: 'warn' }
      : { text: `✓ report v${run.version}: ${summary(run.diff)}`, kind: 'ok' },
  ];
  return (
    <div className="card">
      <div className="agent card-head">
        <Robot color={AGENT_COLORS.synth} />
        <div className="grow">
          <div className="name">Revising the report → v{run.version}</div>
          <div className="small muted">The Synthesizing Agent interprets your note and asks the other agents for what it needs</div>
        </div>
        <SimulatedTag />
      </div>
      <AgentConsole lines={lines} runKey={`rev${run.version}`} speed={380} onDone={onDone} />
    </div>
  );
}

/** Before → after view of the latest revision. */
function WhatChanged({ version, diff, removed, onRestore }: { version: number; diff: ReportDiff; removed: RemovedIssue[]; onRestore: (i: IssueCandidate) => void }) {
  return (
    <div className="card soft">
      <div className="row" style={{ marginBottom: 6 }}>
        <h3 className="grow">What changed in v{version}</h3>
        <span className="small muted">compared with v{version - 1}</span>
      </div>
      {diffIsEmpty(diff) && <div className="small muted">No changes — the note did not match an issue or an action. Try naming a unit or trait, e.g. “ignore Sentinel for now”.</div>}
      <div className="col" style={{ gap: 6 }}>
        {diff.removed.map((i) => (
          <div key={i.id} className="row change-row">
            <span className="chip bad">removed{removed.find((r) => r.issue.id === i.id)?.temporary ? ' for now' : ''}</span>
            <span className="small grow" style={{ textDecoration: 'line-through' }}>{i.title}</span>
            <button className="btn xs" onClick={() => onRestore(i)}>Undo</button>
          </div>
        ))}
        {diff.restored.map((i) => (
          <div key={i.id} className="row change-row"><span className="chip purple">brought back</span><span className="small grow">{i.title}</span></div>
        ))}
        {diff.moved.map((m) => (
          <div key={m.issue.id} className="row change-row">
            <span className={`chip ${m.toConf >= m.fromConf ? 'good' : 'bad'}`}>{m.toRank === m.fromRank ? 'confidence' : m.toRank < m.fromRank ? 'moved up' : 'moved down'}</span>
            <span className="small grow">{m.issue.title}</span>
            <span className="small mono">#{m.fromRank} → #{m.toRank} · {Math.round(m.fromConf * 100)}% → {Math.round(m.toConf * 100)}%</span>
          </div>
        ))}
        {diff.evidence.map((e) => (
          <div key={e.issue.id} className="change-row">
            <div className="row"><span className="chip blue">new evidence</span><span className="small grow">{e.issue.title}</span></div>
            {e.lines.map((l, k) => <div key={k} className="quote new" style={{ marginTop: 4 }}>{l}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Average placement by comp × rank band — a sequential (single-hue) heat table. */
function CompTable({ quant }: { quant: QuantReport }) {
  if (!quant.compTable) return <p className="small muted">Upload a comp-by-rank table to see placement by rank band.</p>;
  // lower placement = better = darker blue
  const shade = (p: number) => {
    const t = Math.max(0, Math.min(1, (4.9 - p) / 1.4));
    const steps = ['#eef4fd', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf'];
    return steps[Math.round(t * (steps.length - 1))];
  };
  return (
    <div>
      <table className="t">
        <thead>
          <tr><th>Composition</th>{RANK_BANDS.map((b) => <th key={b} className="num">{b}</th>)}</tr>
        </thead>
        <tbody>
          {quant.compTable.map((r) => (
            <tr key={r.comp}>
              <td>{r.comp}</td>
              {RANK_BANDS.map((b) => {
                const v = r.byBand[b];
                if (!v) return <td key={b} />;
                const bg = shade(v.place);
                const dark = ['#3987e5', '#256abf', '#6da7ec'].includes(bg);
                return (
                  <td key={b} className="num" title={`${r.comp} · ${b}: avg place ${v.place}, top 4 ${v.top4}%, pick ${v.pick}%`} style={{ background: bg, color: dark ? '#fff' : 'var(--ink)' }}>
                    {v.place.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tiny muted" style={{ marginTop: 6 }}>Average placement (lower is stronger; 4.5 is neutral). Darker = stronger. Hover a cell for top-4 and pick rate.</p>
    </div>
  );
}
