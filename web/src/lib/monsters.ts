import { useEffect, useState } from 'react';
import { api } from './api';

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  backstory: string;
  signs: string;
  fix: string;
  drill: string;
  defeat_condition: string;
}

let cache: Promise<{ monsters: Monster[]; mine: any[] }> | null = null;

/** Monster library, fetched once per page load. */
export function useMonsters(refreshKey = 0) {
  const [data, setData] = useState<{ monsters: Monster[]; mine: any[] } | null>(null);
  useEffect(() => {
    if (refreshKey) cache = null;
    cache ??= api('/monsters');
    cache.then(setData).catch(() => (cache = null));
  }, [refreshKey]);
  return data;
}
