/*
 * SIMULATED agents for Core Task 1 & 2.
 *
 * In the full system these are LLM agents. In this low-fidelity prototype they are
 * deterministic functions over the uploaded/crawled data, so the walk-through is
 * reproducible and testable. Numbers shown to the designer are computed from the data;
 * the "interpretation" sentences are templates.
 */
import { reviseReport } from './revision';
import type { FeedbackPost } from '../mock/feedback';
import { THEMES } from '../mock/feedback';
import type { CsvTable } from './preprocess';
import { preprocessFeedback, type PreprocessResult } from './preprocess';

// ───────────────────────── Quantitative Agent ─────────────────────────
export interface QuantFinding {
  id: string;
  title: string;
  detail: string;
  related: string[];
  severity: 'high' | 'medium' | 'low';
  numbers: { label: string; value: string }[];
}

export interface QuantReport {
  tablesUsed: string[];
  tablesSkipped: string[];
  findings: QuantFinding[];
  compTable?: { comp: string; byBand: Record<string, { place: number; top4: number; pick: number; games: number }> }[];
}

const num = (s: string | undefined) => parseFloat((s ?? '').replace('%', ''));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
export const RANK_BANDS = ['Iron–Gold', 'Plat–Emerald', 'Diamond', 'Master+'];

export function quantAgent(tables: CsvTable[]): QuantReport {
  const rep: QuantReport = { tablesUsed: [], tablesSkipped: [], findings: [] };
  for (const t of tables) {
    const h = new Set(t.headers);
    if (h.has('comp') && h.has('rank_band') && h.has('avg_place')) {
      rep.tablesUsed.push(t.name);
      const comps = new Map<string, Record<string, { place: number; top4: number; pick: number; games: number }>>();
      for (const r of t.rows) {
        const c = comps.get(r.comp) ?? {};
        c[r.rank_band] = { place: num(r.avg_place), top4: num(r.top4_rate), pick: num(r.pick_rate), games: num(r.games) || 0 };
        comps.set(r.comp, c);
      }
      rep.compTable = [...comps.entries()].map(([comp, byBand]) => ({ comp, byBand }));
      const overall = rep.compTable.map(({ comp, byBand }) => {
        const bands = Object.values(byBand);
        const games = bands.reduce((a, b) => a + (b.games || 1), 0);
        const place = bands.reduce((a, b) => a + b.place * (b.games || 1), 0) / games;
        const pick = bands.reduce((a, b) => a + b.pick, 0) / bands.length;
        const low = byBand['Iron–Gold']?.place;
        const high = byBand['Master+']?.place;
        return { comp, place, pick, gradient: low != null && high != null ? high - low : 0, byBand };
      });
      overall.sort((a, b) => a.place - b.place);
      for (const o of overall.filter((o) => o.place <= 4.1)) {
        const strongerHigh = o.gradient < -0.15;
        const weakerHigh = o.gradient > 0.15;
        rep.findings.push({
          id: `comp-${slug(o.comp)}`,
          title: `${o.comp} over-performs${strongerHigh ? ', more so at high rank' : weakerHigh ? ' mainly at lower ranks' : ''}`,
          detail: `Weighted average placement ${o.place.toFixed(2)} (4.5 = neutral) with ${o.pick.toFixed(1)}% average pick rate. Placement shifts by ${o.gradient > 0 ? '+' : ''}${o.gradient.toFixed(2)} from Iron–Gold to Master+.`,
          related: relatedFromName(o.comp),
          severity: o.place < 3.9 || strongerHigh ? 'high' : 'medium',
          numbers: RANK_BANDS.filter((b) => o.byBand[b]).map((b) => ({ label: b, value: `${o.byBand[b].place.toFixed(2)} avg · ${o.byBand[b].top4.toFixed(0)}% top 4` })),
        });
      }
      const weakest = overall.slice(-2);
      rep.findings.push({
        id: 'comp-weak',
        title: `Lowest performing comps: ${weakest.map((w) => w.comp).join(', ')}`,
        detail: `Average placement ${weakest.map((w) => w.place.toFixed(2)).join(' / ')}. Possible candidates for compensation if dominant comps are nerfed.`,
        related: weakest.flatMap((w) => relatedFromName(w.comp)),
        severity: 'low',
        numbers: weakest.map((w) => ({ label: w.comp, value: `${w.place.toFixed(2)} avg place` })),
      });
    } else if (h.has('unit') && h.has('avg_place') && h.has('pick_rate')) {
      rep.tablesUsed.push(t.name);
      const units = t.rows.map((r) => ({ unit: r.unit, cost: num(r.cost), place: num(r.avg_place), pick: num(r.pick_rate), top4: num(r.top4_rate) }));
      const contested = units.filter((u) => u.pick >= 20).sort((a, b) => b.pick - a.pick);
      for (const u of contested) {
        rep.findings.push({
          id: `unit-${slug(u.unit)}`,
          title: `${u.unit} is the most contested ${u.cost}-cost (${u.pick.toFixed(1)}% pick)`,
          detail: `High pick rate with average placement ${u.place.toFixed(1)}. ${u.place >= 4.1 ? 'Placement is near neutral — popularity may reflect flexibility rather than raw power.' : 'Placement is also strong.'}`,
          related: [slug(u.unit)],
          severity: u.place < 4.0 ? 'high' : 'medium',
          numbers: [{ label: 'Pick rate', value: `${u.pick.toFixed(1)}%` }, { label: 'Avg place', value: u.place.toFixed(1) }, { label: 'Top 4', value: `${u.top4.toFixed(1)}%` }],
        });
      }
      const byCost = [1, 2, 3, 4, 5].map((c) => {
        const g = units.filter((u) => u.cost === c);
        return { c, mean: g.reduce((a, u) => a + u.place, 0) / Math.max(1, g.length) };
      });
      const outliers = units.filter((u) => {
        const m = byCost.find((b) => b.c === u.cost)!.mean;
        return u.place <= m - 0.35;
      });
      if (outliers.length)
        rep.findings.push({
          id: 'unit-outliers',
          title: `Units beating their cost tier: ${outliers.map((u) => u.unit).join(', ')}`,
          detail: 'Average placement at least 0.35 better than the mean of their cost tier.',
          related: outliers.map((u) => slug(u.unit)),
          severity: 'medium',
          numbers: outliers.map((u) => ({ label: u.unit, value: `${u.place.toFixed(1)} vs tier ${byCost.find((b) => b.c === u.cost)!.mean.toFixed(2)}` })),
        });
    } else rep.tablesSkipped.push(t.name);
  }
  return rep;
}

