import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config';
import { requireUser } from './lib/auth';
import { admin } from './lib/supabase';
import { errorHandler } from './lib/http';
import { meRouter } from './routes/me';
import { stateRouter } from './routes/state';
import { tradesRouter } from './routes/trades';
import { lifeRouter } from './routes/life';
import { academyRouter } from './routes/academy';
import { mentorRouter } from './routes/mentor';

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy
app.disable('x-powered-by');

const supabaseHost = new URL(config.supabaseUrl).origin;
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", supabaseHost, supabaseHost.replace('https://', 'wss://')],
        imgSrc: ["'self'", 'data:', 'blob:', supabaseHost],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
  }),
);
app.use(compression());
app.use(express.json({ limit: '100kb' }));

// Cheap endpoint for Render's health check and UptimeRobot pings. Touches no database.
app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true, time: new Date().toISOString() });
});

// Point UptimeRobot here: one tiny query keeps the free Supabase project from pausing
// after 7 days of inactivity, and the request itself keeps Render awake.
app.get('/health/db', async (_req, res) => {
  const { error } = await admin.from('monsters').select('id').limit(1);
  res.set('Cache-Control', 'no-store').status(error ? 503 : 200).json({ ok: !error, db: error ? 'unreachable' : 'ok', time: new Date().toISOString() });
});

// Public config for the browser: ONLY the URL and anon key (safe by design, protected by RLS).
app.get('/api/config', (_req, res) => {
  res.json({ supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseAnonKey, aiEnabled: !!config.aiApiKey });
});

// General abuse guard. In-memory counters are fine here: losing them on sleep is harmless.
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
// The Mentor gets its own tighter burst limit on top of the per-day DB limit.
app.use('/api/mentor', rateLimit({ windowMs: 60_000, limit: 6, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', requireUser, meRouter, stateRouter, tradesRouter, lifeRouter, academyRouter, mentorRouter);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API route.' });
});

// Serve the built React app (single Render service).
const webDist = path.resolve(process.cwd(), 'web/dist');
if (fs.existsSync(webDist)) {
  app.use(
    express.static(webDist, {
      index: false,
      // Only hashed /assets/* are immutable; sw.js, manifest and html must always revalidate.
      setHeaders: (res, file) => res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache'),
    }),
  );
  app.get('/{*splat}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Market Quest API listening on :${config.port}`);
});
