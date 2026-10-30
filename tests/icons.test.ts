import { mapSet18Icons } from '../src/ui/icons';

describe('champion icon mapping (Riot Data Dragon)', () => {
  const json = {
    data: {
      a: { id: 'DA_18_Ahri', name: 'Ahri', image: { full: 'TFT18_Ahri_splash_centered_1.TFT_Set18.png' } },
      b: { id: 'DA_Cinderling18', name: 'Cinderling', image: { full: 'DA_Cinderling18.TFT_Set18.png' } },
      c: { id: 'DA_18_Lux_Fae', name: 'Lux (Fae)', image: { full: 'x.png' } },
      d: { id: 'TFT16_Ahri', name: 'Ahri', image: { full: 'old.png' } },
    },
  };
  const m = mapSet18Icons(json, '16.21.1');
  it('keeps Set 18 units only and skips Lux variants', () => {
    expect(Object.keys(m).sort()).toEqual(['Ahri', 'Cinderling']);
  });
  it('builds Data Dragon image URLs', () => {
    expect(m.Ahri).toBe('https://ddragon.leagueoflegends.com/cdn/16.21.1/img/tft-champion/TFT18_Ahri_splash_centered_1.TFT_Set18.png');
  });
});