function relatedFromName(comp: string): string[] {
  const s = comp.toLowerCase();
  const out: string[] = [];
  const map: Record<string, string> = { riftbeast: 'riftbeast', 'elder dragon': 'elderdragon', brambleback: 'brambleback', executioner: 'executioner', azir: 'azir', juggernaut: 'juggernaut', amumu: 'amumu', lunar: 'lunar', aphelios: 'aphelios', blossom: 'blossom', ahri: 'ahri', sprykin: 'sprykin', gnar: 'gnar', spellweaver: 'spellweaver', alune: 'alune', fae: 'fae', lillia: 'lillia', eclipse: 'eclipse' };
  for (const [k, v] of Object.entries(map)) if (s.includes(k)) out.push(v);
  return out;
}

// ───────────────────────── Qualitative Agent ─────────────────────────
export interface Cluster {
  themeId: string;
  label: string;
  posts: FeedbackPost[];
  weight: number; // upvote-weighted share 0..1
  byRank: Record<string, number>;
  byMode: Record<string, number>;
  tone: 'negative' | 'mixed' | 'positive';
  related: string[];
}

export interface QualReport {
  pre: PreprocessResult;
  clusters: Cluster[];
  conflicts: string[];
}

const NEG = ['nerf', 'problem', 'too ', 'oppressive', 'quit', 'pointless', 'stomp', 'confusing', 'forced', 'unkillable', 'less fun', 'snowball'];
const POS = ['fun', 'nice', 'rewarding', 'fine', 'like', 'enjoy', 'solid'];

