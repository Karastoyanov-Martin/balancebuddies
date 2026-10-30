import { qualAgent, quantAgent, setupAssistant, synthAgent } from '../agents/analysis';
import { buildBrief } from '../agents/brief';
import { parseCsv } from '../agents/preprocess';
import { SAMPLE_FEEDBACK } from '../mock/feedback';
import { COMP_BY_RANK_CSV, UNIT_STATS_CSV } from '../mock/stats';
import { uid, useProject } from './project';

/** Shortcut for evaluators: load sample evidence and complete Task 1 instantly. */
export function loadDemoTask1(): void {
  const st = useProject.getState();
  const now = new Date().toISOString();
  const sources = [
    { id: uid(), name: 'unit_stats_18.5.csv', kind: 'sample' as const, type: 'stats' as const, size: UNIT_STATS_CSV.length, addedAt: now, text: UNIT_STATS_CSV, note: 'Real public snapshot (metabot.gg, patch 18.5)' },
    { id: uid(), name: 'comp_by_rank_18.5.csv', kind: 'sample' as const, type: 'stats' as const, size: COMP_BY_RANK_CSV.length, addedAt: now, text: COMP_BY_RANK_CSV, note: 'Simulated internal telemetry export' },
    { id: uid(), name: 'web-crawl (demo).json', kind: 'crawl' as const, type: 'feedback' as const, size: 0, addedAt: now, posts: SAMPLE_FEEDBACK, note: 'Simulated crawl — posts are written for the prototype, not real quotes' },
  ];
  const issues = synthAgent(quantAgent([parseCsv(UNIT_STATS_CSV, 'unit_stats_18.5.csv'), parseCsv(COMP_BY_RANK_CSV, 'comp_by_rank_18.5.csv')]), qualAgent(SAMPLE_FEEDBACK));
  const issue = issues[0];
  st.set({
    sources, issues, reportVersion: 1, notes: [], dismissed: [], t1Stage: 'review', selectedIssueId: issue.id,
    communities: setupAssistant(issue, SAMPLE_FEEDBACK), brief: null, briefApproved: false, t2Stage: 'perspectives',
  });
  st.remember('T1', `Demo: issue selected — ${issue.title}`, 'Loaded sample statistics + simulated crawl');
}

/** Shortcut: also approve a default brief (Task 2). */
export function loadDemoTask2(): void {
  if (!useProject.getState().selectedIssueId) loadDemoTask1();
  const st = useProject.getState();
  const issue = st.issues.find((i) => i.id === st.selectedIssueId)!;
  const brief = buildBrief({ issue, communities: st.communities, priorities: st.priorities, limits: st.limits, format: st.format, data: st.working });
  st.set({ brief, briefApproved: true, t2Stage: 'brief' });
  st.remember('T2', 'Demo: default negotiation brief approved', `${brief.agents.length} perspective agents`);
}
