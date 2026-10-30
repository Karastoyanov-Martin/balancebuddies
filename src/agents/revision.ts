/**
 * Simulated revision of the balance report (Core Task 1, "Review report & select").
 *
 * The designer writes free-text notes ("Ignore Sentinel for now", "Focus on Diamond+",
 * "Does the Azir issue hold for Double Up?"). This module plays the Synthesizing Agent:
 * it splits each note into clauses, recognises a small set of intents with keyword rules,
 * and applies them in order to the candidate list. Notes are cumulative, so a later
 * "bring back Sentinel" undoes an earlier "ignore Sentinel".
 *
 * Real code (deterministic rules) + simulated wording; no language model involved.
 */
import type { FeedbackPost } from '../mock/feedback';
import type { IssueCandidate, QualReport } from './analysis';

export type IntentKind = 'remove' | 'restore' | 'raise' | 'lower' | 'focusHigh' | 'focusLow' | 'check' | 'unclear';

export interface NoteIntent {
  kind: IntentKind;
  /** the part of the note this intent came from */
  clause: string;
  issueIds: string[];
  /** "for now" / "temporarily" — shown as set aside, easy to bring back */
  temporary?: boolean;
  /** game mode or rank band asked about ("Double Up", "Diamond") */
  scope?: string;
  /** what the agent says it did, in plain words */
  explain: string;
}

export interface RemovedIssue {
  issue: IssueCandidate;
  /** note that removed it */
  by: string;
  temporary: boolean;
}

export interface RevisedReport {
  /** visible candidates, highest confidence first */
  issues: IssueCandidate[];
  /** candidates taken out of the report by the designer's notes */
  removed: RemovedIssue[];
  /** how each note was understood (same order as the notes) */
  perNote: NoteIntent[][];
}

const RE = {
  remove: /\b(ignore|skip|remove|drop|exclude|hide|leave (?:out|aside)|set aside|put aside|forget(?: about)?|not interested in|don'?t care about|no need for|take out|get rid of)\b/,
  restore: /\b(bring back|restore|re-?include|un-?ignore|put back|add back|reconsider|show (?:.*) again|include (?:.*) again|un-?hide)\b/,
  lower: /\b(deprioriti[sz]e|lower (?:the )?priority|less important|not (?:that |very )?important|unimportant|low priority|not (?:a|the) priority|later)\b/,
  raise: /\b(prioriti[sz]e|focus on|more important|top priority|high priority|look (?:more )?(?:at|into)|dig into|concentrate on)\b/,
  temporary: /\b(for now|for the moment|temporar(?:y|ily)|this round|right now|at the moment)\b/,
  question: /\?|\b(does|do|is|are|how|what|whether|check)\b/,
  high: /\b(high[- ]?rank|high elo|master\+?|diamond|grandmaster|challenger|competitive|pro play|top players)\b/,
  low: /\b(low[- ]?rank|low elo|casual|beginners?|new players|iron|bronze|silver|gold|normal games?)\b/,
};

const MODES: { re: RegExp; mode: FeedbackPost['mode']; label: string }[] = [
  { re: /double ?up/, mode: 'Double Up', label: 'Double Up' },
  { re: /\bnormals?\b|normal games?|unranked/, mode: 'Normal', label: 'Normal games' },
  { re: /\branked\b/, mode: 'Ranked', label: 'Ranked' },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]/g, '');

/** Words that identify an issue in a note: its id, the units/traits it affects and its title's key nouns. */
export function topicWords(i: IssueCandidate): string[] {
  const fromId = i.id.replace(/^issue-/, '');
  const words = new Set<string>([fromId, ...i.affected]);
  // "apex_predator" → "apexpredator" and "apex"
  for (const a of i.affected) for (const part of a.split('_')) if (part.length >= 4) words.add(part);
  return [...words].map(norm).filter((w) => w.length >= 3);
}

