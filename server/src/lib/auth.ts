import type { NextFunction, Request, Response } from 'express';
import { admin } from './supabase';
import { HttpError } from './http';

declare module 'express-serve-static-core' {
  interface Request {
    userId: string;
  }
}

// Short-lived cache of verified tokens. Purely a speed-up: losing it (server sleep) only
// means the next request verifies again. No app state ever lives in server memory.
const cache = new Map<string, { userId: string; until: number }>();
const TTL_MS = 60_000;

export async function requireUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Please sign in.', 'unauthorized');

    const hit = cache.get(token);
    if (hit && hit.until > Date.now()) {
      req.userId = hit.userId;
      return next();
    }
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, 'Your session expired. Please sign in again.', 'unauthorized');

    if (cache.size > 500) cache.clear();
    cache.set(token, { userId: data.user.id, until: Date.now() + TTL_MS });
    req.userId = data.user.id;
    next();
  } catch (e) {
    next(e);
  }
}
