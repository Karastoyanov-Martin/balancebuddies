import { Avatar } from '../Avatar';
import { useMemo, useState } from 'react';
import { COST_COLORS } from '../../data';
import type { GameData, Star, Team } from '../../sim/types';

export default function Pool({ data, star, setStar, side, setSide, onAdd }: {
  data: GameData;
  star: Star;
  setStar: (s: Star) => void;
  side: Team;
  setSide: (t: Team) => void;
  onAdd: (unitId: string) => void;
}) {
  const [q, setQ] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [trait, setTrait] = useState('');
  const units = useMemo(
    () =>
      Object.values(data.units)
        .filter((u) => (cost ? u.cost === cost : true))
        .filter((u) => (trait ? u.traits.includes(trait) : true))
        .filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.traits.some((t) => data.traits[t]?.name.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
    [data, q, cost, trait],
  );
  return (
    <div className="card pool">
      <div className="row">
        <h3 className="grow">Champions</h3>
        <span className="small muted">{units.length}/65</span>
      </div>
      <div className="row small" style={{ justifyContent: 'space-between' }}>
        <div className="seg" aria-label="Side">
          <button className={side === 'A' ? 'on' : ''} onClick={() => setSide('A')}>Blue</button>
          <button className={side === 'B' ? 'on' : ''} onClick={() => setSide('B')}>Red</button>
        </div>
        <div className="seg" aria-label="Star level">
          {([1, 2, 3] as Star[]).map((s) => (
            <button key={s} className={star === s ? 'on' : ''} onClick={() => setStar(s)}>{s}★</button>
          ))}
        </div>
      </div>
      <input className="input" placeholder="Search name or trait…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row" style={{ gap: 4 }}>
        {[1, 2, 3, 4, 5].map((c) => (
          <button key={c} className={`btn xs ${cost === c ? 'active' : ''}`} style={{ borderColor: COST_COLORS[c] }} onClick={() => setCost(cost === c ? null : c)}>{c}g</button>
        ))}
        <select className="select" style={{ padding: '2px 4px', fontSize: 11 }} value={trait} onChange={(e) => setTrait(e.target.value)} aria-label="Filter by trait">
          <option value="">All traits</option>
          {Object.values(data.traits).sort((a, b) => a.name.localeCompare(b.name)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="tiny muted">Click to add, or drag onto the board.</div>
      <div className="pool-list">
        {units.map((u) => (
          <div
            key={u.id}
            className="champ"
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/unit', u.id); e.dataTransfer.effectAllowed = 'copy'; }}
            onClick={() => onAdd(u.id)}
            title={`${u.name} · ${u.cost} cost · ${u.ability.name}`}
          >
            <Avatar name={u.name} cost={u.cost} size={32} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="nm">{u.name} <span className="tiny muted">{u.cost}g</span></div>
              <div className="tr">{u.traits.map((t) => data.traits[t]?.name ?? t).join(' · ')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