function issuesIn(clause: string, all: IssueCandidate[]): string[] {
  const c = norm(clause);
  return all.filter((i) => topicWords(i).some((w) => c.includes(w))).map((i) => i.id);
}

/** Split a note into clauses: sentences, semicolons, ", and", " but ". */
export function clauses(note: string): string[] {
  return note
    .split(/[.;\n!]|\?(?=\s|$)|,\s*(?:and|but|then)\s+|\s+but\s+|\s+and then\s+/i)
    .map((x) => x.trim())
    .filter((x) => x.length > 1);
}

/** Understand one note against the current candidate list. */
export function interpretNote(note: string, all: IssueCandidate[]): NoteIntent[] {
  const out: NoteIntent[] = [];
  const isQuestion = /\?/.test(note);
  for (const clause of clauses(note)) {
    const t = clause.toLowerCase();
    const ids = issuesIn(t, all);
    const temporary = RE.temporary.test(t) || RE.temporary.test(note.toLowerCase());
    const names = ids.map((id) => short(all.find((i) => i.id === id)!)).join(', ');
    const mode = MODES.find((m) => m.re.test(t));
    if (ids.length && RE.restore.test(t)) out.push({ kind: 'restore', clause, issueIds: ids, explain: `bring back ${names}` });
    else if (ids.length && RE.lower.test(t) && !RE.remove.test(t)) out.push({ kind: 'lower', clause, issueIds: ids, explain: `lower the priority of ${names}` });
    else if (ids.length && RE.remove.test(t)) out.push({ kind: 'remove', clause, issueIds: ids, temporary, explain: `remove ${names} from the report${temporary ? ' for now' : ''}` });
    else if (ids.length && mode && (isQuestion || RE.question.test(t)))
      out.push({ kind: 'check', clause, issueIds: ids, scope: mode.label, explain: `check ${names} in ${mode.label} feedback` });
    else if (ids.length && RE.raise.test(t)) out.push({ kind: 'raise', clause, issueIds: ids, explain: `raise the priority of ${names}` });
    else if (RE.high.test(t) && !ids.length) out.push({ kind: 'focusHigh', clause, issueIds: [], explain: 'prioritise issues that show up at high rank' });
    else if (RE.low.test(t) && !ids.length) out.push({ kind: 'focusLow', clause, issueIds: [], explain: 'prioritise issues that show up at lower ranks' });
    else out.push({ kind: 'unclear', clause, issueIds: ids, explain: ids.length ? `mentions ${names}, but no action recognised` : 'could not link this to an issue or an action' });
  }
  return out;
}

const short = (i: IssueCandidate) => {
  const t = i.title;
  const cut = t.search(/\s(?:is|dominates|over-performs|are)\s/);
  return `“${cut > 0 ? t.slice(0, cut) : t}”`;
};

const clamp = (x: number) => Math.max(0.05, Math.min(0.97, x));

/**
 * Apply all notes, in order, to the agents' candidate list.
 * `base` is the Synthesizing Agent's list before any designer notes.
 */
