import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The URL and anon key come from the server at runtime (/api/config), so you only
// configure env vars once on Render and never rebuild to change them.
let client: SupabaseClient | null = null;

export async function initSupabase(): Promise<SupabaseClient> {
  if (client) return client;
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Could not load app config.');
  const cfg = (await res.json()) as { supabaseUrl: string; supabaseAnonKey: string; aiEnabled: boolean };
  client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export function getSupabase(): SupabaseClient | null {
  return client;
}

export const SCREENSHOT_BUCKET = 'screenshots';

export async function signedScreenshotUrl(path: string): Promise<string | null> {
  if (!client) return null;
  const { data } = await client.storage.from(SCREENSHOT_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