export function themeOf(text: string): string {
  const t = text.toLowerCase();
  let best = 'other';
  let bestScore = 0;
  for (const th of THEMES) {
    if (th.id === 'other') continue;
    const score = th.keywords.reduce((a, k) => a + (t.includes(k) ? 1 : 0), 0);
    if (score > bestScore) { best = th.id; bestScore = score; }
  }
  return best;
}

export function qualAgent(posts: FeedbackPost[]): QualReport {
  const pre = preprocessFeedback(posts);
  const groups = new Map<string, FeedbackPost[]>();
  for (const p of pre.kept) {
    const id = themeOf(p.text);
    groups.set(id, [...(groups.get(id) ?? []), p]);
  }
  const totalUp = pre.kept.reduce((a, p) => a + Math.log(1 + p.upvotes), 0) || 1;
  const clusters: Cluster[] = [...groups.entries()].map(([id, ps]) => {
    const th = THEMES.find((t) => t.id === id)!;
    const byRank: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    let neg = 0;
    let pos = 0;
    for (const p of ps) {
      byRank[p.rank ?? 'unknown'] = (byRank[p.rank ?? 'unknown'] ?? 0) + 1;
      byMode[p.mode ?? 'unknown'] = (byMode[p.mode ?? 'unknown'] ?? 0) + 1;
      const t = p.text.toLowerCase();
      if (NEG.some((k) => t.includes(k))) neg++;
      if (POS.some((k) => t.includes(k))) pos++;
    }
    return {
      themeId: id, label: th.label, posts: ps.sort((a, b) => b.upvotes - a.upvotes),
      weight: ps.reduce((a, p) => a + Math.log(1 + p.upvotes), 0) / totalUp,
      byRank, byMode, tone: neg > pos ? 'negative' : pos > neg ? 'positive' : 'mixed', related: th.relates,
    };
  });
  clusters.sort((a, b) => b.weight - a.weight);
  const conflicts: string[] = [];
  const rift = clusters.find((c) => c.themeId === 'riftbeast_dominance');
  if (rift && rift.posts.some((p) => /growth/.test(p.text.toLowerCase())) && rift.posts.some((p) => /beginner|guide|casual|early/.test(p.text.toLowerCase())))
    conflicts.push('Riftbeast: competitive players ask to nerf late growth, while casual/beginner players rely on the comp’s early game.');
  const az = clusters.find((c) => c.themeId === 'azir');
  if (az && az.byRank['Master+'] && (az.byRank['Plat–Emerald'] || az.byRank['Iron–Gold']))
    conflicts.push('Azir: lower-rank players report it as oppressive, Master+ players consider it fine after the 18.5 nerf.');
  const sen = clusters.find((c) => c.themeId === 'sentinel_contest');
  if (sen && sen.tone !== 'negative') conflicts.push('Sentinel: players disagree whether high pick rate means it is overpowered or just flexible.');
  return { pre, clusters, conflicts };
}

// ───────────────────────── Synthesizing Agent ─────────────────────────
export interface IssueCandidate {
  id: string;
  title: string;
  summary: string;
  conditions: string;
  agreement: 'agree' | 'partial' | 'conflict';
  agreementNote: string;
  confidence: number; // 0..1
  quant: string[];
  qual: string[];
  affected: string[]; // unit/trait ids
  suggestedCommunities: string[];
  revisedNote?: string;
}

