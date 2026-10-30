import { useState, type ReactNode } from 'react';

/*
 * Tiny SVG chart kit (no dependencies, offline).
 * Mark specs from the dataviz guidance: thin bars, 4px rounded data-ends, 2px gaps between
 * adjacent bars, recessive grid, legend for ≥2 series, hover tooltip on every mark.
 */

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface Tip { x: number; y: number; content: ReactNode }

function useTip() {
  const [tip, setTip] = useState<Tip | null>(null);
  const el = tip ? <div className="tooltip" style={{ left: tip.x + 12, top: tip.y + 12 }}>{tip.content}</div> : null;
  return { tip: el, show: (e: React.MouseEvent, content: ReactNode) => setTip({ x: e.clientX, y: e.clientY, content }), hide: () => setTip(null) };
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <div className="legend">
      {series.map((s) => (
        <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>
      ))}
    </div>
  );
}

/** Rounded-top bar path anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
function hbarPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (w <= 0) return '';
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}

/** Vertical grouped bars. values[group][seriesKey]. */
export function GroupedBars({
  groups, series, values, max, format = (v) => v.toFixed(0), height = 180, labelGroup,
}: {
  groups: string[];
  series: Series[];
  values: Record<string, Record<string, number>>;
  max?: number;
  format?: (v: number) => string;
  height?: number;
  /** only this group gets direct value labels (selective labelling) */
  labelGroup?: string;
}) {
  const { tip, show, hide } = useTip();
  const W = 420;
  const H = height;
  const top = 18;
  const bottom = 24;
  const left = 34;
  const plotH = H - top - bottom;
  const m = max ?? Math.max(1e-9, ...groups.flatMap((g) => series.map((s) => values[g]?.[s.key] ?? 0)));
  const gw = (W - left - 8) / groups.length;
  const bw = Math.min(34, (gw - 20) / series.length - 2);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * m);
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grouped bar chart">
        {ticks.map((t, i) => {
          const y = top + plotH - (t / m) * plotH;
          return (
            <g key={i}>
              <line className="grid" x1={left} x2={W - 4} y1={y} y2={y} />
              <text x={left - 6} y={y + 4} textAnchor="end">{format(t)}</text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const gx = left + gi * gw + (gw - series.length * (bw + 2)) / 2;
          return (
            <g key={g}>
              {series.map((s, si) => {
                const v = values[g]?.[s.key] ?? 0;
                const h = (v / m) * plotH;
                const x = gx + si * (bw + 2);
                const y = top + plotH - h;
                return (
                  <g key={s.key}>
                    <rect x={x - 3} y={top} width={bw + 6} height={plotH} fill="transparent" onMouseMove={(e) => show(e, <><b>{g}</b> · {s.label}: {format(v)}</>)} onMouseLeave={hide} />
                    <path d={barPath(x, y, bw, h)} fill={s.color} pointerEvents="none" />
                    {labelGroup === g && <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontWeight="700">{format(v)}</text>}
                  </g>
                );
              })}
              <text x={left + gi * gw + gw / 2} y={H - 6} textAnchor="middle">{g}</text>
            </g>
          );
        })}
        <line className="axis" x1={left} x2={W - 4} y1={top + plotH} y2={top + plotH} />
      </svg>
      {tip}
    </div>
  );
}

/** Horizontal grouped bars, one row per item. */
export function HBars({
  rows, series, values, format = (v) => v.toFixed(0), rowLabel, rowColor, colorBarsByRow,
}: {
  rows: string[];
  series: Series[];
  values: Record<string, Record<string, number>>;
  format?: (v: number) => string;
  rowLabel: (r: string) => string;
  rowColor?: (r: string) => string;
  /** colour bars by row (single-series charts where identity = the row's group) */
  colorBarsByRow?: boolean;
}) {
  const { tip, show, hide } = useTip();
  const W = 380;
  const left = 100;
  const bh = series.length > 1 ? 7 : 11;
  const rowH = series.length * (bh + 2) + 8;
  const H = rows.length * rowH + 10;
  const m = Math.max(1e-9, ...rows.flatMap((r) => series.map((s) => values[r]?.[s.key] ?? 0)));
  const plotW = W - left - 44;
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Horizontal bar chart">
        <line className="axis" x1={left} x2={left} y1={0} y2={H - 6} />
        {rows.map((r, ri) => {
          const y0 = 4 + ri * rowH;
          const best = Math.max(...series.map((s) => values[r]?.[s.key] ?? 0));
          return (
            <g key={r}>
              <rect x={0} y={y0 - 2} width={W} height={rowH - 2} fill="transparent" onMouseMove={(e) => show(e, <div><b>{rowLabel(r)}</b>{series.map((s) => <div key={s.key}>{s.label}: {format(values[r]?.[s.key] ?? 0)}</div>)}</div>)} onMouseLeave={hide} />
              {rowColor && <circle cx={6} cy={y0 + rowH / 2 - 4} r={4} fill={rowColor(r)} pointerEvents="none" />}
              <text x={rowColor ? 14 : 0} y={y0 + rowH / 2} pointerEvents="none">{rowLabel(r)}</text>
              {series.map((s, si) => {
                const v = values[r]?.[s.key] ?? 0;
                return <path key={s.key} d={hbarPath(left, y0 + si * (bh + 2), (v / m) * plotW, bh)} fill={colorBarsByRow && rowColor ? rowColor(r) : s.color} pointerEvents="none" />;
              })}
              <text x={left + (best / m) * plotW + 4} y={y0 + rowH / 2 - 1} pointerEvents="none" fontSize="10">{format(best)}</text>
            </g>
          );
        })}
      </svg>
      {tip}
    </div>
  );
}
