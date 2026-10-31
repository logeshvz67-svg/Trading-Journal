# Phase 1 test checklist

Run automated checks first:

```bash
npm test          # risk math, armor check, XP rules, timezone edges
npm run typecheck
npm run build
```

Then walk through the app (locally with `npm run dev`, or on Render).

## Auth & onboarding
- [ ] Sign up with email and password. If confirmation is on, the email arrives and the link brings you back to the app.
- [ ] Onboarding has 6 steps: welcome, character (name, avatar, goal), self-check (5 questions → personality), firm rules, Oath (7 editable rules plus the sign checkbox), first quest.
- [ ] "Continue" stays disabled until each step is valid (name entered, all questions answered, Oath signed).
- [ ] After "Accept quest" you land on the Command Center, with the **HP and Shield bars at the top**.
- [ ] Sign out and back in: you go straight to the Command Center, without onboarding again.
- [ ] Security check: in Supabase **Table Editor → profiles**, your row exists. Try `update profiles set xp = 9999` as an `authenticated` user in the SQL editor's role switcher: it is denied.

## Pre-Battle Prep
- [ ] Pick a mood; the Focus meter preview updates. Angry + bad sleep + distracted gives a low score and a Campfire suggestion.
- [ ] Save: +10 XP toast. Save again: "Prep updated" with no extra XP (XP is once per day).
- [ ] Try max trades above your account rule: rejected with a clear message.

## Risk Forge
- [ ] EURUSD, $5,000, 1%, entry 1.1000, SL 1.0980 gives **0.25 lots**, 20 pips, $50 risk.
- [ ] XAUUSD, entry 2400, SL 2395 at 1% gives **0.10 lots**.
- [ ] The RR bar shows 2.0R vs 1R for TP 1.1040. "If you lose" shows the share of today's HP.

## Battle Station (armor check)
- [ ] With an empty form the button reads "Armor incomplete" and is disabled.
- [ ] Each failing item explains itself. Try TP 1.1030 (RR 1.5): "This battle isn't worth the risk."
- [ ] Lot size 1.00 on that setup: the risk item fails ("Shrink the position").
- [ ] Emotion "Angry": fails. "Overconfident": passes with a warning.
- [ ] A valid setup shows **Battle Approved**. Submit: +15 XP and you land on the trade page.
- [ ] Open the same tab twice and submit when the trade limit is reached: the server rejects it (the server is the authority).

## Closing & Battle Log
- [ ] Close the open trade with a **loss** and "Yes, by the book" within 10 min. Message: "You lost the battle but kept your honor. +30 XP for discipline." XP lines: timely +20, plan +30.
- [ ] Take another trade, close it as a **win** but tag "FOMO Wraith". Message mentions the monster, and the trade's total XP is **-10**.
- [ ] Toggle "I moved my stop": -40 XP and the Stop-Loss Thief is auto-tagged.
- [ ] Upload a large screenshot (e.g. a 4 MB PNG). It uploads as a JPEG under 500 KB; check the size in Supabase Storage. Reload the page and the image still shows.
- [ ] On a closed trade, "Confess" a late mistake: +15 honesty, and the trade now counts as plan broken.
- [ ] Delete a trade: it disappears, but the XP history stays.

## Logged after the fact / Skipped
- [ ] "Already taken": logs a trade with -30 XP (no armor check) and the warning banner.
- [ ] Log a trade opened within 15 min of a losing close: -50 and the **Revenge Goblin** is auto-tagged.
- [ ] "Skip setup": +10 XP Disciplined Retreat. The 4th retreat in one day gives 0 XP (capped).

## Boss Arena & lockout
- [ ] Losses totaling ≥ 70% of the daily limit show the yellow "Your HP is low" banner everywhere.
- [ ] Losses ≥ 90% show the red lock bar with a countdown to local midnight, the Battle Station shows the lock, and the armor check fails "Arena open".
- [ ] **Refresh the page / restart the server**: the lock is still there (it's a row in `cooldowns`).
- [ ] "Already taken" logging still works while locked (the journal must see every trade).
- [ ] Rule checklist: min trading days count, consistency rule, news rule.

## Settings
- [ ] Change timezone; "today" and the lockout reset follow it.
- [ ] Theme dark/light/system and the sound toggle persist after reload.
- [ ] Edit firm rules and the Oath.

## Cold start
- [ ] On Render, wait more than 15 min, then open the app: "Waking the server" appears, then the app loads without errors.
