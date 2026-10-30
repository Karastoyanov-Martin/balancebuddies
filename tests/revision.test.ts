import { qualAgent, quantAgent, setupAssistant, synthAgent } from '../src/agents/analysis';
import { buildBrief, DEFAULT_FORMAT } from '../src/agents/brief';
import { parseCsv } from '../src/agents/preprocess';
import { clauses, diffIsEmpty, diffReports, interpretNote, reviseReport, topicWords } from '../src/agents/revision';
import { baselineData } from '../src/data';
import { SAMPLE_FEEDBACK } from '../src/mock/feedback';
import { COMP_BY_RANK_CSV, UNIT_STATS_CSV } from '../src/mock/stats';

const q = quantAgent([parseCsv(COMP_BY_RANK_CSV, 'comp.csv'), parseCsv(UNIT_STATS_CSV, 'units.csv')]);
const l = qualAgent(SAMPLE_FEEDBACK);
const base = synthAgent(q, l);
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

describe('understanding designer notes', () => {
  it('splits notes into clauses', () => {
    expect(clauses('Focus on Diamond+; ignore Sentinel for now. Does Azir hold for Double Up?')).toEqual([
      'Focus on Diamond+', 'ignore Sentinel for now', 'Does Azir hold for Double Up',
    ]);
  });

  it('every issue has words that name it', () => {
    expect(topicWords(base.find((i) => i.id === 'issue-sentinel')!)).toContain('sentinel');
    expect(topicWords(base.find((i) => i.id === 'issue-riftbeast')!)).toEqual(expect.arrayContaining(['riftbeast', 'elderdragon', 'apex']));
  });

  it('"Ignore sentinels for now" = remove the Sentinel issue, temporarily', () => {
    const [it] = interpretNote('Ignore sentinels for now', base);
    expect(it.kind).toBe('remove');
    expect(it.issueIds).toEqual(['issue-sentinel']);
    expect(it.temporary).toBe(true);
  });

  it('reads several intents from one note', () => {
    const its = interpretNote('Focus on Diamond+ lobbies; ignore Sentinel for now; does the Azir issue hold for Double Up?', base);
    expect(its.map((x) => x.kind)).toEqual(['focusHigh', 'remove', 'check']);
    expect(its[2].scope).toBe('Double Up');
  });

  it('works regardless of case, plurals and unit names', () => {
    expect(interpretNote('IGNORE ELDER DRAGON', base)[0]).toMatchObject({ kind: 'remove', issueIds: ['issue-riftbeast'] });
    expect(interpretNote('skip the executioners', base)[0]).toMatchObject({ kind: 'remove', issueIds: ['issue-azir'] });
  });

  it('says so when it cannot map a note', () => {
    const [it] = interpretNote('make it better', base);
    expect(it.kind).toBe('unclear');
    expect(interpretNote('ignore that', base)[0].kind).toBe('unclear');
  });
});

describe('revising the report', () => {
  it('removes the ignored issue and keeps the others', () => {
    const r = reviseReport(base, ['Ignore sentinels for now'], l);
    expect(ids(r.issues)).toEqual(['issue-azir', 'issue-riftbeast']);
    expect(r.removed.map((x) => x.issue.id)).toEqual(['issue-sentinel']);
    expect(r.removed[0].temporary).toBe(true);
    expect(synthAgent(q, l, ['Ignore sentinels for now']).map((i) => i.id)).not.toContain('issue-sentinel');
  });

  it('a later note brings it back (notes are cumulative)', () => {
    const r = reviseReport(base, ['Ignore sentinels for now', 'bring back Sentinel'], l);
    expect(ids(r.issues)).toEqual(ids(base));
    expect(r.removed).toHaveLength(0);
    expect(r.issues.find((i) => i.id === 'issue-sentinel')!.revisedNote).toContain('brought back');
  });

  it('the UI buttons’ phrases round-trip', () => {
    const removed = reviseReport(base, ['Remove the Sentinel issue for now'], l);
    expect(removed.issues.map((i) => i.id)).not.toContain('issue-sentinel');
    const back = reviseReport(base, ['Remove the Sentinel issue for now', 'Bring back the Sentinel issue'], l);
    expect(back.issues.map((i) => i.id)).toContain('issue-sentinel');
    for (const i of base) {
      const name = `the ${i.affected[0]} issue`;
      expect(reviseReport(base, [`Remove ${name} for now`], l).removed.map((x) => x.issue.id)).toEqual([i.id]);
    }
  });

  it('deprioritising lowers confidence without removing', () => {
    const r = reviseReport(base, ['deprioritise Riftbeast'], l);
    const before = base.find((i) => i.id === 'issue-riftbeast')!.confidence;
    const after = r.issues.find((i) => i.id === 'issue-riftbeast')!;
    expect(after.confidence).toBeCloseTo(before - 0.3, 9);
  });

  it('a mode question adds evidence from that mode’s posts', () => {
    const r = reviseReport(base, ['Does the Azir issue hold for Double Up?'], l);
    const az = r.issues.find((i) => i.id === 'issue-azir')!;
    const line = az.qual.find((x) => x.startsWith('Double Up check'))!;
    const dbl = SAMPLE_FEEDBACK.filter((p) => p.mode === 'Double Up').length;
    expect(line).toContain(`of ${dbl} Double Up posts`);
  });

  it('an unrecognised note changes nothing', () => {
    const r = reviseReport(base, ['make it better'], l);
    expect(diffIsEmpty(diffReports(base, r.issues))).toBe(true);
  });
});

describe('what changed between versions', () => {
  it('lists removed, brought back, moved and new evidence', () => {
    const v2 = reviseReport(base, ['ignore Sentinel'], l).issues;
    const d = diffReports(base, v2);
    expect(d.removed.map((i) => i.id)).toEqual(['issue-sentinel']);
    const v3 = reviseReport(base, ['ignore Sentinel', 'bring back Sentinel'], l).issues;
    expect(diffReports(v2, v3).restored.map((i) => i.id)).toEqual(['issue-sentinel']);
    const v4 = reviseReport(base, ['deprioritise Riftbeast'], l).issues;
    const mv = diffReports(base, v4).moved.find((m) => m.issue.id === 'issue-riftbeast')!;
    expect(mv.fromRank).toBe(1);
    expect(mv.toRank).toBeGreaterThan(1);
    const v5 = reviseReport(base, ['does Azir hold for Double Up?'], l).issues;
    expect(diffReports(base, v5).evidence.map((e) => e.issue.id)).toEqual(['issue-azir']);
  });
});

describe('perspectives (Task 2) edits reach the brief', () => {
  const issue = base[0];
  it('removed communities are not in the brief; edited concerns are, blank ones are dropped', () => {
    const comms = setupAssistant(issue, SAMPLE_FEEDBACK);
    const edited = comms
      .filter((c) => c.id !== 'beginners')
      .map((c) => (c.id === 'casual' ? { ...c, concerns: ['Wants games to feel different', '  '] } : c));
    const brief = buildBrief({ issue, communities: edited, priorities: [], limits: [], format: DEFAULT_FORMAT, data: baselineData(), now: 't' });
    expect(brief.agents.some((a) => a.community === 'Beginners')).toBe(false);
    const casual = brief.agents.find((a) => a.community.startsWith('Casual'))!;
    expect(casual.needs).toContain('Wants games to feel different');
    expect(casual.needs).not.toContain('  ');
    expect(casual.needs.every((x) => x.trim().length > 0)).toBe(true);
  });
});
