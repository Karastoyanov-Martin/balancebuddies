import VERIFY from '../../data/verification.json';
import { useProject } from '../../store/project';
import { Avatar } from '../Avatar';
import { useMemo, useState } from 'react';
import { Combat } from '../../sim/engine';
import { describeEffect, describePassive } from '../../sim/describe';
import { countTraits, paramAt } from '../../sim/traitCount';
import type { CombatResult, GameData, Placement, SimRules, Star, Team } from '../../sim/types';
import { HBars } from '../charts';
import { Icon } from '../common';

const ROLE_HELP: Record<string, string> = {
  tank: '5 mana per attack · gains mana from damage taken · more likely to be targeted',
  caster: '7 mana per attack · +2 mana per second',
  fighter: '10 mana per attack · bonus attack speed (by stage)',
  carry: '10 mana per attack',
  reaper: '10 mana per attack · 15% less damage from non-targets',
  specialist: 'unique resource (attack counter, rage or no mana)',
};
type VerifyEntry = { status: 'verified' | 'mostly' | 'review'; statConflicts: string[]; ability: { total: number; inBoth: number; inOne: number; derived: string[] } };
const VERIFY_UNITS = (VERIFY as unknown as { units: Record<string, VerifyEntry> }).units;

const STATUS_LABEL = { simulated: 'Simulated', approximated: 'Approximated', 'not-simulated': 'Not simulated' };

