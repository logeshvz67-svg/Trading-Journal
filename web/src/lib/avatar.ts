import { theme } from '../theme/config';

export function avatarEmoji(profile: { avatar?: string } | null | undefined): string {
  const a = profile?.avatar ?? 'knight';
  return theme.avatars.find((x) => x.id === a)?.emoji ?? a;
}

/** Ring color for an equipped frame (a palette token like 'gold'). */
export function frameRing(profile: any): string {
  const f = profile?.equipped?.frame as string | undefined;
  return f ? ({ gold: 'ring-2 ring-gold', shield: 'ring-2 ring-shield', focus: 'ring-2 ring-focus' }[f] ?? '') : '';
}

export function equippedTitle(profile: any): string | null {
  return profile?.equipped?.title ?? null;
}