export function reviseReport(base: IssueCandidate[], notes: string[], qual?: QualReport): RevisedReport {
  const posts = qual ? qual.clusters.flatMap((c) => c.posts) : [];
  const state = new Map(base.map((i) => [i.id, { ...i, quant: [...i.quant], qual: [...i.qual], revisedNote: undefined as string | undefined }]));
  const hints = new Map<string, string[]>();
  const hint = (id: string, h: string) => hints.set(id, [...(hints.get(id) ?? []), h]);
  const removed = new Map<string, RemovedIssue>();
  const perNote: NoteIntent[][] = [];

  for (const note of notes) {
    const intents = interpretNote(note, base);
    perNote.push(intents);
    for (const it of intents) {
      for (const id of it.issueIds) {
        const i = state.get(id)!;
        if (it.kind === 'remove') removed.set(id, { issue: i, by: note, temporary: !!it.temporary });
        if (it.kind === 'restore') { removed.delete(id); hint(id, 'brought back'); }
        if (it.kind === 'lower') { i.confidence = clamp(i.confidence - 0.3); hint(id, 'deprioritised as requested'); }
        if (it.kind === 'raise') { i.confidence = clamp(i.confidence + 0.15); hint(id, 'prioritised as requested'); }
        if (it.kind === 'check' && it.scope) {
          const mode = MODES.find((m) => m.label === it.scope)!.mode;
          const inMode = posts.filter((p) => p.mode === mode);
          const words = topicWords(i);
          const about = inMode.filter((p) => words.some((w) => norm(p.text).includes(w)));
          const line = `${it.scope} check: ${about.length} of ${inMode.length} ${it.scope} posts mention this issue${about[0] ? ` — e.g. “${about[0].text.slice(0, 90)}${about[0].text.length > 90 ? '…' : ''}”` : ''}`;
          if (!i.qual.includes(line)) i.qual.push(line);
          hint(id, about.length ? `holds in ${it.scope} (${about.length} posts)` : `no ${it.scope} evidence found`);
        }
      }
      if (it.kind === 'focusHigh' || it.kind === 'focusLow')
        for (const i of state.values()) {
          const hit = it.kind === 'focusHigh' ? /master|high rank|diamond/i.test(i.conditions) : /iron|plat|lower/i.test(i.conditions);
          if (hit) { i.confidence = clamp(i.confidence + 0.08); hint(i.id, it.kind === 'focusHigh' ? 'prioritised for high-rank focus' : 'prioritised for lower-rank focus'); }
        }
    }
  }
  const visible = [...state.values()].filter((i) => !removed.has(i.id));
  for (const i of state.values()) {
    const h = hints.get(i.id);
    i.revisedNote = notes.length ? (h?.length ? `Revised: ${[...new Set(h)].join('; ')}.` : 'Reviewed against your notes — no change.') : undefined;
  }
  // keep the removed entries pointing at the final version of each issue
  for (const [id, r] of removed) r.issue = state.get(id)!;
  return { issues: visible.sort((a, b) => b.confidence - a.confidence), removed: [...removed.values()], perNote };
}

export interface ReportDiff {
  removed: IssueCandidate[];
  restored: IssueCandidate[];
  /** rank and confidence moves of issues present in both versions */
  moved: { issue: IssueCandidate; fromRank: number; toRank: number; fromConf: number; toConf: number }[];
  /** new evidence lines per issue */
  evidence: { issue: IssueCandidate; lines: string[] }[];
}

/** What changed between two report versions. */
export function diffReports(prev: IssueCandidate[], next: IssueCandidate[]): ReportDiff {
  const p = new Map(prev.map((i, k) => [i.id, { i, k }]));
  const n = new Map(next.map((i, k) => [i.id, { i, k }]));
  return {
    removed: prev.filter((i) => !n.has(i.id)),
    restored: next.filter((i) => !p.has(i.id)),
    moved: next
      .filter((i) => p.has(i.id))
      .map((i) => ({ issue: i, fromRank: p.get(i.id)!.k + 1, toRank: n.get(i.id)!.k + 1, fromConf: p.get(i.id)!.i.confidence, toConf: i.confidence }))
      .filter((m) => m.fromRank !== m.toRank || Math.abs(m.fromConf - m.toConf) > 1e-9),
    evidence: next
      .filter((i) => p.has(i.id))
      .map((i) => ({ issue: i, lines: [...i.quant, ...i.qual].filter((x) => ![...p.get(i.id)!.i.quant, ...p.get(i.id)!.i.qual].includes(x)) }))
      .filter((e) => e.lines.length),
  };
}

export const diffIsEmpty = (d: ReportDiff) => !d.removed.length && !d.restored.length && !d.moved.length && !d.evidence.length;
