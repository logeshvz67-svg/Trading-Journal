# Free-tier limits, and what to do when they hit

Limits change from time to time. Check the providers' pricing pages for current numbers.

## Render (free web service)

| Limit | What you'll notice | What to do |
| --- | --- | --- |
| Sleeps after ~15 min idle | First visit shows "Waking the server" for 30-60 s | The app retries automatically. Add the UptimeRobot ping to `/health/db` (see RENDER_DEPLOY.md) |
| 750 instance-hours/month per account | Service suspended near month end | One service 24/7 fits. Don't keep other free services awake on the same account |
| Ephemeral disk | Files written to disk vanish on restart | Already handled: nothing is stored on disk. Screenshots go to Supabase Storage |
| Slower CPU/RAM (512 MB) | Slow builds | The app is light. If builds fail with out-of-memory, retry; Vite builds in ~2 s |

Upgrade path: Render "Starter" plan (no sleeping).

## Supabase (free project)

| Limit | What you'll notice | What to do |
| --- | --- | --- |
| **Pauses after 7 days of inactivity** | App loads, but every call fails / "Cannot reach the server" | Supabase dashboard → your project → **Restore**. Prevent it with the UptimeRobot ping to `/health/db` |
| 500 MB database | Inserts start failing | Years of journaling for one person. Check **Database → Usage** |
| 1 GB file storage | Screenshot uploads fail | Images are compressed to < 500 KB, so that's ~2,000+ screenshots. Delete old ones or upgrade |
| Monthly bandwidth (egress) | Slow or blocked responses near the cap | Screenshots load only when you open a trade. Avoid re-uploading huge images |
| Auth emails (built-in sender, few per hour) | "Email rate limit exceeded" on sign-up/reset | Wait an hour, or add your own SMTP under Auth → SMTP Settings. Or turn off email confirmation, since you're the only user |
| 2 free projects per account | Can't create a third | Use one project for this app |

Upgrade path: Supabase Pro (no pausing, bigger limits).

## AI Mentor (Phase 4, optional)

- Without an API key the app works fully; the Mentor simply shows as "not configured".
- With a key: a 20 calls/day/user limit and a max-tokens cap per call are enforced on the server and stored in the `ai_usage` table, so the limit survives restarts.

## Backups

The free tier has no automatic point-in-time backups you can restore yourself. Once a month:
- Use the app's **CSV export** (Phase 2), **or**
- Supabase → Database → **Backups** (if available on your plan), **or** run `pg_dump` with your connection string.
