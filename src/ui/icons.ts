/*
 * Champion icons from Riot's Data Dragon (public CDN, CORS-enabled).
 * 1. fetch the latest version + tft-champion.json in the browser
 * 2. pick the Set 18 entries (ids contain "18"), map by champion name
 * 3. crop the centre of each splash into a 96×96 JPEG and cache it in localStorage
 * After one online load the icons work offline. Without network the UI shows initials.
 *
 * Riot asset use follows Riot's "Legal Jibber Jabber" policy for non-commercial fan projects.
 */
import { create } from 'zustand';

const CACHE_KEY = 'balancebuddies-icons-v1';
const DD = 'https://ddragon.leagueoflegends.com';

export interface DDragonChamp { id: string; name: string; image: { full: string } }

/** Pure mapping (tested): Set 18 base units only, Lux variants collapse to base Lux. */
export function mapSet18Icons(json: { data: Record<string, DDragonChamp> }, version: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of Object.values(json.data)) {
    if (!/18/.test(c.id) || /\(/.test(c.name)) continue;
    out[c.name] = `${DD}/cdn/${version}/img/tft-champion/${c.image.full}`;
  }
  return out;
}

type Status = 'idle' | 'loading' | 'ready' | 'offline' | 'error';
interface IconState {
  enabled: boolean;
  status: Status;
  message: string;
  icons: Record<string, string>; // champion name → data URL
  setEnabled: (v: boolean) => void;
  load: (force?: boolean) => Promise<void>;
}

function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function cropToDataUrl(url: string, size = 96): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d')!;
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      // splashes are 2:1 "centered" art: take the middle square, nudged up a little to favour faces
      const sx = (img.naturalWidth - side) / 2;
      const sy = Math.max(0, (img.naturalHeight - side) / 2 - side * 0.04);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      try {
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
}

export const useIcons = create<IconState>((set, get) => ({
  enabled: (() => {
    try {
      return localStorage.getItem('balancebuddies-icons-enabled') !== '0';
    } catch {
      return true;
    }
  })(),
  status: 'idle',
  message: '',
  icons: readCache(),
  setEnabled: (v) => {
    try {
      localStorage.setItem('balancebuddies-icons-enabled', v ? '1' : '0');
    } catch {
      /* ignore */
    }
    set({ enabled: v });
    if (v) void get().load();
  },
  load: async (force = false) => {
    const st = get();
    if (st.status === 'loading') return;
    if (!force && Object.keys(st.icons).length >= 65) {
      set({ status: 'ready', message: 'Icons cached locally (Riot Data Dragon).' });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      set({ status: 'offline', message: 'Offline — showing initials. Icons load automatically when online.' });
      return;
    }
    set({ status: 'loading', message: 'Loading icons from Riot Data Dragon…' });
    try {
      const versions: string[] = await fetch(`${DD}/api/versions.json`).then((r) => r.json());
      const v = versions[0];
      const json = await fetch(`${DD}/cdn/${v}/data/en_US/tft-champion.json`).then((r) => r.json());
      const urls = mapSet18Icons(json, v);
      const icons: Record<string, string> = force ? {} : { ...get().icons };
      const entries = Object.entries(urls).filter(([name]) => force || !icons[name]);
      let done = 0;
      await Promise.all(
        entries.map(async ([name, url]) => {
          try {
            icons[name] = await cropToDataUrl(url);
          } catch {
            /* keep initials for this one */
          }
          done++;
          if (done % 8 === 0) set({ icons: { ...icons }, message: `Loading icons… ${done}/${entries.length}` });
        }),
      );
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(icons));
      } catch {
        /* storage full / blocked: icons still work this session */
      }
      set({ icons, status: 'ready', message: `${Object.keys(icons).length} icons loaded from Riot Data Dragon ${v} and cached for offline use.` });
    } catch {
      set({ status: 'error', message: 'Could not reach Riot Data Dragon — showing initials.' });
    }
  },
}));
