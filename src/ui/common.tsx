import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useProject } from '../store/project';

// ───────────────────────── icons (inline SVG, offline) ─────────────────────────
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  upload: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>,
  globe: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  play: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>,
  pause: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>,
  reset: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>,
  brain: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5 3 3 0 0 0 3 5 3 3 0 0 0 5 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5 3 3 0 0 1-3 5 3 3 0 0 1-5 1" /></svg>,
  check: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M4 12l5 5L20 6" /></svg>,
  x: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  arrow: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  back: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>,
  memory: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>,
  download: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>,
  plus: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M12 5v14M5 12h14" /></svg>,
  trash: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
  up: () => <svg width="12" height="12" viewBox="0 0 24 24" {...P}><path d="M6 15l6-6 6 6" /></svg>,
  down: () => <svg width="12" height="12" viewBox="0 0 24 24" {...P}><path d="M6 9l6 6 6-6" /></svg>,
  flask: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><path d="M9 3h6M10 3v6L4 20h16l-6-11V3" /></svg>,
  warn: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M12 3l10 18H2zM12 10v5M12 18v.5" /></svg>,
  info: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>,
  users: () => <svg width="16" height="16" viewBox="0 0 24 24" {...P}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></svg>,
  copy: () => <svg width="14" height="14" viewBox="0 0 24 24" {...P}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>,
};

// ───────────────────────── robot avatar (storyboard style) ─────────────────────────
export function Robot({ color = '#f08a3c', size = 40, label }: { color?: string; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={label ?? 'agent'}>
      <line x1="24" y1="4" x2="24" y2="10" stroke="#2a2f45" strokeWidth="2" />
      <circle cx="24" cy="4" r="3" fill={color} stroke="#2a2f45" strokeWidth="1.5" />
      <rect x="6" y="10" width="36" height="30" rx="10" fill="#fff" stroke="#2a2f45" strokeWidth="2" />
      <rect x="11" y="16" width="26" height="15" rx="6" fill="#1f2436" />
      <circle cx="19" cy="23.5" r="2.4" fill={color} />
      <circle cx="29" cy="23.5" r="2.4" fill={color} />
      <rect x="3" y="20" width="4" height="10" rx="2" fill={color} stroke="#2a2f45" strokeWidth="1.5" />
      <rect x="41" y="20" width="4" height="10" rx="2" fill={color} stroke="#2a2f45" strokeWidth="1.5" />
      <rect x="17" y="34" width="14" height="3" rx="1.5" fill={color} />
    </svg>
  );
}

export const AGENT_COLORS = { quant: '#2a78d6', qual: '#1f9d80', synth: '#6a4fd1', setup: '#f08a3c', test: '#f08a3c' };

// ───────────────────────── streaming agent console ─────────────────────────
export interface ConsoleLine { text: string; kind?: 'dim' | 'ok' | 'warn' }

/** Prints lines one by one (simulated agent "thinking"). Calls onDone once at the end. */
export function AgentConsole({ lines, speed = 260, onDone, runKey }: { lines: ConsoleLine[]; speed?: number; onDone?: () => void; runKey: string | number }) {
  const [n, setN] = useState(0);
  const done = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setN(0);
    done.current = false;
  }, [runKey]);
  useEffect(() => {
    if (n >= lines.length) {
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    const t = setTimeout(() => setN((x) => x + 1), speed);
    return () => clearTimeout(t);
  }, [n, lines.length, speed, onDone]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [n]);
  return (
    <div>
      <div className="console" ref={box} aria-live="polite">
        {lines.slice(0, n).map((l, i) => (
          <div key={i} className={`ln ${l.kind ?? ''}`}>{l.text}</div>
        ))}
        {n < lines.length && <span className="cursor" />}
      </div>
      {n < lines.length && (
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn xs ghost" onClick={() => setN(lines.length)}>Skip animation</button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── JSON viewer with light syntax colouring ─────────────────────────
export function JsonView({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  const parts: ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(json))) {
    if (m.index > last) parts.push(json.slice(last, m.index));
    if (m[1]) parts.push(<span key={i++} className={m[2] ? 'k' : 's'}>{m[1]}</span>, m[2] ?? '');
    else if (m[3]) parts.push(<span key={i++} className="n">{m[3]}</span>);
    else parts.push(<span key={i++} className="b">{m[4]}</span>);
    last = re.lastIndex;
  }
  parts.push(json.slice(last));
  return <pre className="json">{parts}</pre>;
}

export function download(name: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

export function Modal({ children, onClose, title, wide }: { children: ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title} style={wide ? { width: 'min(820px, 100%)' } : undefined}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 className="grow">{title}</h2>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close"><Icon.x /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SimulatedTag({ children = 'Simulated' }: { children?: ReactNode }) {
  return <span className="chip orange" title="This part is mocked in the low-fidelity prototype">{children}</span>;
}

// ───────────────────────── shared memory drawer ─────────────────────────
const TASK_NAMES = { T1: 'Investigate', T2: 'Configure', T3: 'Negotiate', T4: 'Test' };

export function MemoryDrawer() {
  const { memory, set } = useProject();
  return (
    <>
      <div className="drawer-bg" onClick={() => set({ memoryOpen: false })} />
      <aside className="drawer" aria-label="Shared memory">
        <div className="head">
          <Icon.memory />
          <div className="grow">
            <h3>Shared memory</h3>
            <div className="small muted">Evidence, decisions and test results kept across tasks and iterations.</div>
          </div>
          <button className="btn ghost sm" onClick={() => set({ memoryOpen: false })} aria-label="Close"><Icon.x /></button>
        </div>
        <div className="body">
          {memory.length === 0 && <p className="muted">Nothing saved yet. Decisions you make in each task appear here.</p>}
          {[...memory].reverse().map((m) => (
            <div className="mem" key={m.id}>
              <span className={`dot ${m.task}`} />
              <div className="row small muted">
                <span className="chip">{m.task} · {TASK_NAMES[m.task]}</span>
                <span>{new Date(m.at).toLocaleString()}</span>
              </div>
              <div className="bold" style={{ marginTop: 4 }}>{m.title}</div>
              {m.detail && <div className="small" style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{m.detail}</div>}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

export function fmtPct(x: number, digits = 0) {
  return `${(x * 100).toFixed(digits)}%`;
}
