import { COST_COLORS } from '../data';
import { initials } from './task4/Board';
import { useIcons } from './icons';

/** Round champion avatar: Riot icon when available, otherwise initials on the cost colour. */
export function Avatar({ name, cost, size = 30, ring }: { name: string; cost: number; size?: number; ring?: string }) {
  const { enabled, icons } = useIcons();
  const src = enabled ? icons[name] : undefined;
  return (
    <div className="avatar" style={{ background: COST_COLORS[cost], borderColor: ring ?? COST_COLORS[cost], width: size, height: size, overflow: 'hidden', padding: 0 }} title={name}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : initials(name)}
    </div>
  );
}
