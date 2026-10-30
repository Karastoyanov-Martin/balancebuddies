import type { GameData } from '../sim/types';
import { parseLimits, type Limits } from '../sim/patch';
import type { Community, IssueCandidate } from './analysis';

export interface NegotiationFormat {
  maxRounds: number;
  turnOrder: 'round-robin' | 'weighted' | 'moderator-picks';
  independentFirst: boolean;
  stopRules: string[];
}

export interface Priority {
  id: string;
  text: string;
}

export const DEFAULT_FORMAT: NegotiationFormat = {
  maxRounds: 3,
  turnOrder: 'round-robin',
  independentFirst: true,
  stopRules: ['All agents accept or explicitly record a remaining objection', 'Maximum rounds reached', 'Repeated arguments detected twice in a row'],
};

export interface BriefAgent {
  id: string;
  role: 'perspective';
  name: string;
  community: string;
  represents: string;
  personality: { temperament: string; speaksFor: string };
  needs: string[];
  evidence: string[];
  /** community weight set by the designer, normalised over included communities (sums to 1) */
  communityWeight: number;
  /** this representative's share — community weight split between its representatives, so extra reps never add influence */
  voteShare: number;
}

export interface NegotiationBrief {
  schema: string;
  createdAt: string;
  patch: string;
  status: string;
  issue: { id: string; title: string; summary: string; conditions: string; quantEvidence: string[]; qualEvidence: string[]; affected: string[] };
  designer: { priorities: { rank: number; text: string }[]; hardLimits: { text: string[]; interpreted: Limits } };
  moderator: { id: string; role: string; checks: string[] };
  agents: BriefAgent[];
  negotiation: NegotiationFormat & { output: string[] };
}

export function buildBrief(args: {
  issue: IssueCandidate;
  communities: Community[];
  priorities: Priority[];
  limits: string[];
  format: NegotiationFormat;
  data: GameData;
  now?: string;
}): NegotiationBrief {
  const included = args.communities.filter((c) => c.included);
  const totalW = included.reduce((a, c) => a + c.weight, 0) || 1;
  const agents: BriefAgent[] = included.flatMap((c) => {
    const cw = c.weight / totalW;
    const reps = c.representatives.length ? c.representatives : [{ id: `${c.id}-1`, name: `${c.name} rep`, need: c.concerns[0] ?? '' }];
    return reps.map((r) => ({
      id: r.id,
      role: 'perspective' as const,
      name: r.name,
      community: c.name,
      represents: c.description,
      personality: { temperament: c.temperament, speaksFor: r.need },
      needs: [r.need, ...c.concerns].map((x) => x.trim()).filter(Boolean),
      evidence: c.evidence,
      communityWeight: round(cw),
      voteShare: round(cw / reps.length),
    }));
  });
  const interpreted = parseLimits(args.limits, args.data);
  return {
    schema: 'balancebuddies.negotiation-brief/draft-0.1',
    createdAt: args.now ?? new Date().toISOString(),
    patch: args.data.patch,
    status: 'DRAFT — negotiation mechanism still in design; not executed in this prototype',
    issue: {
      id: args.issue.id, title: args.issue.title, summary: args.issue.summary, conditions: args.issue.conditions,
      quantEvidence: args.issue.quant, qualEvidence: args.issue.qual, affected: args.issue.affected,
    },
    designer: {
      priorities: args.priorities.map((p, i) => ({ rank: i + 1, text: p.text })),
      hardLimits: { text: args.limits.filter((l) => l.trim()), interpreted },
    },
    moderator: {
      id: 'developer-agent',
      role: 'Checks every proposal and revision against the designer’s hard limits and priorities; flags violations instead of voting.',
      checks: ['hard limits', 'priority order', 'repetition / role drift'],
    },
    agents,
    negotiation: {
      ...args.format,
      output: ['Original proposal', 'Independent assessments', 'Objections and revisions with rationale', 'Remaining disagreements', 'Candidate changes for testing'],
    },
  };
}

const round = (x: number) => Math.round(x * 1000) / 1000;
