// ONE place to restyle Market Quest: colors, fonts, radius, and every game label.
// Components never hard-code colors; they use Tailwind classes like `bg-hp` that read these values.

type Palette = Record<
  'bg' | 'surface' | 'surface2' | 'border' | 'text' | 'muted' | 'primary' | 'accent' | 'hp' | 'shield' | 'focus' | 'gold' | 'xp' | 'danger' | 'warn' | 'ok',
  string
>;

export const theme = {
  appName: 'Market Quest',
  fonts: {
    body: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    display: "'Cinzel', Georgia, serif",
  },
  radius: '14px',
  palettes: {
    dark: {
      bg: '#0f1222',
      surface: '#181c33',
      surface2: '#222744',
      border: '#2f3558',
      text: '#eef0ff',
      muted: '#9aa0c3',
      primary: '#7c5cff',
      accent: '#22d3ee',
      hp: '#ef476f',
      shield: '#4cc9f0',
      focus: '#b388ff',
      gold: '#ffd166',
      xp: '#06d6a0',
      danger: '#ff4d6d',
      warn: '#ffb020',
      ok: '#2ec27e',
    } satisfies Palette,
    light: {
      bg: '#f5f6fb',
      surface: '#ffffff',
      surface2: '#eceefa',
      border: '#d6d9ec',
      text: '#161a33',
      muted: '#5d6386',
      primary: '#5b3df5',
      accent: '#0891b2',
      hp: '#d6335a',
      shield: '#1d8fbf',
      focus: '#7c4dff',
      gold: '#b7791f',
      xp: '#059669',
      danger: '#dc2645',
      warn: '#c27803',
      ok: '#1f9d55',
    } satisfies Palette,
  },
  labels: {
    hp: 'HP',
    hpLong: 'Daily loss buffer',
    shield: 'Shield',
    shieldLong: 'Max drawdown buffer',
    focus: 'Focus',
    xp: 'XP',
    gold: 'Gold',
    dashboard: 'Command Center',
    prep: 'Pre-Battle Prep',
    battle: 'Battle Station',
    forge: 'Risk Forge',
    log: 'Battle Log',
    boss: 'Boss Arena',
    campfire: 'Campfire',
    monsters: 'Monster Den',
    settings: 'Settings',
    skip: 'Disciplined Retreat',
  },
  avatars: [
    { id: 'knight', emoji: '🛡️', name: 'Knight' },
    { id: 'ranger', emoji: '🏹', name: 'Ranger' },
    { id: 'mage', emoji: '🔮', name: 'Mage' },
    { id: 'monk', emoji: '🧘', name: 'Monk' },
    { id: 'scout', emoji: '🦊', name: 'Scout' },
    { id: 'dragon', emoji: '🐲', name: 'Dragon Rider' },
  ],
  moods: {
    calm: { emoji: '😌', label: 'Calm' },
    anxious: { emoji: '😰', label: 'Anxious' },
    angry: { emoji: '😠', label: 'Angry' },
    bored: { emoji: '🥱', label: 'Bored' },
    overconfident: { emoji: '😎', label: 'Overconfident' },
  },
} as const;

export type ThemeMode = 'dark' | 'light' | 'system';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function applyTheme(mode: ThemeMode) {
  const resolved = mode === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode;
  const root = document.documentElement;
  const pal = theme.palettes[resolved];
  for (const [k, v] of Object.entries(pal)) root.style.setProperty(`--c-${k}`, hexToRgb(v));
  root.style.setProperty('--font-body', theme.fonts.body);
  root.style.setProperty('--font-display', theme.fonts.display);
  root.style.setProperty('--radius', theme.radius);
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pal.bg);
}
