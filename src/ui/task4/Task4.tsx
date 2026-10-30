import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SCENARIOS } from '../../mock/proposals';
import { DEFAULT_RULES, simulate } from '../../sim/engine';
import { diffData } from '../../sim/patch';
import { baselineData } from '../../data';
import type { CombatResult, Hex, Placement, Star, Team } from '../../sim/types';
import { uid, useProject } from '../../store/project';
import { Icon, Modal } from '../common';
import HowItWorks from '../HowItWorks';
import { useIcons } from '../icons';
import BalanceEditor, { type EditTarget } from './BalanceEditor';
import Board from './Board';
import { FightPanel, Inspector, TraitsPanel } from './Panels';
import Pool from './Pool';
import TestPanel from './TestPanel';

type Tab = 'unit' | 'traits' | 'editor' | 'test' | 'fight';
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];
const ROW_ORDER: Record<Team, number[]> = { A: [4, 5, 6, 7], B: [3, 2, 1, 0] };

export default function Task4() {
  const s = useProject();
  const { placements, working } = s;
  const [result, setResult] = useState<CombatResult | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seed, setSeed] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(s.proposal ? 'test' : 'traits');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [star, setStar] = useState<Star>(2);
  const [side, setSide] = useState<Team>('A');
  const [settings, setSettings] = useState(false);
  const [how, setHow] = useState(false);
  const [showTargets, setShowTargets] = useState(true);
  const iconState = useIcons();
  const changes = useMemo(() => diffData(baselineData(), working), [working]);

  // first visit: load the demo board
  useEffect(() => {
    if (!useProject.getState().placements.length) s.set({ placements: clone(SCENARIOS[0].placements), scenarioName: SCENARIOS[0].name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPlacements = useCallback((fn: (p: Placement[]) => Placement[]) => {
    const st = useProject.getState();
    s.set({ placements: fn(st.placements), scenarioName: st.scenarioName.endsWith('(edited)') || !st.scenarioName ? st.scenarioName || 'Custom board' : `${st.scenarioName} (edited)` });
    setResult(null);
    setPlaying(false);
  }, [s]);

  const occupied = (h: Hex, ps: Placement[]) => ps.find((p) => p.hex.col === h.col && p.hex.row === h.row);

  const addUnit = (unitId: string, at?: Hex) => {
    setPlacements((ps) => {
      let hex = at;
      if (hex) {
        const existing = occupied(hex, ps);
        if (existing) ps = ps.filter((p) => p !== existing); // dropping on a unit replaces it
      } else {
        outer: for (const row of ROW_ORDER[side]) for (const col of COL_ORDER) if (!occupied({ col, row }, ps)) { hex = { col, row }; break outer; }
      }
      if (!hex) return ps;
      const p: Placement = { uid: `${unitId}-${uid()}`, unitId, star, team: hex.row >= 4 ? 'A' : 'B', hex };
      setSelected(p.uid);
      return [...ps, p];
    });
  };

  const moveUnit = (id: string, to: Hex) => {
    setPlacements((ps) => {
      const me = ps.find((p) => p.uid === id);
      if (!me) return ps;
      const other = occupied(to, ps);
      return ps.map((p) => {
        if (p.uid === id) return { ...p, hex: to, team: to.row >= 4 ? 'A' : 'B' };
        if (other && p.uid === other.uid) return { ...p, hex: me.hex, team: me.hex.row >= 4 ? 'A' : 'B' };
        return p;
      });
    });
  };

  const run = () => {
    const r = simulate({ data: working, placements, seed, rules: s.rules, record: true });
    setResult(r);
    setTime(0);
    setPlaying(true);
  };

  // playback loop (real time × speed)
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!playing || !result) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = ((now - last) / 1000) * speed;
      last = now;
      setTime((t) => {
        const nt = Math.min(result.duration, t + dt);
        if (nt >= result.duration) setPlaying(false);
        return nt;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, result, speed]);

  // keyboard: Delete removes the selected unit, Space toggles playback
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !result) {
        setPlacements((ps) => ps.filter((p) => p.uid !== selected));
        setSelected(null);
      }
      if (e.key === ' ' && result) {
        e.preventDefault();
        if (time >= result.duration) setTime(0);
        setPlaying((x) => !x);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [selected, result, time, setPlacements]);

  const loadScenario = (id: string) => {
    const sc = SCENARIOS.find((x) => x.id === id)!;
    s.set({ placements: clone(sc.placements), scenarioName: sc.name });
    setResult(null);
    setSelected(null);
  };

  const editFromAnywhere = (t: EditTarget) => { setEditTarget(t); setTab('editor'); };
  const blueAlive = result ? interpAlive(result, time, 'A') : 0;
  const redAlive = result ? interpAlive(result, time, 'B') : 0;
  const finished = !!result && time >= result.duration - 1e-6;

  return (
    <div>
      <div className="page-head" style={{ marginBottom: 10 }}>
        <div className="grow">
          <h1>Core Task 4 · Choose a change, test it, and reassess</h1>
          <div className="row wrap" style={{ marginTop: 6 }}>
            {s.proposal ? <span className="chip orange">Testing: {s.proposal.title}</span> : <span className="chip">Free exploration</span>}
            <span className="chip blue">{changes.length} value{changes.length === 1 ? '' : 's'} changed vs 18.5</span>
            <span className="chip">No items</span><span className="chip">No shop · spawn any star</span><span className="chip">No economy</span><span className="chip">Move units before/after fights</span>
          </div>
        </div>
        <select className="select" style={{ width: 230 }} value="" onChange={(e) => e.target.value && loadScenario(e.target.value)} aria-label="Load a board preset">
          <option value="">Load board preset…</option>
          {SCENARIOS.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
        </select>
        <button className="btn sm" onClick={() => setHow(true)}>How it works</button>
        <button className="btn sm" onClick={() => setSettings(true)}>Sim rules</button>
      </div>

      <div className="sandbox">
        <Pool data={working} star={star} setStar={setStar} side={side} setSide={setSide} onAdd={(id) => addUnit(id)} />

        <div>
          <div className="board-wrap">
            <Board
              data={working}
              placements={placements}
              result={result}
              time={time}
              selected={selected}
              onSelect={(u) => { setSelected(u); if (u) setTab('unit'); }}
              onMove={moveUnit}
              onDropUnit={(id, h) => addUnit(id, h)}
              onExitResult={() => { setResult(null); setPlaying(false); }}
              showTargets={showTargets}
            />
          </div>
          <div className="controls">
            <button className="btn primary" onClick={run} disabled={!placements.some((p) => p.team === 'A') || !placements.some((p) => p.team === 'B')}>
              <Icon.play /> {result ? 'Run again' : 'Run fight'}
            </button>
            {result && (
              <>
                <button className="btn" onClick={() => { if (finished) setTime(0); setPlaying(!playing); }} aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Icon.pause /> : <Icon.play />}
                </button>
                <input className="timeline" type="range" min={0} max={result.duration} step={0.05} value={time} onChange={(e) => { setTime(+e.target.value); setPlaying(false); }} aria-label="Timeline" />
                <span className="mono small" style={{ width: 92 }}>{time.toFixed(1)}s / {result.duration.toFixed(1)}s</span>
                <div className="seg">
                  {[0.5, 1, 2, 4].map((x) => <button key={x} className={speed === x ? 'on' : ''} onClick={() => setSpeed(x)}>{x}×</button>)}
                </div>
                <button className="btn" onClick={() => { setResult(null); setPlaying(false); }} title="Back to the starting positions"><Icon.reset /> Positions</button>
              </>
            )}
            <label className="row small muted" style={{ gap: 4 }} title="Draw a line from each unit to the enemy it is attacking (the selected unit is always shown)">
              <input type="checkbox" checked={showTargets} onChange={(e) => setShowTargets(e.target.checked)} /> targets
            </label>
            <label className="row small muted" style={{ gap: 4, marginLeft: 'auto' }} title="The seed fixes the fight's dice rolls: which attacks crit and who gets targeted when two enemies are equally close. Same board + same numbers + same seed = exactly the same fight. ⟳ picks a new one.">
              seed <input className="input num" type="number" value={seed} onChange={(e) => setSeed(+e.target.value || 1)} />
              <button className="btn xs ghost" onClick={() => setSeed(1 + Math.floor(Math.random() * 99999))} title="Random seed">⟳</button>
            </label>
          </div>
          {result && (
            <div className={`result-banner ${finished ? result.winner : 'draw'}`}>
              {finished ? (
                <>
                  <span>{result.winner === 'A' ? 'Blue wins' : result.winner === 'B' ? 'Red wins' : 'Draw (time limit)'}</span>
                  <span className="small" style={{ fontWeight: 500 }}>after {result.duration.toFixed(1)}s · survivors {blueAlive} blue / {redAlive} red · drag a unit to reposition and run again</span>
                </>
              ) : (
                <span className="small">Fighting… {blueAlive} blue vs {redAlive} red alive</span>
              )}
            </div>
          )}
          <div className="small muted" style={{ marginTop: 8 }}>
            {s.scenarioName || 'Custom board'}. Drag units to move or swap them (also across the line to change team). Click a unit to inspect it; <kbd>Delete</kbd> removes it. Bars: health (green/red), shield (white), mana (blue).
          </div>
        </div>

        <div className="side">
          <div className="card" style={{ padding: 12 }}>
            <div className="tabs">
              {(['unit', 'traits', 'editor', 'test', 'fight'] as Tab[]).map((t) => (
                <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                  {{ unit: 'Unit', traits: 'Traits', editor: 'Editor', test: 'Test', fight: 'Log' }[t]}
                </button>
              ))}
            </div>
            {tab === 'unit' && (selected && placements.some((p) => p.uid === selected) ? (
              <Inspector
                data={working}
                placements={placements}
                uid={selected}
                result={result}
                time={time}
                rules={s.rules}
                onStar={(st) => setPlacements((ps) => ps.map((p) => (p.uid === selected ? { ...p, star: st } : p)))}
                onRemove={() => { setPlacements((ps) => ps.filter((p) => p.uid !== selected)); setSelected(null); }}
                onEdit={(id) => editFromAnywhere({ kind: 'unit', id })}
              />
            ) : <p className="small muted">Click a unit on the board to inspect its stats with traits applied.</p>)}
            {tab === 'traits' && <TraitsPanel data={working} placements={placements} onEdit={(id) => editFromAnywhere({ kind: 'trait', id })} />}
            {tab === 'editor' && <BalanceEditor target={editTarget} setTarget={setEditTarget} />}
            {tab === 'test' && <TestPanel placements={placements} scenarioName={s.scenarioName || 'Custom board'} />}
            {tab === 'fight' && <FightPanel data={working} placements={placements} result={result} time={time} />}
          </div>
        </div>
      </div>

      {how && <HowItWorks onClose={() => setHow(false)} />}
      {settings && (
        <Modal title="Simulation rules" onClose={() => setSettings(false)}>
          <p className="small muted" style={{ marginBottom: 10 }}>Global constants of the simplified combat model. They apply to both baseline and proposed runs.</p>
          <div className="grid2">
            {([
              ['critChance', 'Base crit chance', 0.05],
              ['critDamage', 'Crit damage multiplier', 0.05],
              ['maxTime', 'Time limit (s) → draw', 1],
              ['moveTime', 'Seconds per hex moved', 0.05],
              ['manaPerAttack', 'Mana per attack', 1],
              ['manaPostMitPct', 'Mana from damage taken (post-mitigation)', 0.01],
              ['manaLockTime', 'Mana lock after casting (s)', 0.25],
              ['tankManaPerAttack', 'Tank mana per attack', 1],
              ['casterManaPerAttack', 'Caster mana per attack', 1],
              ['casterManaRegen', 'Caster mana regen / s', 0.5],
              ['fighterAsPct', 'Fighter bonus attack speed % (5–30 by stage)', 5],
              ['reaperDamageReduction', 'Reaper damage reduction % (non-target)', 1],
            ] as const).map(([k, label, step]) => (
              <label key={k} className="field">{label}
                <input className="input" type="number" step={step} value={(s.rules[k] ?? DEFAULT_RULES[k]) as number} onChange={(e) => s.set({ rules: { ...s.rules, [k]: +e.target.value } })} />
              </label>
            ))}
          </div>
          <div className="col" style={{ marginTop: 12, gap: 6 }}>
            <label className="row small"><input type="checkbox" checked={s.rules.tankOnlyDamageMana ?? DEFAULT_RULES.tankOnlyDamageMana} onChange={(e) => s.set({ rules: { ...s.rules, tankOnlyDamageMana: e.target.checked } })} /> Only Tanks gain mana from damage taken (Set 18 role rule)</label>
            <label className="row small"><input type="checkbox" checked={s.rules.manaOverflow ?? DEFAULT_RULES.manaOverflow} onChange={(e) => s.set({ rules: { ...s.rules, manaOverflow: e.target.checked } })} /> Overflow mana carries into the next cast</label>
            <div className="sep" />
            <label className="row small"><input type="checkbox" checked={iconState.enabled} onChange={(e) => iconState.setEnabled(e.target.checked)} /> Show champion icons (Riot Data Dragon)</label>
            <div className="row tiny muted">
              <span className="grow">{iconState.message || (Object.keys(iconState.icons).length ? `${Object.keys(iconState.icons).length} icons cached.` : 'Icons not loaded yet.')}</span>
              <button className="btn xs" onClick={() => iconState.load(true)} disabled={iconState.status === 'loading'}>Reload icons</button>
            </div>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => s.set({ rules: {} })}>Restore defaults</button>
            <button className="btn primary" onClick={() => setSettings(false)}>Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function clone(ps: Placement[]): Placement[] {
  return ps.map((p) => ({ ...p, hex: { ...p.hex } }));
}

function interpAlive(r: CombatResult, t: number, team: Team): number {
  // count units alive at time t using death times
  return r.units.filter((u) => u.team === team && (u.deathTime == null || u.deathTime > t)).length;
}
