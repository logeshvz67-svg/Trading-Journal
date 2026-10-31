// Colors come from CSS variables set by src/theme/config.ts, so the whole look
// can be restyled from that one file without touching components.
const path = require('node:path');
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
const names = ['bg', 'surface', 'surface2', 'border', 'text', 'muted', 'primary', 'accent', 'hp', 'shield', 'focus', 'gold', 'xp', 'danger', 'warn', 'ok'];

module.exports = {
  content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{ts,tsx}')],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: Object.fromEntries(names.map((n) => [n, v(n)])),
      fontFamily: { body: 'var(--font-body)', display: 'var(--font-display)' },
      borderRadius: { card: 'var(--radius)' },
      keyframes: {
        pop: { '0%': { transform: 'scale(.9)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        rise: { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
      },
      animation: { pop: 'pop .25s ease-out', rise: 'rise .3s ease-out' },
    },
  },
  plugins: [],
};