export function Inspector({ data, placements, uid, result, time, rules, onStar, onRemove, onEdit }: {
  data: GameData;
  placements: Placement[];
  uid: string;
  result: CombatResult | null;
  /** playback time of the shown fight (seconds) — the Unit tab shows live stats at this moment */
  time?: number;
  rules: Partial<SimRules>;
  onStar: (s: Star) => void;
  onRemove: () => void;
  onEdit: (unitId: string) => void;
}) {
  const p = placements.find((x) => x.uid === uid);
  // stats before the fight (traits applied), from a fresh combat set-up
  const pre = useMemo(() => {
    if (!p) return null;
    try {
      const c = new Combat({ data, placements, seed: 1, rules });
      const u = c.units.find((x) => x.uid === uid)!;
      return { stats: c.liveStats(u), hp: u.hp, maxHp: u.maxHp, mana: u.mana, maxMana: u.maxMana, shield: c.shieldTotal(u) };
    } catch {
      return null;
    }
  }, [data, placements, uid, p, rules]);
  // stats at the current playback moment of the last fight
  const live = useMemo(() => {
    if (!result?.frames?.length || time == null) return null;
    const fs = result.frames;
    let lo = 0;
    let hi = fs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (fs[mid].t <= time + 1e-9) lo = mid;
      else hi = mid - 1;
    }
    const uf = fs[lo].units.find((x) => x.uid === uid);
    const start = fs[0].units.find((x) => x.uid === uid);
    return uf?.stats && start?.stats ? { now: uf, start, t: fs[lo].t } : null;
  }, [result, time, uid]);
  if (!p || !pre) return null;
  const def = data.units[p.unitId];
  const res = result?.units.find((x) => x.uid === uid);
  const S = live ? live.now.stats! : pre.stats;
  const cur = live
    ? { hp: live.now.hp, maxHp: live.now.maxHp, mana: live.now.mana, maxMana: live.now.maxMana, shield: live.now.shield, alive: live.now.alive }
    : { hp: pre.hp, maxHp: pre.maxHp, mana: pre.mana, maxMana: pre.maxMana, shield: pre.shield, alive: true };
  // reference column: start of the fight while playing, the unit's own numbers (no traits) before it
  const ref = live
    ? { ...live.start.stats!, maxHp: live.start.maxHp }
    : { ad: def.ad[p.star - 1], ap: def.ap ?? 100, as: def.as, armor: def.armor, mr: def.mr, range: def.range, crit: rules.critChance ?? 0.25, durability: 0, damageAmp: 0, omnivamp: 0, manaRegen: 0, maxHp: def.hp[p.star - 1] };
  const refLabel = live ? 'at 0 s' : 'unit base';
  const row = (label: string, v: number, r: number, f: (x: number) => string, show = true) => {
    if (!show) return null;
    const diff = Math.abs(v - r) > 1e-6;
    return (
      <tr>
        <td className="muted">{label}</td>
        <td className="num"><b style={diff ? { color: v > r ? 'var(--good)' : 'var(--bad)' } : undefined}>{f(v)}</b>{diff ? <span className="tiny muted"> ({f(r)})</span> : null}</td>
      </tr>
    );
  };
  const i0 = (x: number) => Math.round(x).toString();
  const pc = (x: number) => `${Math.round(x * 100)}%`;
  const scaleStats = { ad: S.ad, ap: S.ap, maxHp: cur.maxHp, armor: S.armor, mr: S.mr };
  const lines = [...def.ability.effects.map((e) => describeEffect(e, p.star - 1, scaleStats)), ...describePassive(def.passive, p.star - 1, scaleStats)];
  return (
    <div className="card">
      <div className="row">
        <Avatar name={def.name} cost={def.cost} size={42} ring={p.team === 'A' ? 'var(--team-a)' : 'var(--team-b)'} />
        <div className="grow">
          <h3>{def.name}</h3>
          <div className="tiny muted">{def.cost}-cost · {def.traits.map((t) => data.traits[t]?.name).join(' · ')} · {p.team === 'A' ? 'Blue' : 'Red'}</div>
        </div>
        <button className="btn xs ghost danger" onClick={onRemove} aria-label="Remove unit"><Icon.trash /></button>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <div className="seg">
          {([1, 2, 3] as Star[]).map((s) => <button key={s} className={p.star === s ? 'on' : ''} onClick={() => onStar(s)}>{s}★</button>)}
        </div>
        <div className="grow" />
        <button className="btn xs" onClick={() => onEdit(def.id)}>Edit numbers</button>
      </div>
      <div className="row tiny" style={{ marginTop: 8, gap: 6 }}>
        {live
          ? <span className="chip orange">Live · {live.t.toFixed(1)} s{cur.alive ? '' : ' · dead'}</span>
          : <span className="chip">Before the fight · traits applied</span>}
        <span className="muted">(grey = {refLabel}; green/red = higher/lower)</span>
      </div>
      <table className="t" style={{ marginTop: 4 }}>
        <tbody>
          <tr><td className="muted">Health</td><td className="num"><b>{i0(cur.hp)}</b> / {i0(cur.maxHp)}{Math.abs(cur.maxHp - ref.maxHp) > 0.5 ? <span className="tiny muted"> (max {i0(ref.maxHp)})</span> : null}</td></tr>
          {def.manaMode !== 'none' && <tr><td className="muted">Mana</td><td className="num"><b>{Math.round(cur.mana)}</b> / {cur.maxMana}{def.manaMode === 'attacks' ? ' attacks' : ''}</td></tr>}
          {row('Shield', cur.shield, 0, i0, cur.shield > 0)}
          {row('Attack Damage', S.ad, ref.ad, i0)}
          {row('Ability Power', S.ap, ref.ap, i0)}
          {row('Attack Speed', S.as, ref.as, (x) => x.toFixed(2))}
          {row('Armor', S.armor, ref.armor, i0)}
          {row('Magic Resist', S.mr, ref.mr, i0)}
          {row('Range', S.range, ref.range, (x) => `${x} hex`)}
          {row('Crit chance', S.crit, ref.crit, pc)}
          {row('Durability', S.durability, ref.durability, pc, S.durability > 0 || ref.durability > 0)}
          {row('Damage Amp', S.damageAmp, ref.damageAmp, (x) => `${Math.round(x)}%`, S.damageAmp > 0 || ref.damageAmp > 0)}
          {row('Omnivamp', S.omnivamp, ref.omnivamp, (x) => `${Math.round(x)}%`, S.omnivamp > 0 || ref.omnivamp > 0)}
          {row('Mana regen', S.manaRegen, ref.manaRegen, (x) => `${x}/s`, S.manaRegen > 0 || ref.manaRegen > 0)}
        </tbody>
      </table>
      <div className="small" style={{ marginTop: 8 }}>
        <span className="chip purple">{def.flavor} {def.role}</span> <span className="tiny muted">{ROLE_HELP[def.role]}</span>
      </div>
      <div className="sep" />
      <div className="small"><b>{def.ability.name}</b> — {def.ability.text}</div>
      {lines.length > 0 && (
        <div className="ability-now" style={{ marginTop: 8 }}>
          <div className="tiny bold" style={{ color: 'var(--ink-2)' }}>
            What the sandbox casts {live ? `at ${live.t.toFixed(1)} s` : 'now'} ({p.star}★ · {Math.round(S.ad)} AD · {Math.round(S.ap)} AP)
          </div>
          <table className="t compact">
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} title={l.formula}>
                  <td className="small">{l.label}{l.formula ? <div className="tiny muted">{l.formula}</div> : null}</td>
                  <td className="num"><b>{l.value}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="tiny" style={{ marginTop: 6, color: 'var(--warn)' }}>Sandbox: {def.ability.simNote}</div>
      {def.dataNote && <div className="tiny muted" style={{ marginTop: 4 }}>Data note: {def.dataNote}</div>}
      <VerifyBadge id={def.id} />
      {res && (
        <>
          <div className="sep" />
          <h4 style={{ marginBottom: 6 }}>Last fight</h4>
          <div className="grid2" style={{ gap: 6 }}>
            <div className="stat"><div className="v">{Math.round(res.damageDealt)}</div><div className="l">damage dealt</div></div>
            <div className="stat"><div className="v">{Math.round(res.damageTaken)}</div><div className="l">damage taken</div></div>
            <div className="stat"><div className="v">{Math.round(res.healing + res.shielding)}</div><div className="l">healing + shielding</div></div>
            <div className="stat"><div className="v">{res.casts}</div><div className="l">casts · {res.attacks} attacks</div></div>
          </div>
        </>
      )}
    </div>
  );
}