export function synthAgent(q: QuantReport, l: QualReport, designerNotes: string[] = []): IssueCandidate[] {
  const out: IssueCandidate[] = [];
  const f = (id: string) => q.findings.find((x) => x.id === id || x.id.startsWith(id));
  const c = (id: string) => l.clusters.find((x) => x.themeId === id);

  const riftQ = q.findings.filter((x) => x.related.includes('riftbeast'));
  const riftL = c('riftbeast_dominance');
  const div = c('comp_diversity');
  if (riftQ.length || riftL) {
    const both = riftQ.length > 0 && !!riftL;
    out.push({
      id: 'issue-riftbeast',
      title: 'Riftbeast (Elder Dragon / Brambleback) dominates long fights, especially at high rank',
      summary: 'Riftbeast boards place best in every rank band and the gap widens towards Master+. Players describe late-fight growth snowballing and fewer viable alternatives.',
      conditions: 'Long fights (>15 s), Riftbeast 7 reached easily via Apex Predator (+2), stronger at Diamond and Master+.',
      agreement: both ? 'agree' : 'partial',
      agreementNote: both ? 'Statistics and feedback point to the same comp; feedback adds that the *growth*, not the base units, feels like the cause.' : 'Only one evidence source supports this.',
      confidence: both ? 0.82 : 0.5,
      quant: riftQ.map((x) => `${x.title}. ${x.detail}`),
      qual: [
        ...(riftL ? [`${riftL.posts.length} posts in “${riftL.label}” (${Math.round(riftL.weight * 100)}% of weighted feedback)`] : []),
        ...(div ? [`${div.posts.length} posts about few viable compositions`] : []),
        ...l.conflicts.filter((x) => x.startsWith('Riftbeast')),
      ],
      affected: ['riftbeast', 'elderdragon', 'brambleback', 'apex_predator'],
      suggestedCommunities: ['competitive', 'casual', 'friends', 'beginners', 'riftbeast_fans'],
    });
  }
  const sen = f('unit-sentinel');
  const senL = c('sentinel_contest');
  if (sen || senL) {
    out.push({
      id: 'issue-sentinel',
      title: 'Sentinel is contested in almost every composition',
      summary: 'Sentinel has by far the highest pick rate but only a near-neutral placement. Feedback is split between “too universal” and “just flexible”.',
      conditions: 'All ranks; frontline slot of most comps.',
      agreement: 'conflict',
      agreementNote: 'Pick rate is extreme but placement is not — popularity may not equal power. Treat as a lower-priority investigation.',
      confidence: 0.45,
      quant: sen ? [`${sen.title}. ${sen.detail}`] : [],
      qual: senL ? [`${senL.posts.length} posts; tone ${senL.tone}`, ...l.conflicts.filter((x) => x.startsWith('Sentinel'))] : [],
      affected: ['sentinel', 'vanguard', 'invoker'],
      suggestedCommunities: ['competitive', 'casual'],
    });
  }
  const az = q.findings.find((x) => x.related.includes('azir'));
  const azL = c('azir');
  if (az || azL) {
    out.push({
      id: 'issue-azir',
      title: 'Executioner Azir over-performs at lower ranks only',
      summary: 'Azir comps are strong in Iron–Emerald but fall to neutral at Master+. Lower-rank players call it oppressive; high-rank players think it is fine.',
      conditions: 'Iron–Gold and Plat–Emerald lobbies.',
      agreement: 'partial',
      agreementNote: 'Both sources agree on the rank split; whether it needs a change depends on who the designer prioritises.',
      confidence: 0.6,
      quant: az ? [`${az.title}. ${az.detail}`] : [],
      qual: azL ? [`${azL.posts.length} posts`, ...l.conflicts.filter((x) => x.startsWith('Azir'))] : [],
      affected: ['azir', 'executioner'],
      suggestedCommunities: ['casual', 'competitive', 'beginners'],
    });
  }
  if (!out.length && q.findings[0]) {
    const top = q.findings[0];
    out.push({
      id: `issue-${top.id}`, title: top.title, summary: top.detail, conditions: 'See statistics', agreement: 'partial',
      agreementNote: 'Only statistics available.', confidence: 0.4, quant: [top.detail], qual: [], affected: top.related, suggestedCommunities: ['competitive', 'casual'],
    });
  }
  return applyNotes(out, designerNotes, l);
}

