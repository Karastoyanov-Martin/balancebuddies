import { useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import { COST_COLORS } from '../../data';
import { COLS, ROWS } from '../../sim/hex';
import type { CombatResult, Frame, GameData, Hex, Placement, SimEvent } from '../../sim/types';
import { useIcons } from '../icons';

export const R = 34; // hex radius
const W = Math.sqrt(3) * R;
const PAD = 8;
export const VIEW_W = W * (COLS + 0.5) + PAD * 2;
export const VIEW_H = R * 1.5 * (ROWS - 1) + R * 2 + PAD * 2;

export function hexCenter(col: number, row: number): { x: number; y: number } {
  return { x: PAD + W * (col + 0.5 + (row & 1) * 0.5), y: PAD + R + row * R * 1.5 };
}

function hexPoints(cx: number, cy: number, r = R - 1): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Nearest hex to an SVG point. */
export function pointToHex(x: number, y: number): Hex | null {
  let best: Hex | null = null;
  let bd = Infinity;
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const c = hexCenter(col, row);
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bd) { bd = d; best = { col, row }; }
    }
  return bd <= R * R * 1.1 ? best : null;
}

export const initials = (name: string) => {
  const words = name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean);
  return words.length > 1 ? words.map((w) => w[0]).join('').slice(0, 3) : words[0].slice(0, 2);
};

interface Props {
  data: GameData;
  placements: Placement[];
  result: CombatResult | null;
  time: number; // playback time
  selected: string | null;
  onSelect: (uid: string | null) => void;
  onMove: (uid: string, to: Hex) => void;
  onDropUnit: (unitId: string, to: Hex) => void;
  /** called when the designer starts moving units while a fight result is shown */
  onExitResult: () => void;
  /** draw a line from every unit to its current target */
  showTargets?: boolean;
}

interface DragState { uid: string; x: number; y: number; moved: boolean }

