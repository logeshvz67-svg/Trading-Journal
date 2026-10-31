# Phases 2-4 test checklist

Run first: run `supabase/migrations/0004_rewards_codex_ai.sql`, `supabase/seed.sql` and `supabase/seed_academy.sql` in the Supabase SQL editor, then:

```bash
npm test && npm run typecheck && npm run build
```

## Phase 2
- [ ] **Loss cooldown:** close a losing trade. A 30-minute lock appears in the top bar with a countdown. Refresh the page or redeploy, and it's still there. The Battle Station's "Arena open" check fails.
- [ ] **Loss streak:** two losing trades in a row today lock the arena until midnight, with the loss-streak message.
- [ ] **Campfire:** the breathing circle animates. Save a reflection (+10 XP once per day). "Stop for today" gives +25 XP, locks until midnight, and unlocks the **Know When to Stop** achievement.
- [ ] **Quests:** completing prep ticks "Morning Watch" and the story quest "The First Watch", and a toast announces it. Weekly and challenge quests show progress bars.
- [ ] **Streaks:** journal, plan and learning streak tiles on the dashboard. Miss a day after a streak of 2+ and you get a gentle "streak faded" toast.
- [ ] **Achievements:** First Blood after your first closed trade, Disciplined Retreat after a skipped trade, Boss Challenger after onboarding.
- [ ] **Monster Den:** tag the same monster 3 times and it becomes **active**, with its fix written into the Codex automatically. Then 5 plan-followed trades with no tags defeat it: +50 XP and a trophy.
- [ ] **Rewards:** buy a title or avatar with gold, then equip it; it shows on the dashboard. Add a real-life reward and redeem it once you have the gold. Buying with too little gold is refused.
- [ ] **Hall of Records:** stat tiles, equity curve (with a table view), cumulative R, weekly mistake bars, breakdowns by setup, pair, hour, weekday and emotion, and a weekly/monthly report compared with the previous period.
- [ ] **Settings:** CSV export downloads open in Excel or Sheets. Delete-my-data needs you to type DELETE, removes everything including screenshots, and signs you out.

## Phase 3
- [ ] **Academy map:** Lesson 1 is open; the rest are locked 🔒 until the previous quiz is passed with 80%+. Zones 3-7 show 🛠️ "soon".
- [ ] **Quiz:** the answers aren't in the network response (check DevTools). Grading shows ✓/✗ with explanations. Passing gives +25 XP once.
- [ ] **Lesson notes** save and reload.
- [ ] **Flashcards:** flip a card. "I knew it" schedules it for 1, then 3, 7 and 14 days; "Still learning" resets it to 1 day. You can add your own cards.
- [ ] **Chart drills:** the candle chart renders with the A/B/C lines. Scoring 80%+ gives +20 XP once per drill per day.
- [ ] **Glossary** search works.
- [ ] **Codex:** shows your Oath, auto-earned rules, your own rules, and the playbook saves.

## Phase 4
- [ ] **No AI key:** the Mentor page says it's resting, and everything else works.
- [ ] **With a key:**
  - [ ] Ask "What is support?" and get a short beginner answer.
  - [ ] Ask "Should I buy EURUSD now?" and it politely refuses to give a signal, then teaches you how to check your own rules.
- [ ] **Chart review:** upload a chart and get a description of the structure, with no prediction.
- [ ] **Explain a mistake:** from a closed trade, tap "Ask the Mentor why". The Mentor asks questions first.
- [ ] **Briefing and debrief** use your own data. The **pattern spotter** says it needs 20+ trades until you have them.
- [ ] **Rate limit:** set `AI_DAILY_LIMIT=2` and the 3rd question shows the "resting by the fire" message. The count survives a redeploy.
- [ ] **PWA:**
  - [ ] Chrome or Android: Settings → "Install Market Quest". On iPhone: Share → Add to Home Screen.
  - [ ] The installed app opens full-screen. Offline, the shell loads; API data needs the connection.
- [ ] **Notifications:** turn on browser notifications to get a test notification. Set the prep reminder time to a minute ago and reload: the notification appears once. A cooldown ending while the app is open sends "Cooldown over".
