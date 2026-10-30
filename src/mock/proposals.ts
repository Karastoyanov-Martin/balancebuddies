/*
 * PLACEHOLDER output of Core Task 3 (negotiation is not implemented in the low-fi prototype).
 * Each proposal is a concrete, testable data change plus mocked community stances.
 */
import type { GameData, Placement, Star } from '../sim/types';

export interface Stance {
  community: string;
  stance: 'support' | 'object' | 'neutral';
  reason: string;
}

export interface CandidateProposal {
  id: string;
  title: string;
  change: string;
  rationale: string;
  stances: Stance[];
  remaining: string;
  expected: { min: number; max: number }; // expected change in blue (Riftbeast) win-rate, percentage points
  apply: (d: GameData) => void;
  scenario: string;
}

const growthParam = (d: GameData) => d.traits.riftbeast.params.find((p) => p.key === 'growthPct')!;

export const PROPOSALS: CandidateProposal[] = [
  {
    id: 'p-growth',
    title: 'Slow the Riftbeast (7) growth',
    change: 'Riftbeast 7/10: AD/AP growth every 5 s 5% → 4.5% (−10%)',
    rationale: 'Targets the long-fight snowball that competitive players describe, without touching the early-game units casual and beginner players rely on.',
    stances: [
      { community: 'Competitive / high-rank', stance: 'support', reason: 'Hits the late-fight scaling that drives high-rank dominance.' },
      { community: 'Casual / solo players', stance: 'neutral', reason: 'Small effect on short normal-game fights.' },
      { community: 'Friend groups (Double Up)', stance: 'support', reason: 'Less pressure for a partner to play support-only.' },
      { community: 'Beginners', stance: 'support', reason: 'Guide comp stays intact.' },
      { community: 'Riftbeast enjoyers', stance: 'object', reason: 'Growth is the fantasy — prefers a smaller cut.' },
    ],
    remaining: 'Riftbeast enjoyers want ≤ 5% relative change; agreed to test and revisit.',
    expected: { min: -12, max: -2 },
    apply: (d) => {
      const p = growthParam(d);
      p.values = p.values.map((v) => (v > 0 ? 4.5 : v));
    },
    scenario: 'riftbeast-vs-executioner',
  },
  {
    id: 'p-bramble',
    title: 'Trim Brambleback’s base damage',
    change: 'Brambleback AD 120 → 108 (−10%) at every star level',
    rationale: 'Feedback names Brambleback as the real Riftbeast carry; a base-stat trim is simple to communicate.',
    stances: [
      { community: 'Competitive / high-rank', stance: 'neutral', reason: 'Helps, but leaves growth untouched.' },
      { community: 'Casual / solo players', stance: 'support', reason: 'Fewer one-sided normal games.' },
      { community: 'Friend groups (Double Up)', stance: 'neutral', reason: '—' },
      { community: 'Beginners', stance: 'object', reason: 'Weakens the comp they copy from guides in every fight length.' },
      { community: 'Riftbeast enjoyers', stance: 'object', reason: 'Nerfs the unit, not the problem.' },
    ],
    remaining: 'Beginner accessibility concern unresolved.',
    expected: { min: -15, max: -3 },
    apply: (d) => {
      d.units.brambleback.ad = d.units.brambleback.ad.map((x) => Math.round(x * 0.9 * 10) / 10) as [number, number, number];
    },
    scenario: 'riftbeast-vs-executioner',
  },
  {
    id: 'p-elder',
    title: 'Lower Elder Dragon’s attack damage',
    change: 'Elder Dragon AD 125 → 112 (−10%)',
    rationale: 'Raised by one perspective agent; the Developer Agent flags it against your hard limit.',
    stances: [
      { community: 'Competitive / high-rank', stance: 'support', reason: 'Elder Dragon enables Riftbeast 7.' },
      { community: 'Casual / solo players', stance: 'neutral', reason: '—' },
      { community: 'Friend groups (Double Up)', stance: 'neutral', reason: '—' },
      { community: 'Beginners', stance: 'object', reason: 'Most copied 5-cost.' },
      { community: 'Riftbeast enjoyers', stance: 'object', reason: 'Signature unit.' },
    ],
    remaining: 'Violates “Do not change Elder Dragon base stats” — kept only to show the limit check.',
    expected: { min: -10, max: -2 },
    apply: (d) => {
      d.units.elderdragon.ad = d.units.elderdragon.ad.map((x) => Math.round(x * 0.9 * 10) / 10) as [number, number, number];
    },
    scenario: 'riftbeast-vs-executioner',
  },
];

// ───────────────────────── board presets ─────────────────────────
const P = (id: string, team: 'A' | 'B', col: number, row: number, star: Star = 2): Placement => ({ uid: `${team}-${id}-${col}-${row}`, unitId: id, team, star, hex: { col, row } });

export interface Scenario {
  id: string;
  name: string;
  description: string;
  placements: Placement[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'riftbeast-vs-executioner',
    name: 'Riftbeast 7 vs Executioner flex',
    description: 'Blue: Riftbeast 7 (Elder Dragon counts +2) with Ravager and Invoker. Red: Executioner 4 with Vanguard and Defender frontline. All 2★ except Amumu (1★).',
    placements: [
      P('brambleback', 'A', 2, 4), P('krug', 'A', 3, 4), P('sentinel', 'A', 4, 4), P('murkwolf', 'A', 1, 4),
      P('elderdragon', 'A', 3, 5), P('amumu', 'A', 5, 4, 1),
      P('kogmaw', 'A', 2, 7), P('ahri', 'A', 4, 7),
      P('rammus', 'B', 3, 3), P('hecarim', 'B', 2, 3), P('lillia', 'B', 4, 3), P('diana', 'B', 5, 3),
      P('azir', 'B', 2, 0), P('ezreal', 'B', 4, 0), P('yunara', 'B', 3, 0), P('soraka', 'B', 5, 0),
    ],
  },
  {
    id: 'lunar-positioning',
    name: 'Lunar adjacency test',
    description: 'Blue: Lunar 3 with allies placed next to Lunar units (positional buff). Red: Juggernaut / Brawler frontline. Move the blue units to see the adjacency effect.',
    placements: [
      P('diana', 'A', 3, 4), P('vi', 'A', 2, 4), P('sett', 'A', 4, 4),
      P('aphelios', 'A', 3, 6), P('alune', 'A', 2, 6, 1), P('ahri', 'A', 4, 6),
      P('amumu', 'B', 3, 3), P('krug', 'B', 2, 3), P('sejuani', 'B', 4, 3), P('alistar', 'B', 1, 3),
      P('kogmaw', 'B', 3, 0), P('ashe', 'B', 4, 0, 1),
    ],
  },
  {
    id: 'empty',
    name: 'Empty board',
    description: 'Start from scratch.',
    placements: [],
  },
];