export default function Board({ data, placements, result, time, selected, onSelect, onMove, onDropUnit, onExitResult, showTargets }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const iconState = useIcons();
  const icons = iconState.enabled ? iconState.icons : {};
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropHex, setDropHex] = useState<Hex | null>(null);

  const toSvg = (clientX: number, clientY: number) => {
    const el = svg.current!;
    const r = el.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * VIEW_W, y: ((clientY - r.top) / r.height) * VIEW_H };
  };

  // interpolated frame for playback
  const frame = useMemo(() => (result && result.frames.length ? interpFrame(result.frames, time) : null), [result, time]);
  const nameOf = (uid: string) => data.units[placements.find((p) => p.uid === uid)?.unitId ?? '']?.name ?? '';
  const floaters = useMemo(() => (result ? recentDamage(result.events, time) : new Map<string, number>()), [result, time]);
  const leaps = useMemo(() => (result ? recentLeaps(result.events, time).map((l) => ({ ...l, name: nameOf(l.src) })) : []), [result, time]); // eslint-disable-line react-hooks/exhaustive-deps
  const byUid = useMemo(() => new Map(placements.map((p) => [p.uid, p])), [placements]);

  const onPointerDown = (e: RPE, uid: string) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toSvg(e.clientX, e.clientY);
    setDrag({ uid, x: p.x, y: p.y, moved: false });
  };
  const onPointerMove = (e: RPE) => {
    if (!drag) return;
    const p = toSvg(e.clientX, e.clientY);
    const moved = drag.moved || Math.hypot(p.x - drag.x, p.y - drag.y) > 4;
    // positions can also be changed after a fight: moving a unit returns to the setup view
    if (moved && !drag.moved && result) onExitResult();
    setDrag({ ...drag, x: p.x, y: p.y, moved });
    setDropHex(moved ? pointToHex(p.x, p.y) : null);
  };
  const onPointerUp = () => {
    if (!drag) return;
    if (drag.moved) {
      const h = pointToHex(drag.x, drag.y);
      if (h) onMove(drag.uid, h);
    } else onSelect(drag.uid === selected ? null : drag.uid);
    setDrag(null);
    setDropHex(null);
  };

  const units = frame
    ? frame.units.map((f) => ({ uid: f.uid, x: f.x, y: f.y, hp: f.hp, maxHp: f.maxHp, mana: f.mana, maxMana: f.maxMana, shield: f.shield, alive: f.alive, stunned: f.stunned }))
    : placements.map((p) => {
        const c = hexCenter(p.hex.col, p.hex.row);
        const u = data.units[p.unitId];
        const isDrag = drag?.uid === p.uid && drag.moved;
        return { uid: p.uid, x: isDrag ? drag!.x : c.x, y: isDrag ? drag!.y : c.y, hp: 1, maxHp: 1, mana: u?.manaStart ?? 0, maxMana: u?.manaMax ?? 0, shield: 0, alive: true, stunned: false };
      });

  return (
    <svg
      ref={svg}
      className="board-svg"
      viewBox={`0 0 ${VIEW_W.toFixed(0)} ${VIEW_H.toFixed(0)}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { if (drag) { setDrag(null); setDropHex(null); } }}
      onDragOver={(e) => { e.preventDefault(); const p = toSvg(e.clientX, e.clientY); setDropHex(pointToHex(p.x, p.y)); }}
      onDragLeave={() => setDropHex(null)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/unit');
        const p = toSvg(e.clientX, e.clientY);
        const h = pointToHex(p.x, p.y);
        setDropHex(null);
        if (id && h) onDropUnit(id, h);
      }}
      onClick={(e) => { if (e.target === svg.current) onSelect(null); }}
      role="application"
      aria-label="Combat board: drag units to reposition"
    >
      <defs>
        {(['A', 'B'] as const).map((t) => (
          <marker key={t} id={`arrow-${t}`} viewBox="0 0 10 10" refX="16" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={t === 'A' ? '#2a78d6' : '#e34948'} />
          </marker>
        ))}
        <clipPath id="unit-clip">
          <circle r={R * 0.62} />
        </clipPath>
      </defs>
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          const c = hexCenter(col, row);
          const isDrop = dropHex && dropHex.col === col && dropHex.row === row;
          return <polygon key={`${col}-${row}`} className={`hex ${row >= 4 ? 'a' : 'b'} ${isDrop ? 'drop' : ''}`} points={hexPoints(c.x, c.y)} onClick={() => onSelect(null)} />;
        }),
      )}
      <line x1={PAD} x2={VIEW_W - PAD} y1={hexCenter(0, 3).y + R * 0.75} y2={hexCenter(0, 3).y + R * 0.75} stroke="#b9c2d6" strokeDasharray="5 5" />
      <text x={VIEW_W - PAD - 2} y={hexCenter(0, 0).y - R + 12} textAnchor="end" fontSize="11" fill="#c0504d" fontWeight="700">RED · opponent</text>
      <text x={VIEW_W - PAD - 2} y={VIEW_H - PAD - 4} textAnchor="end" fontSize="11" fill="#2a63b8" fontWeight="700">BLUE · your board</text>

      {/* target lines (all units when enabled, always for the selected unit) */}
      {frame &&
        frame.units.map((u) => {
          if (!u.alive || !u.target || !(showTargets || u.uid === selected)) return null;
          const t = frame.units.find((x) => x.uid === u.target);
          if (!t || !t.alive) return null;
          const team = byUid.get(u.uid)?.team;
          const sel = u.uid === selected;
          return (
            <line key={`tl-${u.uid}`} x1={u.x} y1={u.y} x2={t.x} y2={t.y} stroke={team === 'A' ? '#2a78d6' : '#e34948'} strokeWidth={sel ? 3 : 1.6} strokeOpacity={sel ? 0.9 : 0.45} markerEnd={`url(#arrow-${team})`} pointerEvents="none" />
          );
        })}
      {/* leap / dash trails for 0.7 s */}
      {leaps.map((l, i) => {
        const a = hexCenter(l.from.col, l.from.row);
        const b = hexCenter(l.to.col, l.to.row);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - 30;
        return (
          <g key={`lp-${i}`} pointerEvents="none" opacity={1 - l.age / 0.7}>
            <path d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} fill="none" stroke="#e0a92a" strokeWidth={3} strokeDasharray="6 4" />
            <text x={mx} y={my + 8} textAnchor="middle" fontSize="11" fontWeight="800" fill="#b07d00" stroke="#fff" strokeWidth={3} paintOrder="stroke">
              {l.name} leaps
            </text>
          </g>
        );
      })}
      {units.map((u) => {
        const p = byUid.get(u.uid);
        if (!p) return null;
        const def = data.units[p.unitId];
        if (!def) return null;
        const teamColor = p.team === 'A' ? 'var(--team-a)' : 'var(--team-b)';
        const hpFrac = Math.max(0, u.hp / Math.max(1, u.maxHp));
        const shFrac = Math.min(1, u.shield / Math.max(1, u.maxHp));
        const manaFrac = u.maxMana > 0 ? Math.min(1, u.mana / u.maxMana) : 0;
        const dmg = floaters.get(u.uid);
        const bw = 52;
        return (
          <g
            key={u.uid}
            className={`unit-g ${u.alive ? '' : 'dead'} ${selected === u.uid ? 'sel' : ''}`}
            transform={`translate(${u.x.toFixed(1)},${u.y.toFixed(1)})`}
            onPointerDown={(e) => onPointerDown(e, u.uid)}
            onClick={(e) => e.stopPropagation()}
          >
            <title>{`${def.name} ${'★'.repeat(p.star)} (${p.team === 'A' ? 'blue' : 'red'})`}</title>
            <circle className="ring" r={R * 0.66} fill={COST_COLORS[def.cost]} stroke={teamColor} strokeWidth={4} />
            {icons[def.name] ? (
              <image href={icons[def.name]} x={-R * 0.62} y={-R * 0.62} width={R * 1.24} height={R * 1.24} clipPath="url(#unit-clip)" preserveAspectRatio="xMidYMid slice" pointerEvents="none" />
            ) : (
              <text className="unit-name" textAnchor="middle" dy="4">{initials(def.name)}</text>
            )}
            <circle r={R * 0.62} fill="none" stroke={COST_COLORS[def.cost]} strokeWidth={2} pointerEvents="none" />
            <text textAnchor="middle" y={-R * 0.66 - 3} fontSize="10" fill="#e0a92a" stroke="#6b5000" strokeWidth={0.4}>{'★'.repeat(p.star)}</text>
            {(
              <g transform={`translate(${-bw / 2},${R * 0.5})`}>
                <rect width={bw} height={6} rx={2} fill="#2b3042" />
                <rect width={bw * hpFrac} height={6} rx={2} fill={p.team === 'A' ? 'var(--hp)' : 'var(--hp-enemy)'} />
                {shFrac > 0 && <rect x={Math.min(bw * hpFrac, bw - bw * shFrac)} width={bw * shFrac} height={6} rx={2} fill="#f4f6fb" opacity={0.95} />}
                {u.maxMana > 0 && (
                  <>
                    <rect y={7} width={bw} height={3.5} rx={1.5} fill="#2b3042" />
                    <rect y={7} width={bw * manaFrac} height={3.5} rx={1.5} fill="var(--mana)" />
                  </>
                )}
              </g>
            )}
            {u.stunned && u.alive && <circle r={R * 0.74} fill="none" stroke="#f5c542" strokeWidth={2.5} strokeDasharray="4 3" />}
            {dmg && u.alive !== undefined && (
              <text className="dmg-float" textAnchor="middle" y={-R * 0.95} fill={p.team === 'A' ? '#c0392b' : '#1f5fb8'} stroke="#fff" strokeWidth={2.5} paintOrder="stroke">
                -{Math.round(dmg)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface IFrameUnit { uid: string; x: number; y: number; hp: number; maxHp: number; mana: number; maxMana: number; shield: number; alive: boolean; stunned: boolean; target?: string }

/** Linear interpolation of unit positions between recorded frames for smooth movement. */
export function interpFrame(frames: Frame[], t: number): { t: number; units: IFrameUnit[] } {
  let lo = 0;
  let hi = frames.length - 1;
  if (t <= frames[0].t) hi = 0;
  else if (t >= frames[hi].t) lo = hi;
  else {
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].t <= t) lo = mid;
      else hi = mid;
    }
  }
  const a = frames[lo];
  const b = frames[hi];
  const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return {
    t,
    units: a.units.map((ua, i) => {
      const ub = b.units[i];
      const ca = hexCenter(ua.col, ua.row);
      const cb = hexCenter(ub.col, ub.row);
      return {
        uid: ua.uid,
        x: ca.x + (cb.x - ca.x) * k,
        y: ca.y + (cb.y - ca.y) * k,
        hp: ua.hp + (ub.hp - ua.hp) * k,
        maxHp: ub.maxHp,
        mana: ua.mana + (ub.mana - ua.mana) * k,
        maxMana: ua.maxMana,
        shield: ua.shield + (ub.shield - ua.shield) * k,
        alive: k < 0.5 ? ua.alive : ub.alive,
        stunned: ua.stunned,
        target: ua.target,
      };
    }),
  };
}

/** Sum of damage each unit took in the last 0.35 s (for floating numbers). */
function recentDamage(events: SimEvent[], t: number): Map<string, number> {
  const m = new Map<string, number>();
  // events are chronological: binary search the window start
  let lo = 0;
  let hi = events.length;
  const from = t - 0.35;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].t < from) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < events.length && events[i].t <= t; i++) {
    const e = events[i];
    if (e.type === 'damage' && e.tgt && e.amount) m.set(e.tgt, (m.get(e.tgt) ?? 0) + e.amount);
  }
  return m;
}

/** Leap events in the last 0.7 s. */
function recentLeaps(events: SimEvent[], t: number): { src: string; from: Hex; to: Hex; age: number }[] {
  const out: { src: string; from: Hex; to: Hex; age: number }[] = [];
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.t > t) continue;
    if (e.t < t - 0.7) break;
    if (e.type === 'move' && e.note === 'leap' && e.from && e.to && e.src) out.push({ src: e.src, from: e.from, to: e.to, age: t - e.t });
  }
  return out;
}
