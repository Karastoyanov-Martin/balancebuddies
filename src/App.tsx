import { useEffect, useRef, useState } from 'react';
import { PATCH } from './data';
import { useProject, type StepId } from './store/project';
import { Icon, MemoryDrawer, Modal, Robot, download } from './ui/common';
import Home from './ui/Home';
import { useIcons } from './ui/icons';
import Task1 from './ui/task1/Task1';
import Task2 from './ui/task2/Task2';
import Task3 from './ui/task3/Task3';
import Task4 from './ui/task4/Task4';

const STEPS: { id: StepId; n: string; t: string; s: string }[] = [
  { id: 'home', n: '0', t: 'Overview', s: 'Walk path & scope' },
  { id: 't1', n: '1', t: 'Investigate the issue', s: 'Evidence → agents → report' },
  { id: 't2', n: '2', t: 'Configure perspectives', s: 'Communities, weights, limits' },
  { id: 't3', n: '3', t: 'Negotiate', s: 'Placeholder in this prototype' },
  { id: 't4', n: '4', t: 'Test & reassess', s: 'Combat sandbox' },
];

export default function App() {
  const s = useProject();
  const [confirmReset, setConfirmReset] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const loadIcons = useIcons((x) => x.load);
  const iconsEnabled = useIcons((x) => x.enabled);
  useEffect(() => {
    if (iconsEnabled) void loadIcons();
  }, [iconsEnabled, loadIcons]);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [s.step, s.t1Stage, s.t2Stage]);
  const done: Record<StepId, boolean> = {
    home: false,
    t1: !!s.selectedIssueId,
    t2: s.briefApproved,
    t3: !!s.proposal,
    t4: s.decisions.length > 0,
  };
  const page = { home: <Home />, t1: <Task1 />, t2: <Task2 />, t3: <Task3 />, t4: <Task4 /> }[s.step];

  const exportProject = () => {
    const { memoryOpen: _m, ...rest } = useProject.getState();
    void _m;
    download(`balancebuddies-project-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(rest, (_k, v) => (typeof v === 'function' ? undefined : v), 2));
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Robot size={30} />
          <div>
            BalanceBuddies <small>low-fidelity prototype · TFT Set 18 · patch {PATCH}</small>
          </div>
        </div>
        <div className="spacer" />
        <button className="btn sm" onClick={() => s.set({ memoryOpen: true })}>
          <Icon.memory /> Shared memory <span className="chip blue">{s.memory.length}</span>
        </button>
        <button className="btn sm ghost" onClick={exportProject} title="Download the whole project state as JSON">
          <Icon.download /> Export
        </button>
        <button className="btn sm ghost danger" onClick={() => setConfirmReset(true)}>
          <Icon.reset /> Reset
        </button>
      </header>

      <nav className="sidebar" aria-label="Tasks">
        {STEPS.map((st) => (
          <button
            key={st.id}
            className={`nav-item ${s.step === st.id ? 'active' : ''} ${done[st.id] ? 'done' : ''} ${st.id === 't3' ? 'muted' : ''}`}
            onClick={() => s.go(st.id)}
          >
            <span className="num">{done[st.id] ? <Icon.check /> : st.n}</span>
            <span>
              <div className="t">{st.t}</div>
              <div className="s">{st.s}</div>
            </span>
          </button>
        ))}
        <div className="foot">
          Runs fully offline in the browser. Agents in Tasks 1–2 are simulated; the Task 4 combat simulation is real.
        </div>
      </nav>

      <main ref={mainRef} className={`main ${s.step === 't4' ? 'wide' : ''}`}>{page}</main>

      {s.memoryOpen && <MemoryDrawer />}
      {confirmReset && (
        <Modal title="Reset the project?" onClose={() => setConfirmReset(false)}>
          <p>This clears uploaded evidence, the issue report, the brief, board, balance edits, tests and shared memory.</p>
          <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn primary" onClick={() => { s.resetAll(); setConfirmReset(false); }}>Reset everything</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
