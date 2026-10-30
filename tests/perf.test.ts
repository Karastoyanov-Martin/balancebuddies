import { baselineData } from '../src/data';
import { runBatch } from '../src/sim/batch';
import { place } from './helpers';

// Guards against accidental performance regressions in the engine.
describe('performance', () => {
  it('runs 100 full-board (9v9, 3★ mix) fights in well under 10 s', () => {
    const A = ['sett', 'ahri', 'vi', 'krug', 'diana', 'ashe', 'sentinel', 'elderdragon', 'brambleback'];
    const B = ['taric', 'amumu', 'kennen', 'lux', 'gnar', 'maokai', 'alune', 'sivir', 'morgana'];
    const ps = [
      ...A.map((id, i) => place(id, 'A', i % 7, 4 + Math.floor(i / 7), 2)),
      ...B.map((id, i) => place(id, 'B', i % 7, 3 - Math.floor(i / 7), 2)),
    ];
    const t0 = performance.now();
    const s = runBatch(baselineData(), ps, 100);
    const ms = performance.now() - t0;
    console.log(`100 fights: ${ms.toFixed(0)} ms, avg duration ${s.avgDuration.toFixed(1)} s, A win ${(s.winRateA * 100).toFixed(0)}%`);
    expect(s.runs).toBe(100);
    expect(ms).toBeLessThan(10000);
  });
});
