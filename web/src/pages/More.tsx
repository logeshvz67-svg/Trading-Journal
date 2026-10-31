import { Link } from 'react-router-dom';
import { theme } from '../theme/config';

const ITEMS = [
  { to: '/boss', icon: '👑', label: theme.labels.boss },
  { to: '/mentor', icon: '🧙', label: 'Mentor' },
  { to: '/monsters', icon: '👾', label: theme.labels.monsters },
  { to: '/quests', icon: '📜', label: 'Quest Board' },
  { to: '/records', icon: '📊', label: 'Hall of Records' },
  { to: '/rewards', icon: '🏅', label: 'Rewards' },
  { to: '/codex', icon: '📖', label: 'Codex' },
  { to: '/prep', icon: '🌅', label: theme.labels.prep },
  { to: '/forge', icon: '⚒️', label: theme.labels.forge },
  { to: '/campfire', icon: '🔥', label: theme.labels.campfire },
  { to: '/settings', icon: '⚙️', label: theme.labels.settings },
  { to: '/disclaimer', icon: '⚖️', label: 'Disclaimer' },
];

export default function More() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ITEMS.map((i) => (
        <Link key={i.to} to={i.to} className="card flex flex-col items-center gap-2 py-6 text-center">
          <span className="text-3xl">{i.icon}</span>
          <span className="text-sm font-semibold">{i.label}</span>
        </Link>
      ))}
    </div>
  );
}
