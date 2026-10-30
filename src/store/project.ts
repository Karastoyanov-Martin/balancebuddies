/*
 * Single project store (zustand). Persisted to localStorage so a designer can close the
 * tab and continue later — fully offline. "Shared memory" is the `memory` log: every
 * decision across tasks is appended there so later tasks (and later iterations) can
 * compare expectations with outcomes.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Community, IssueCandidate } from '../agents/analysis';
import { DEFAULT_FORMAT, type NegotiationBrief, type NegotiationFormat, type Priority } from '../agents/brief';
import { alignToBaseline, baselineData } from '../data';
import type { FeedbackPost } from '../mock/feedback';
import type { BatchSummary } from '../sim/batch';
import type { Change } from '../sim/patch';
import type { GameData, Placement, SimRules } from '../sim/types';

export type StepId = 'home' | 't1' | 't2' | 't3' | 't4';

export interface Source {
  id: string;
  name: string;
  kind: 'upload' | 'crawl' | 'sample';
  type: 'stats' | 'feedback' | 'other';
  size: number;
  addedAt: string;
  text?: string; // csv text for stats
  posts?: FeedbackPost[];
  note?: string;
}

export interface MemoryEntry {
  id: string;
  at: string;
  task: 'T1' | 'T2' | 'T3' | 'T4';
  title: string;
  detail?: string;
}

export interface TestRecord {
  id: string;
  at: string;
  label: string;
  runs: number;
  scenario: string;
  baseline: BatchSummary;
  proposed: BatchSummary;
  changes: Change[];
  expected: { min: number; max: number } | null;
  /** first seed used; fights used seeds seedStart … seedStart+runs-1 on BOTH sides (older records: 1) */
  seedStart?: number;
}

export interface Decision {
  id: string;
  at: string;
  testId: string | null;
  choice: 'keep' | 'investigate' | 'reopen';
  note: string;
}

export interface Proposal {
  id: string;
  title: string;
  origin: 'placeholder' | 'designer';
  rationale: string;
  expected?: { min: number; max: number };
}

interface State {
  step: StepId;
  sources: Source[];
  t1Stage: 'collect' | 'analyze' | 'review';
  analysisRun: number; // increments each time agents run
  notes: string[];
  reportVersion: number;
  issues: IssueCandidate[];
  dismissed: string[];
  selectedIssueId: string | null;

  communities: Community[];
  priorities: Priority[];
  limits: string[];
  format: NegotiationFormat;
  brief: NegotiationBrief | null;
  briefApproved: boolean;
  t2Stage: 'perspectives' | 'priorities' | 'brief';

  proposal: Proposal | null;
  working: GameData;
  placements: Placement[];
  scenarioName: string;
  rules: Partial<SimRules>;
  tests: TestRecord[];
  decisions: Decision[];

  memory: MemoryEntry[];
  memoryOpen: boolean;
}

interface Actions {
  set: (p: Partial<State>) => void;
  go: (s: StepId) => void;
  remember: (task: MemoryEntry['task'], title: string, detail?: string) => void;
  resetAll: () => void;
  setWorking: (fn: (d: GameData) => void) => void;
  resetWorking: () => void;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const initial = (): State => ({
  step: 'home',
  sources: [],
  t1Stage: 'collect',
  analysisRun: 0,
  notes: [],
  reportVersion: 0,
  issues: [],
  dismissed: [],
  selectedIssueId: null,
  communities: [],
  priorities: [
    { id: 'p1', text: 'Reduce the dominance of the top composition in high-rank lobbies' },
    { id: 'p2', text: 'Keep at least three viable compositions across all ranks' },
    { id: 'p3', text: 'Protect beginner accessibility (comps copied from guides should stay playable)' },
  ],
  limits: ['Keep every numeric change within ±10%', 'No new mechanics this patch', 'Do not change Elder Dragon base stats'],
  format: DEFAULT_FORMAT,
  brief: null,
  briefApproved: false,
  t2Stage: 'perspectives',
  proposal: null,
  working: baselineData(),
  placements: [],
  scenarioName: '',
  rules: {},
  tests: [],
  decisions: [],
  memory: [],
  memoryOpen: false,
});

/**
 * Upgrade data saved by older builds: the saved working data is re-shaped to the current
 * baseline (new stats such as AP appear, removed trait fields disappear) while the
 * designer's edited numbers are kept.
 */
export function migrateProject(persisted: unknown, _from?: number): State {
  void _from;
  const st = (persisted ?? {}) as State;
  if (st.working) st.working = alignToBaseline(st.working);
  return st;
}

export const useProject = create<State & Actions>()(
  persist(
    (set) => ({
      ...initial(),
      set: (p) => set(p),
      go: (step) => set({ step }),
      remember: (task, title, detail) =>
        set((s) => ({ memory: [...s.memory, { id: uid(), at: new Date().toISOString(), task, title, detail }] })),
      resetAll: () => set({ ...initial() }),
      setWorking: (fn) =>
        set((s) => {
          const next = JSON.parse(JSON.stringify(s.working)) as GameData;
          fn(next);
          return { working: next };
        }),
      resetWorking: () => set({ working: baselineData() }),
    }),
    {
      name: 'balancebuddies-prototype-v1',
      storage: createJSONStorage(() => {
        try {
          const k = '__bb_probe__';
          localStorage.setItem(k, '1');
          localStorage.removeItem(k);
          return localStorage;
        } catch {
          // private mode / blocked storage: fall back to memory only
          const mem = new Map<string, string>();
          return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
        }
      }),
      partialize: (s) => {
        const { memoryOpen: _m, ...rest } = s;
        void _m;
        return rest;
      },
      version: 3,
      migrate: (persisted, from) => migrateProject(persisted, from),
      // runs on every load, so data saved before a baseline update always matches the current shape
      merge: (persisted, current) => ({ ...current, ...migrateProject(persisted) }),
    },
  ),
);
