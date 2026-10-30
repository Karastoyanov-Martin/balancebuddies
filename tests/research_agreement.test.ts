import { readFileSync } from 'fs';
import { baselineData } from '../src/data';

/*
 * Regression guard: two independent research agents (different sources, no access to this code)
 * produced research/agentA.json and research/agentB.json. Wherever BOTH agree on a base stat,
 * our data must match (allowing display rounding, e.g. 112.5 shown as 113).
 * Costs must match Riot's own Data Dragon file.
 */
type R = { units: { name: string; [k: string]: unknown }[] };
const A = JSON.parse(readFileSync('research/agentA.json', 'utf8')) as R;
const B = JSON.parse(readFileSync('research/agentB.json', 'utf8')) as R;
const RIOT = JSON.parse(readFileSync('research/riot_costs.json', 'utf8')).costs as Record<string, number>;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const close = (x: unknown, y: unknown) => typeof x === 'number' && typeof y === 'number' && Math.abs(x - y) <= Math.max(0.51, Math.abs(y) * 0.005);
const same = (x: unknown, y: unknown) => (Array.isArray(x) && Array.isArray(y) ? x.length === y.length && x.every((v, i) => close(v, y[i])) : close(x, y));
const FIELDS = ['hp', 'ad', 'as', 'armor', 'mr', 'range', 'manaStart', 'manaMax'];

describe('data agrees with both independent research reports', () => {
  const data = baselineData();
  for (const u of Object.values(data.units)) {
    it(`${u.name}: base stats match wherever Agent A and Agent B agree`, () => {
      const a = A.units.find((x) => norm(x.name) === norm(u.name));
      const b = B.units.find((x) => norm(x.name) === norm(u.name));
      expect(a, 'missing in agent A').toBeDefined();
      expect(b, 'missing in agent B').toBeDefined();
      for (const f of FIELDS) {
        const va = a![f], vb = b![f];
        if (va != null && vb != null && same(va, vb)) {
          expect(same((u as unknown as Record<string, unknown>)[f], va), `${u.name}.${f}: ours ${JSON.stringify((u as unknown as Record<string, unknown>)[f])}, agents ${JSON.stringify(va)}`).toBe(true);
        }
      }
    });
  }
  it('all 65 costs match Riot Data Dragon', () => {
    for (const u of Object.values(data.units)) expect(u.cost, u.name).toBe(RIOT[u.name]);
  });
});
