// API client with cold-start resilience: Render's free tier sleeps after ~15 min,
// so the first request can take 30-60s. We retry network errors and 502/503/504.
import { getSupabase } from './supabase';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data: any) {
    super(message);
  }
}

const RETRYABLE = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; retries?: number } = {}): Promise<T> {
  const { method = 'GET', body, retries = 3 } = opts;
  const sb = getSupabase();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (RETRYABLE.has(res.status) && attempt < retries) {
        await sleep(1500 * 2 ** attempt);
        continue;
      }
      const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
      if (!res.ok) throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data);
      return data as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      lastErr = e;
      if (attempt < retries) await sleep(1500 * 2 ** attempt);
    }
  }
  throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', lastErr);
}

/** Ping /health until the server answers. Calls onTick so the UI can show progress. */
export async function wakeServer(onTick: (attempt: number) => void, maxWaitMs = 90_000): Promise<boolean> {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxWaitMs) {
    attempt++;
    onTick(attempt);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch('/health', { cache: 'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return true;
    } catch {
      /* still waking */
    }
    await sleep(Math.min(2000 * attempt, 6000));
  }
  return false;
}

/** Download an authenticated file (e.g. CSV export) and save it in the browser. */
export async function downloadFile(path: string, filename: string) {
  const sb = getSupabase();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(res.status, 'Export failed. Please try again.', null);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
