/*
 * Conventional (non-AI) preprocessing used before the agents run:
 * CSV parsing, feedback extraction from uploaded files, filtering and de-duplication.
 */
import type { FeedbackPost } from '../mock/feedback';

export interface CsvTable {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
}

/** Minimal RFC-4180-ish CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string, name = 'table.csv'): CsvTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  const headers = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  return { name, headers, rows: rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()]))) };
}

/** Turn an uploaded text/markdown/JSON file into feedback posts. */
export function feedbackFromFile(name: string, text: string): FeedbackPost[] {
  const base = { source: 'upload' as const, rank: 'unknown' as const, mode: 'unknown' as const, date: new Date().toISOString().slice(0, 10), upvotes: 1 };
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const j = JSON.parse(trimmed);
      const arr: unknown[] = Array.isArray(j) ? j : Array.isArray(j.posts) ? j.posts : [j];
      return arr
        .map((x, i) => {
          const o = (typeof x === 'string' ? { text: x } : x) as Record<string, unknown>;
          const t = String(o.text ?? o.body ?? o.content ?? o.comment ?? '');
          return { ...base, id: `${name}-${i}`, author: String(o.author ?? 'anonymous'), text: t, upvotes: Number(o.upvotes ?? o.score ?? 1) || 1 };
        })
        .filter((p) => p.text);
    } catch {
      /* fall through to plain text */
    }
  }
  return trimmed
    .split(/\n\s*\n|\r?\n(?=[-*•]\s)|\r?\n/)
    .map((s) => s.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .map((t, i) => ({ ...base, id: `${name}-${i}`, author: 'anonymous', text: t }));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length > 2));

export function jaccard(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export interface PreprocessResult {
  total: number;
  kept: FeedbackPost[];
  filtered: FeedbackPost[]; // too short / off-topic
  duplicates: FeedbackPost[]; // near-duplicates of a kept post
}

/** Filter very short posts and remove near-duplicates (Jaccard ≥ threshold, keeps the most upvoted). */
export function preprocessFeedback(posts: FeedbackPost[], minChars = 25, dupThreshold = 0.7): PreprocessResult {
  const filtered: FeedbackPost[] = [];
  const candidates: FeedbackPost[] = [];
  for (const p of posts) (norm(p.text).length < minChars ? filtered : candidates).push(p);
  candidates.sort((a, b) => b.upvotes - a.upvotes);
  const kept: FeedbackPost[] = [];
  const duplicates: FeedbackPost[] = [];
  for (const p of candidates) {
    if (kept.some((k) => jaccard(k.text, p.text) >= dupThreshold)) duplicates.push(p);
    else kept.push(p);
  }
  return { total: posts.length, kept, filtered, duplicates };
}
