import { useMemo } from 'react';
import { baselineData } from '../../data';
import { describeEffect } from '../../sim/describe';
import { checkLimits, diffData, getPath, parseLimits, setPath, type Change } from '../../sim/patch';
import type { Effect, GameData } from '../../sim/types';
import { useProject } from '../../store/project';
import { Icon } from '../common';
import { TraitSwitch } from './Panels';

const BASE = baselineData();

export type EditTarget = { kind: 'unit' | 'trait'; id: string };

function Num({ path, step = 1, disabled }: { path: (string | number)[]; step?: number; disabled?: boolean }) {
  const working = useProject((s) => s.working);
  const setWorking = useProject((s) => s.setWorking);
  const v = getPath(working, path) as number;
  const b = getPath(BASE, path) as number;
  const changed = typeof b === 'number' && Math.abs(v - b) > 1e-9;
  return (
    <input
      className={`input num ${changed ? 'changed' : ''}`}
      type="number"
      step={step}
      value={Number.isFinite(v) ? v : ''}
      disabled={disabled}
      title={changed ? `Baseline (18.5): ${b}` : 'Unchanged from 18.5'}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) setWorking((d) => setPath(d, path, n));
      }}
      onDoubleClick={() => typeof b === 'number' && setWorking((d) => setPath(d, path, b))}
    />
  );
}

const SCALE_LABEL: Record<string, string> = { ad: '% AD', ap: 'AP (at 100 AP)', hp: '% max HP', flat: 'flat' };

function effectLabel(e: Effect, i: number): string {
  const tgt = 'tgt' in e ? ` · ${e.tgt}${'r' in e && e.r ? ` r${e.r}` : ''}${'n' in e && e.n ? ` ×${e.n}` : ''}` : '';
  const extra = 'stat' in e ? ` ${e.stat}` : 'dt' in e ? ` ${e.dt}` : '';
  return `#${i + 1} ${e.t}${extra}${tgt}`;
}

export default function BalanceEditor({ target, setTarget }: { target: EditTarget | null; setTarget: (t: EditTarget | null) => void }) {
  const s = useProject();
  const changes = useMemo(() => diffData(BASE, s.working), [s.working]);
  const limits = useMemo(() => parseLimits(s.limits, s.working), [s.limits, s.working]);
  const violations = useMemo(() => checkLimits(changes, limits), [changes, limits]);
  const vset = new Set(violations.map((v) => v.change));

  const options = useMemo(
    () => [
      ...Object.values(s.working.traits).map((t) => ({ v: `trait:${t.id}`, l: `Trait · ${t.name}` })),
      ...Object.values(s.working.units).map((u) => ({ v: `unit:${u.id}`, l: `${u.cost}g · ${u.name}` })),
    ].sort((a, b) => a.l.localeCompare(b.l)),
    [s.working],
  );

  return (
    <div className="col">
      <div className="row">
        <select className="select grow" value={target ? `${target.kind}:${target.id}` : ''} onChange={(e) => { const [k, id] = e.target.value.split(':'); setTarget(k ? { kind: k as 'unit' | 'trait', id } : null); }} aria-label="Choose what to edit">
          <option value="">Choose a trait or champion to edit…</option>
          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
      <div className="tiny muted">Edited cells turn orange. Double-click a cell to restore its 18.5 value. Changes apply to the next fight and to the “proposed” side of A/B tests.</div>

      {target?.kind === 'unit' && <UnitEditor id={target.id} data={s.working} locked={limits.lockedUnits.includes(target.id)} />}
      {target?.kind === 'trait' && <TraitEditor id={target.id} data={s.working} locked={limits.lockedTraits.includes(target.id)} />}

      <div className="sep" />
      <div className="row">
        <h4 className="grow">Proposed patch · {changes.length} change{changes.length === 1 ? '' : 's'}</h4>
        <button className="btn xs" disabled={!changes.length} onClick={() => s.resetWorking()}>Reset all</button>
      </div>
      {violations.length > 0 && (
        <div className="banner bad"><Icon.warn /><div><b>{violations.length} change{violations.length > 1 ? 's' : ''} break your brief’s hard limits.</b> You can still test them — the warning is kept with the test record.</div></div>
      )}
      <div className="change-list">
        {changes.length === 0 && <div className="small muted">No changes — this is the 18.5 baseline.</div>}
        {changes.map((c, i) => <ChangeRow key={i} c={c} viol={vset.has(c) ? violations.find((v) => v.change === c)!.reason : null} onOpen={() => setTarget({ kind: c.kind, id: c.id })} />)}
      </div>
    </div>
  );
}

