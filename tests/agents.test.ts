import { qualAgent, quantAgent, setupAssistant, synthAgent, themeOf } from '../src/agents/analysis';
import { buildBrief, DEFAULT_FORMAT } from '../src/agents/brief';
import { feedbackFromFile, jaccard, parseCsv, preprocessFeedback } from '../src/agents/preprocess';
import { baselineData } from '../src/data';
import { SAMPLE_FEEDBACK } from '../src/mock/feedback';
import { COMP_BY_RANK_CSV, UNIT_STATS_CSV } from '../src/mock/stats';

describe('CSV parsing', () => {
  it('parses headers, quoted fields and CRLF', () => {
    const t = parseCsv('Comp,Note\r\n"Riftbeast, Elder",\"said \"\"hi\"\"\"\r\nAzir,ok\r\n');
    expect(t.headers).toEqual(['comp', 'note']);
    expect(t.rows).toHaveLength(2);
    expect(t.rows[0].comp).toBe('Riftbeast, Elder');
    expect(t.rows[0].note).toBe('said "hi"');
  });
  it('parses the sample tables', () => {
    expect(parseCsv(UNIT_STATS_CSV).rows.length).toBeGreaterThan(50);
    expect(parseCsv(COMP_BY_RANK_CSV).rows).toHaveLength(40);
  });
});

describe('feedback extraction & preprocessing', () => {
  it('splits plain text into posts', () => {
    const p = feedbackFromFile('notes.txt', 'First complaint about Riftbeast.\n\nSecond one about Azir soldiers.');
    expect(p).toHaveLength(2);
  });
  it('reads JSON arrays with text/body fields', () => {
    const p = feedbackFromFile('x.json', JSON.stringify([{ body: 'hello world this is long enough', score: 5 }, 'plain string post']));
    expect(p).toHaveLength(2);
    expect(p[0].upvotes).toBe(5);
  });
  it('jaccard similarity', () => {
    expect(jaccard('the riftbeast comp is strong', 'the riftbeast comp is strong')).toBe(1);
    expect(jaccard('abc def ghi', 'xyz uvw rst')).toBe(0);
  });
  it('filters short posts and removes the near-duplicate (keeps the most upvoted)', () => {
    const r = preprocessFeedback(SAMPLE_FEEDBACK);
    expect(r.filtered.map((p) => p.id)).toContain('f18');
    expect(r.duplicates.map((p) => p.id)).toEqual(['f15']);
    expect(r.kept.map((p) => p.id)).toContain('f01');
    expect(r.kept.length + r.filtered.length + r.duplicates.length).toBe(r.total);
  });
});

describe('Quantitative Agent (simulated)', () => {
  const rep = quantAgent([parseCsv(COMP_BY_RANK_CSV, 'comp.csv'), parseCsv(UNIT_STATS_CSV, 'units.csv'), parseCsv('a,b\n1,2', 'junk.csv')]);
  it('uses recognised tables and skips unknown ones', () => {
    expect(rep.tablesUsed).toEqual(['comp.csv', 'units.csv']);
    expect(rep.tablesSkipped).toEqual(['junk.csv']);
  });
  it('flags Riftbeast Elder Dragon as over-performing, more so at high rank', () => {
    const f = rep.findings.find((x) => x.id === 'comp-riftbeastelderdragon')!;
    expect(f).toBeDefined();
    expect(f.title).toContain('high rank');
    expect(f.severity).toBe('high');
  });
  it('flags Executioner Azir as a lower-rank issue', () => {
    expect(rep.findings.find((x) => x.id === 'comp-executionerazir')!.title).toContain('lower ranks');
  });
  it('flags Sentinel as the most contested unit', () => {
    expect(rep.findings.find((x) => x.id === 'unit-sentinel')).toBeDefined();
  });
});