export const STATUS_HELP: Record<string, string> = {
  simulated: 'Simulated — the combat effect is implemented as the trait describes.',
  approximated: 'Approximated — the combat-relevant part is implemented, with a stated simplification (e.g. a choice, timing or stacking detail is fixed).',
  'not-simulated': 'Not simulated — the trait is counted and shown, but its effect is outside the sandbox (shop, economy, summons, player choices), so it changes nothing in fights.',
};

export function TraitSwitch({ traitId }: { traitId: string }) {
  const off = useProject((s) => !!s.working.traits[traitId]?.disabled);
  const setWorking = useProject((s) => s.setWorking);
  return (
    <label className="switch" title={off ? 'Trait is switched off for testing — click to turn it on' : 'Switch this trait off to test the board without it'} onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={!off} onChange={() => setWorking((d) => { d.traits[traitId].disabled = !off; })} aria-label={off ? 'Turn trait on' : 'Turn trait off'} />
      <span />
    </label>
  );
}

export function TraitsPanel({ data, placements, onEdit }: { data: GameData; placements: Placement[]; onEdit: (traitId: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const teams: Team[] = ['A', 'B'];
  return (
    <div className="col">
      {teams.map((team) => {
        const list = countTraits(data, placements, team);
        return (
          <div key={team}>
            <h4 style={{ marginBottom: 4, color: team === 'A' ? 'var(--team-a)' : 'var(--team-b)' }}>{team === 'A' ? 'Blue' : 'Red'} traits</h4>
            {!list.length && <div className="small muted">No units.</div>}
            {list.map((t) => {
              const def = data.traits[t.traitId];
              const key = `${team}-${t.traitId}`;
              const active = t.level >= 0 && !def.disabled;
              return (
                <div key={key}>
                  <div className={`trait-row ${active ? 'on' : ''} ${def.disabled ? 'off' : ''}`} onClick={() => setOpen(open === key ? null : key)} style={{ cursor: 'pointer' }}>
                    <span className={`trait-badge ${active ? `l${Math.min(3, t.level)}` : ''}`}>{t.count}</span>
                    <span className={`status-dot ${def.status}`} title={STATUS_HELP[def.status]} />
                    <span className="grow" style={{ fontWeight: active ? 650 : 400, textDecoration: def.disabled ? 'line-through' : undefined }}>{def.name}{def.disabled && <span className="chip" style={{ marginLeft: 6 }}>off</span>}</span>
                    <span className="bps">{def.breakpoints.map((b, i) => (i === t.level ? <b key={i}>{b}</b> : <span key={i}>{b}</span>)).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ' / ', x] : [x]), [])}</span>
                    <TraitSwitch traitId={def.id} />
                  </div>
                  {open === key && (
                    <div className="small" style={{ padding: '4px 8px 8px 38px', color: 'var(--ink-2)' }}>
                      <div>{def.description}</div>
                      <div className="tiny" style={{ marginTop: 4 }}><span className={`chip ${def.status === 'simulated' ? 'good' : def.status === 'approximated' ? 'warn' : ''}`}>{STATUS_LABEL[def.status]}</span> {def.simNote}</div>
                      <div className="tiny muted" style={{ marginTop: 2 }}>{STATUS_HELP[def.status]}</div>
                      {t.level >= 0 && def.params.length > 0 && (
                        <div className="kv">{def.params.map((p) => <span key={p.key}>{p.label}: <b>{paramAt(def, p.key, t.level)}</b></span>)}</div>
                      )}
                      <button className="btn xs" style={{ marginTop: 6 }} onClick={() => onEdit(def.id)}>Edit trait numbers</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="card soft" style={{ padding: 10 }}>
        <div className="tiny bold" style={{ marginBottom: 4 }}>What the dots mean</div>
        {(['simulated', 'approximated', 'not-simulated'] as const).map((k) => (
          <div key={k} className="row tiny" style={{ gap: 6, alignItems: 'flex-start', marginTop: 3 }}><span className={`status-dot ${k}`} style={{ marginTop: 3 }} /><span>{STATUS_HELP[k]}</span></div>
        ))}
        <div className="tiny muted" style={{ marginTop: 6 }}>The switch on each row turns a trait off for testing (it still counts, but grants nothing). Switched-off traits appear in the proposed patch.</div>
      </div>
    </div>
  );
}

export function FightPanel({ data, placements, result, time }: { data: GameData; placements: Placement[]; result: CombatResult | null; time: number }) {
  const [filter, setFilter] = useState<'all' | 'cast' | 'death'>('all');
  if (!result) return <p className="small muted">Run a fight to see the damage meter and combat log.</p>;
  const name = (uid?: string) => {
    const p = placements.find((x) => x.uid === uid);
    return p ? `${data.units[p.unitId]?.name ?? '?'}${p.team === 'A' ? '·B' : '·R'}` : '?';
  };
  const rows = result.units.slice().sort((a, b) => b.damageDealt - a.damageDealt).map((u) => u.uid);
  const values = Object.fromEntries(result.units.map((u) => [u.uid, { dmg: u.damageDealt }]));
  const events = result.events.filter((e) => e.t <= time + 1e-6 && (filter === 'all' ? (['cast', 'death', 'stun', 'trait'].includes(e.type) || (e.type === 'move' && e.note === 'leap')) || (e.type === 'damage' && (e.amount ?? 0) >= 150) : e.type === filter));
  return (
    <div className="col">
      <div className="row">
        <h4 className="grow">Damage dealt</h4>
        <div className="legend"><span><i style={{ background: 'var(--team-a)' }} />Blue</span><span><i style={{ background: 'var(--team-b)' }} />Red</span></div>
      </div>
      <HBars
        rows={rows}
        series={[{ key: 'dmg', label: 'Damage', color: '#2a78d6' }]}
        values={values}
        rowLabel={(uid) => name(uid).replace(/·[BR]$/, '')}
        rowColor={(uid) => (result.units.find((u) => u.uid === uid)?.team === 'A' ? '#2a78d6' : '#e34948')}
        format={(v) => Math.round(v).toLocaleString()}
        colorBarsByRow
      />
      <div className="row">
        <h4 className="grow">Combat log</h4>
        <div className="seg">
          {(['all', 'cast', 'death'] as const).map((f) => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'key events' : f === 'cast' ? 'casts' : 'deaths'}</button>)}
        </div>
      </div>
      <div className="log">
        {events.slice(-200).map((e, i) => (
          <div key={i}>
            <span className="muted">{e.t.toFixed(2)}s </span>
            {e.type === 'cast' && <>✦ <b>{name(e.src)}</b> casts {e.note}</>}
            {e.type === 'death' && <>✖ <b>{name(e.tgt)}</b> dies (by {name(e.src)})</>}
            {e.type === 'damage' && <>{name(e.src)} → {name(e.tgt)} <b>{e.amount}</b> {e.dt}{e.crit ? ' (crit)' : ''}</>}
            {e.type === 'stun' && <>⌁ {name(e.src)} stuns {name(e.tgt)} {e.amount}s</>}
            {e.type === 'trait' && <>◆ {e.note}: {name(e.tgt)}</>}
            {e.type === 'move' && <>➶ <b>{name(e.src)}</b> leaps to {name(e.tgt)} ({e.from?.col},{e.from?.row} → {e.to?.col},{e.to?.row})</>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyBadge({ id }: { id: string }) {
  const v = VERIFY_UNITS[id];
  if (!v) return null;
  const label = { verified: 'Data verified by both research agents', mostly: 'Stats verified; some ability values confirmed by one source', review: 'Some values differ between sources' }[v.status];
  return (
    <details style={{ marginTop: 8 }}>
      <summary className="tiny">
        <span className={`chip ${v.status === 'verified' ? 'good' : v.status === 'mostly' ? 'blue' : 'warn'}`}>{label}</span>
      </summary>
      <div className="tiny" style={{ marginTop: 4, color: 'var(--ink-2)' }}>
        <div>Base stats: {v.statConflicts.length ? v.statConflicts.join('; ') : 'all 8 fields match both agents.'}</div>
        <div>Ability values: {v.ability.inBoth}/{v.ability.total} found in both reports, {v.ability.inOne} in one.</div>
        {v.ability.derived.length > 0 && <div>Derived by the prototype (not quoted by sources): {v.ability.derived.join('; ')}</div>}
      </div>
    </details>
  );
}
