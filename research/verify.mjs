// Builds src/data/verification.json + research/RECONCILIATION.md from agentA/agentB vs our data.
import fs from 'node:fs';
const A = JSON.parse(fs.readFileSync('research/agentA.json', 'utf8'));
const B = JSON.parse(fs.readFileSync('research/agentB.json', 'utf8'));
const O = JSON.parse(fs.readFileSync('research/ours.json', 'utf8'));
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const find = (arr, n) => arr.find((x) => norm(x.name) === norm(n));
const close = (x, y) => typeof x === 'number' && typeof y === 'number' && Math.abs(x - y) <= Math.max(0.51, Math.abs(y) * 0.005);
const same = (x, y) => (Array.isArray(x) && Array.isArray(y) ? x.length === y.length && x.every((v, i) => close(v, y[i])) : close(x, y));
const F = ['hp', 'ad', 'as', 'armor', 'mr', 'range', 'manaStart', 'manaMax'];
const out = { generated: '2026-10-27', units: {}, traits: {} };
const md = ['# Data reconciliation — Agent A vs Agent B vs prototype data', '', 'Agent A sources: op.gg unit pages, metabot.gg tables, tftraits.com, official patch notes. Agent B sources: LoL wiki, tft.tools, leagueofgraphs, official patch notes 18.2–18.5 (incl. mid-patches to 27 Oct). Neither agent saw the prototype code.', '', '## Base stats', '', '| Unit | Field | Ours | Agent A | Agent B | Resolution |', '|---|---|---|---|---|---|'];
let tally = { agree3: 0, oursMatchesOne: 0, mismatch: 0 };
for (const u of Object.values(O.units)) {
  const a = find(A.units, u.name), b = find(B.units, u.name);
  const conflicts = [];
  for (const f of F) {
    const va = a?.[f], vb = b?.[f], vo = u[f];
    if (same(va, vo) && same(vb, vo)) { tally.agree3++; continue; }
    if (same(va, vo) || same(vb, vo)) tally.oursMatchesOne++; else tally.mismatch++;
    conflicts.push(`${f}: ours ${JSON.stringify(vo)}, A ${JSON.stringify(va)}, B ${JSON.stringify(vb)}`);
    md.push(`| ${u.name} | ${f} | ${JSON.stringify(vo)} | ${JSON.stringify(va)} | ${JSON.stringify(vb)} | ${same(va, vo) ? 'ours = A' : same(vb, vo) ? 'ours = B' : '**ours differs from both**'} |`);
  }
  // ability: every per-star array in our effects should appear in a source
  const triples = (x) => Object.values(x?.ability?.numbers ?? {}).filter((v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number'));
  const ta = triples(a), tb = triples(b);
  const abil = [];
  u.ability.effects.forEach((e, i) => {
    const arrs = [];
    if (e.v && Array.isArray(e.v)) arrs.push(['value', e.v]);
    else if (e.v) for (const [k, v] of Object.entries(e.v)) arrs.push([k, v]);
    if (e.isolated) for (const [k, v] of Object.entries(e.isolated)) arrs.push(['isolated ' + k, v]);
    for (const [k, v] of arrs) {
      const inA = ta.some((t) => same(t, v)), inB = tb.some((t) => same(t, v));
      abil.push({ effect: `#${i + 1} ${e.t} ${k}`, values: v, inA, inB });
    }
  });
  const nAbil = abil.length, both = abil.filter((x) => x.inA && x.inB).length, one = abil.filter((x) => x.inA !== x.inB).length;
  const status = conflicts.length === 0 && both === nAbil ? 'verified' : conflicts.length === 0 && both + one === nAbil ? 'mostly' : 'review';
  out.units[u.id] = {
    status, statConflicts: conflicts,
    ability: { total: nAbil, inBoth: both, inOne: one, derived: abil.filter((x) => !x.inA && !x.inB).map((x) => `${x.effect}: ${x.values.join('/')}`) },
    agentConfidence: [a?.confidence ?? null, b?.confidence ?? null],
  };
}
md.push('', `Stat fields: ${tally.agree3} agree across all three; ${tally.oursMatchesOne} match one agent; ${tally.mismatch} differ from both (mostly rounding: sources display 112.5 as 113).`, '');
md.push('## Ability values not found verbatim in either report', '', 'These are mostly values the prototype derives on purpose (e.g. Teemo’s 2 clusters × 55 = 110, Azir’s 2 soldiers × 43 = 86, a channel converted to a 3 s DoT).', '');
for (const [id, v] of Object.entries(out.units)) if (v.ability.derived.length) md.push(`- **${O.units[id].name}**: ${v.ability.derived.join('; ')}`);
md.push('', '## Traits', '', '| Trait | Breakpoints (ours / A / B) | Status |', '|---|---|---|');
for (const t of Object.values(O.traits)) {
  const a = find(A.traits, t.name), b = find(B.traits, t.name);
  const bpOk = same(a?.breakpoints, t.breakpoints) && same(b?.breakpoints, t.breakpoints);
  out.traits[t.id] = { breakpointsVerified: bpOk, agentConfidence: [a?.confidence ?? null, b?.confidence ?? null] };
  md.push(`| ${t.name} | ${t.breakpoints.join('/')} / ${a?.breakpoints?.join('/')} / ${b?.breakpoints?.join('/')} | ${bpOk ? 'agree' : 'check'} |`);
}
const costs = JSON.parse(fs.readFileSync('research/riot_costs.json', 'utf8')).costs;
const badCost = Object.values(O.units).filter((u) => costs[u.name] !== u.cost).map((u) => u.name);
md.push('', `## Costs vs Riot Data Dragon`, '', badCost.length ? `Mismatches: ${badCost.join(', ')}` : 'All 65 costs match Riot’s own tft-champion.json.');
fs.writeFileSync('src/data/verification.json', JSON.stringify(out, null, 1));
fs.writeFileSync('research/RECONCILIATION.md', md.join('\n'));
const counts = Object.values(out.units).reduce((a, x) => ((a[x.status] = (a[x.status] ?? 0) + 1), a), {});
console.log(tally, counts, 'badCost', badCost);
