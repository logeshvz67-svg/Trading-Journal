import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: unknown) {
    super(message);
  }
}

export const bad = (msg: string, details?: unknown) => new HttpError(400, msg, 'bad_request', details);
export const notFound = (what = 'Not found') => new HttpError(404, what, 'not_found');

/** Throw a readable 400 when the body does not match the schema. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const issues = r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`);
    throw bad(issues[0] ?? 'Invalid input', issues);
  }
  return r.data;
}

/** Unwrap a Supabase result, turning DB errors into 500s (or 400 for check violations). */
export function must<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === '23514' || res.error.code === '22P02' || res.error.code === '23505') throw bad(res.error.message);
    throw new HttpError(500, res.error.message, 'db_error');
  }
  return res.data;
}

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
export const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res, next).catch(next);
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