describe('Qualitative Agent (simulated)', () => {
  const rep = qualAgent(SAMPLE_FEEDBACK);
  it('assigns themes by keywords', () => {
    expect(themeOf('Elder Dragon riftbeast growth is too strong')).toBe('riftbeast_dominance');
    expect(themeOf('my friend and I in double up')).toBe('social_play');
    expect(themeOf('random text')).toBe('other');
  });
  it('largest cluster is Riftbeast dominance', () => {
    expect(rep.clusters[0].themeId).toBe('riftbeast_dominance');
  });
  it('cluster weights sum to 1', () => {
    expect(rep.clusters.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 6);
  });
  it('detects conflicting opinions', () => {
    expect(rep.conflicts.some((c) => c.startsWith('Riftbeast'))).toBe(true);
    expect(rep.conflicts.some((c) => c.startsWith('Azir'))).toBe(true);
  });
});

describe('Synthesizing Agent (simulated)', () => {
  const q = quantAgent([parseCsv(COMP_BY_RANK_CSV, 'comp.csv'), parseCsv(UNIT_STATS_CSV, 'units.csv')]);
  const l = qualAgent(SAMPLE_FEEDBACK);
  it('top candidate is Riftbeast with agreement between sources', () => {
    const issues = synthAgent(q, l);
    expect(issues[0].id).toBe('issue-riftbeast');
    expect(issues[0].agreement).toBe('agree');
    expect(issues.map((i) => i.id)).toEqual(expect.arrayContaining(['issue-sentinel', 'issue-azir']));
  });
  it('designer notes revise the ranking', () => {
    const issues = synthAgent(q, l, ['Focus on low rank and casual players please']);
    const az = issues.find((i) => i.id === 'issue-azir')!;
    expect(az.revisedNote).toContain('lower-rank');
    const base = synthAgent(q, l).find((i) => i.id === 'issue-azir')!;
    expect(az.confidence).toBeGreaterThan(base.confidence);
  });
  it('still produces a candidate from statistics alone', () => {
    const issues = synthAgent(q, qualAgent([]));
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe('Setup Assistant + negotiation brief', () => {
  const q = quantAgent([parseCsv(COMP_BY_RANK_CSV, 'comp.csv')]);
  const issue = synthAgent(q, qualAgent(SAMPLE_FEEDBACK))[0];
  const comms = setupAssistant(issue, SAMPLE_FEEDBACK);

  it('suggests communities with evidence from feedback', () => {
    expect(comms.map((c) => c.id)).toEqual(['competitive', 'casual', 'friends', 'beginners', 'riftbeast_fans']);
    expect(comms.find((c) => c.id === 'friends')!.evidence.length).toBeGreaterThan(0);
  });

  it('extra representatives never increase a community’s influence', () => {
    const edited = comms.map((c) => (c.id === 'casual' ? { ...c, representatives: [...c.representatives, { id: 'casual-2', name: 'Casual rep 2', need: 'x' }] } : c));
    const brief = buildBrief({ issue, communities: edited, priorities: [], limits: [], format: DEFAULT_FORMAT, data: baselineData(), now: 't' });
    const casual = brief.agents.filter((a) => a.community === 'Casual / solo players');
    expect(casual).toHaveLength(2);
    expect(casual[0].voteShare + casual[1].voteShare).toBeCloseTo(casual[0].communityWeight, 2);
    const totalShare = brief.agents.reduce((a, b) => a + b.voteShare, 0);
    expect(totalShare).toBeCloseTo(1, 2);
  });

  it('excluded communities produce no agents; limits are interpreted', () => {
    const edited = comms.map((c) => (c.id === 'beginners' ? { ...c, included: false } : c));
    const brief = buildBrief({ issue, communities: edited, priorities: [{ id: 'p', text: 'Keep 3+ viable comps' }], limits: ['Stay within ±10%', 'Do not change Elder Dragon'], format: DEFAULT_FORMAT, data: baselineData(), now: 't' });
    expect(brief.agents.some((a) => a.community === 'Beginners')).toBe(false);
    expect(brief.designer.hardLimits.interpreted.maxPctChange).toBe(10);
    expect(brief.designer.hardLimits.interpreted.lockedUnits).toEqual(['elderdragon']);
    expect(brief.designer.priorities[0]).toEqual({ rank: 1, text: 'Keep 3+ viable comps' });
    expect(JSON.parse(JSON.stringify(brief))).toEqual(brief); // serialisable
  });
});
