// Pre-Battle Prep focus score. Computed on the server; the browser shows a live preview.
import type { Mood } from './constants';
import { LOW_FOCUS_THRESHOLD } from './constants';

export interface PrepFacts {
  mood: Mood;
  sleepOk: boolean;
  distractions: boolean;
  newsChecked: boolean;
}

const MOOD_COST: Record<Mood, number> = { calm: 0, bored: 20, anxious: 25, overconfident: 25, angry: 45 };

export function focusScore(f: PrepFacts): number {
  let score = 100 - MOOD_COST[f.mood];
  if (!f.sleepOk) score -= 20;
  if (f.distractions) score -= 15;
  if (!f.newsChecked) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function focusVerdict(score: number): 'ready' | 'caution' | 'campfire' {
  if (score < LOW_FOCUS_THRESHOLD) return 'campfire';
  if (score < 80) return 'caution';
  return 'ready';
}