/**
 * Designer feedback on the report (remove / bring back / prioritise / check a mode / rank focus).
 * See agents/revision.ts — kept here for backwards compatibility.
 */
export function applyNotes(issues: IssueCandidate[], notes: string[], qual?: QualReport): IssueCandidate[] {
  return reviseReport(issues, notes, qual).issues;
}

// ───────────────────────── Setup Assistant (Task 2) ─────────────────────────
export interface Representative {
  id: string;
  name: string;
  need: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  concerns: string[];
  evidence: string[];
  representatives: Representative[];
  weight: number; // 0..100 (designer-assigned importance)
  included: boolean;
  temperament: string;
}

export function setupAssistant(issue: IssueCandidate, posts: FeedbackPost[]): Community[] {
  const pick = (pred: (p: FeedbackPost) => boolean) => posts.filter(pred).sort((a, b) => b.upvotes - a.upvotes).slice(0, 2).map((p) => `“${p.text}” — ${p.author} (${p.rank ?? 'unknown'}, ${p.mode ?? 'unknown'})`);
  const all: Community[] = [
    {
      id: 'competitive', name: 'Competitive / high-rank', description: 'Diamond and Master+ ranked players optimising placement.',
      concerns: ['Wants more than two viable comps at the top', 'Prefers targeted nerfs to the mechanic causing dominance'],
      evidence: pick((p) => p.rank === 'Master+' || p.rank === 'Diamond'),
      representatives: [{ id: 'competitive-1', name: 'Competitive rep', need: 'Composition diversity in high-rank lobbies' }],
      weight: 35, included: true, temperament: 'Analytical, cites statistics, tolerant of bigger changes',
    },
    {
      id: 'casual', name: 'Casual / solo players', description: 'Iron–Gold ranked and Normal-mode players playing for fun.',
      concerns: ['Wants to try fun comps without losing to the same meta build', 'Dislikes every game ending the same way'],
      evidence: pick((p) => (p.rank === 'Iron–Gold' || p.mode === 'Normal') && p.mode !== 'Double Up'),
      representatives: [{ id: 'casual-1', name: 'Casual rep', need: 'Variety and fun in normal games' }],
      weight: 25, included: true, temperament: 'Experience-focused, sensitive to frustration',
    },
    {
      id: 'friends', name: 'Friend groups (Double Up)', description: 'Players queuing together who combine and support each other’s boards.',
      concerns: ['Team synergy and supporting a partner’s board', 'One partner should not be forced into a support-only role'],
      evidence: pick((p) => p.mode === 'Double Up'),
      representatives: [{ id: 'friends-1', name: 'Double Up rep', need: 'Combinable synergies between partners' }],
      weight: 15, included: true, temperament: 'Cooperative, values shared fun over individual power',
    },
    {
      id: 'beginners', name: 'Beginners', description: 'New players who learn by copying guide comps.',
      concerns: ['Clear, understandable trait rules', 'A reliable, easy comp to learn the game with'],
      evidence: pick((p) => /beginner|new player|guide|understand/.test(p.text.toLowerCase())),
      representatives: [{ id: 'beginners-1', name: 'Beginner rep', need: 'Accessibility of the comps they copy' }],
      weight: 15, included: true, temperament: 'Cautious, prefers small changes',
    },
    {
      id: 'riftbeast_fans', name: 'Riftbeast enjoyers', description: 'Players who like the growing-beasts fantasy and play it often.',
      concerns: ['Keep the fantasy of beasts growing', 'Avoid gutting the comp’s early game'],
      evidence: pick((p) => /fantasy|early game|cool/.test(p.text.toLowerCase())),
      representatives: [{ id: 'riftbeast_fans-1', name: 'Riftbeast rep', need: 'Preserve the comp identity' }],
      weight: 10, included: true, temperament: 'Defensive of the comp, open to growth-number tweaks',
    },
  ];
  return all.map((c) => ({ ...c, included: issue.suggestedCommunities.includes(c.id) }));
}