function ChangeRow({ c, viol, onOpen }: { c: Change; viol: string | null; onOpen: () => void }) {
  const setWorking = useProject((s) => s.setWorking);
  const bag = c.kind === 'unit' ? 'units' : 'traits';
  return (
    <div className={`change ${viol ? 'viol' : ''}`} title={viol ?? ''}>
      <span className="grow">
        <a href="#" onClick={(e) => { e.preventDefault(); onOpen(); }}><b>{c.name}</b></a> · {c.label}
        {viol && <div className="tiny" style={{ color: 'var(--bad)' }}>{viol}</div>}
      </span>
      <span className="mono">{c.from} → {c.to}</span>
      {c.pct != null && <span className={`mono delta ${c.to > c.from ? 'up' : 'down'}`}>{c.pct > 0 ? '+' : ''}{c.pct.toFixed(1)}%</span>}
      <button className="btn xs ghost" onClick={() => setWorking((d) => setPath(d, [bag, c.id, ...c.path], c.path[0] === 'disabled' ? false : c.from))} aria-label="Revert"><Icon.reset /></button>
    </div>
  );
}

function UnitEditor({ id, data, locked }: { id: string; data: GameData; locked: boolean }) {
  const u = data.units[id];
  if (!u) return null;
  const P = (...p: (string | number)[]) => ['units', id, ...p];
  // what each star level actually deals with this unit's own stats (no traits) — updates as you type
  const hint = (e: Effect) => {
    if (!('v' in e) || e.t === 'mana' || e.t === 'buffTeam') return null;
    const per = [0, 1, 2].map((k) => describeEffect(e, k, { ad: u.ad[k], ap: u.ap ?? 100, maxHp: u.hp[k], armor: u.armor, mr: u.mr }));
    if (!per.some((l) => l.formula && (l.usesAp || /AD|HP|Armor|MR/.test(l.formula)))) return null;
    return <div className="calc-hint">= {per.map((l, k) => `${k + 1}★ ${l.value}`).join(' · ')} <span className="muted">(with {u.ap ?? 100} AP and the AD/HP above)</span></div>;
  };
  return (
    <div className="card flat" style={{ padding: 12 }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <h3 className="grow">{u.name}</h3>
        {locked && <span className="chip bad">Locked in brief</span>}
      </div>
      <div className="edit-grid">
        <span />
        <span className="h">1★</span><span className="h">2★</span><span className="h">3★</span>
        <span>Health</span>{[0, 1, 2].map((i) => <Num key={i} path={P('hp', i)} step={10} />)}
        <span>Attack Damage</span>{[0, 1, 2].map((i) => <Num key={i} path={P('ad', i)} />)}
      </div>
      <div className="edit-grid" style={{ gridTemplateColumns: '1fr 76px 1fr 76px', marginTop: 8 }}>
        <span>Attack Speed</span><Num path={P('as')} step={0.05} />
        <span style={{ textAlign: 'right' }}>Range</span><Num path={P('range')} />
        <span>Armor</span><Num path={P('armor')} step={5} />
        <span style={{ textAlign: 'right' }}>Magic Resist</span><Num path={P('mr')} step={5} />
        <span>Ability Power</span><Num path={P('ap')} step={5} />
        <span /><span />
        <span>Start mana</span><Num path={P('manaStart')} step={5} />
        <span style={{ textAlign: 'right' }}>Max mana</span><Num path={P('manaMax')} step={5} />
      </div>
      <h4 style={{ margin: '12px 0 4px' }}>{u.ability.name}</h4>
      <div className="tiny muted" style={{ marginBottom: 6 }}>{u.ability.simNote}</div>
      {u.ability.effects.length === 0 && <div className="small muted">No active ability (passive only).</div>}
      {u.ability.effects.map((e, i) => {
        const rows: { label: string; path: (string | number)[] }[] = [];
        const ev = (e as { v?: unknown }).v;
        if (Array.isArray(ev)) rows.push({ label: 'value', path: ['v'] });
        else if (ev && typeof ev === 'object') for (const k of Object.keys(ev)) rows.push({ label: SCALE_LABEL[k] ?? k, path: ['v', k] });
        if ('dur' in e && Array.isArray(e.dur)) rows.push({ label: 'duration (s)', path: ['dur'] });
        const single: { label: string; path: (string | number)[] }[] = [];
        if ('dur' in e && typeof e.dur === 'number') single.push({ label: 'duration (s)', path: ['dur'] });
        if ('r' in e && typeof e.r === 'number') single.push({ label: 'radius', path: ['r'] });
        if ('n' in e && typeof e.n === 'number') single.push({ label: 'targets', path: ['n'] });
        if ('hits' in e && typeof e.hits === 'number') single.push({ label: 'hits', path: ['hits'] });
        if (!rows.length && !single.length) return <div key={i} className="tiny muted">{effectLabel(e, i)}</div>;
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div className="tiny bold" style={{ color: 'var(--ink-2)' }}>{effectLabel(e, i)}</div>
            <div className="edit-grid">
              {rows.map((r) => (
                <FragmentRow key={r.label} label={r.label}>{[0, 1, 2].map((k) => <Num key={k} path={P('ability', 'effects', i, ...r.path, k)} />)}</FragmentRow>
              ))}
            </div>
            {hint(e)}
            {single.length > 0 && (
              <div className="row wrap" style={{ marginTop: 4 }}>
                {single.map((r) => <label key={r.label} className="row tiny" style={{ gap: 4 }}>{r.label}<Num path={P('ability', 'effects', i, ...r.path)} step={0.25} /></label>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FragmentRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="small">{label}</span>
      {children}
    </>
  );
}

function TraitEditor({ id, data, locked }: { id: string; data: GameData; locked: boolean }) {
  const t = data.traits[id];
  if (!t) return null;
  const P = (...p: (string | number)[]) => ['traits', id, ...p];
  const cols = `minmax(90px, 1fr) repeat(${t.breakpoints.length}, minmax(40px, 58px))`;
  return (
    <div className="card flat" style={{ padding: 12 }}>
      <div className="row" style={{ marginBottom: 4 }}>
        <h3 className="grow">{t.name}</h3>
        <label className="row tiny" style={{ gap: 6 }}>{t.disabled ? 'Off' : 'On'}<TraitSwitch traitId={id} /></label>
        {locked && <span className="chip bad">Locked in brief</span>}
        <span className={`chip ${t.status === 'simulated' ? 'good' : t.status === 'approximated' ? 'warn' : ''}`}>{t.status}</span>
      </div>
      <div className="small" style={{ color: 'var(--ink-2)' }}>{t.description}</div>
      <div className="tiny muted" style={{ marginTop: 4 }}>{t.simNote}</div>
      {t.status === 'not-simulated' && <div className="banner" style={{ marginTop: 8 }}><Icon.info /> Editing this trait has no effect in the sandbox yet.</div>}
      <div className="tiny muted" style={{ marginTop: 8 }}>
        Each column is one breakpoint of the trait (how many {t.name} units are needed). A number that is the same at every breakpoint has a single field;
        “—” means that effect only starts at a higher breakpoint.
      </div>
      <div className="edit-grid" style={{ gridTemplateColumns: cols, marginTop: 6 }}>
        <span />
        {t.breakpoints.map((b, i) => <span key={i} className="h bp">({b})</span>)}
        <span className="small bold">Units needed</span>
        {t.breakpoints.map((_, i) => <Num key={i} path={P('breakpoints', i)} />)}
        {t.params.map((p, pi) => (
          <FragmentRow key={p.key} label={`${p.label}${p.assumed ? ' *' : ''}`}>
            {p.same ? (
              <div style={{ gridColumn: `span ${t.breakpoints.length}`, display: 'grid', gridTemplateColumns: 'minmax(40px, 58px) 1fr', gap: 6, alignItems: 'center' }}>
                <Num path={P('params', pi, 'values', 0)} step={p.unit === '%' ? 0.5 : 1} />
                {t.breakpoints.length > 1 && <span className="tiny muted">at every breakpoint</span>}
              </div>
            ) : (
              p.values.map((_, i) =>
                p.from != null && i < p.from
                  ? <span key={i} className="na" title={`Not part of the (${t.breakpoints[i]}) breakpoint`}>—</span>
                  : <Num key={i} path={P('params', pi, 'values', i)} step={p.unit === '%' ? 0.5 : 1} />,
              )
            )}
          </FragmentRow>
        ))}
      </div>
      {t.params.some((p) => p.assumed) && <div className="tiny muted" style={{ marginTop: 6 }}>* value assumed — sources did not state it precisely.</div>}
    </div>
  );
}
