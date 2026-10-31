// Extra Academy content: candle patterns, candle sequences, breakouts, pullbacks, and the
// full Zone 3 (Entry Canyon). Merged into LESSONS / FLASHCARDS / DRILLS by academy-content.mjs.

const q = (question, options, answer, why) => ({ q: question, options, answer, why });

export const EXTRA_LESSONS = [
  // ---------------------------------------------------------------- ZONE 1 additions
  {
    id: 'z1-patterns',
    zone: 1,
    order: 5,
    title: 'Candle Pattern Field Guide',
    content: `There are hundreds of named candle patterns. You need about seven. Learn what each one **means** (who won, who lost), not just what it looks like.

## Single-candle patterns

- **Doji**: open and close almost equal, wicks on both sides. Message: indecision. Buyers and sellers fought to a draw. A doji alone is a pause, not a signal.
- **Hammer / bullish pin bar**: small body near the top, long lower wick (at least 2x the body). Message: sellers pushed price down hard, buyers threw it all the way back. Meaningful **at support** in an uptrend.
- **Shooting star / bearish pin bar**: small body near the bottom, long upper wick. Message: buyers pushed up, sellers slammed it back down. Meaningful **at resistance** in a downtrend.
- **Marubozu (full-body candle)**: big body, tiny or no wicks. Message: one side controlled the whole period. Shows strong momentum, which is great to see in your direction and a warning against you.

## Two-candle patterns

- **Engulfing**: the second body completely covers the first body, in the opposite colour. Bullish engulfing at support = control shifted to buyers. Bearish engulfing at resistance = control shifted to sellers.
- **Inside bar**: the second candle's whole range sits inside the first candle's range. Message: the market is pausing and coiling. A break of the inside bar's high or low often starts the next move, but which way is not known in advance.

## Three-candle patterns

- **Morning star** (bullish): a strong bearish candle, then a small indecision candle, then a strong bullish candle that closes well into the first candle's body. At support it shows selling exhausted and buyers taking over.
- **Evening star** (bearish): the mirror image at resistance.

## The rule that matters more than any pattern

**Location beats shape.** A perfect hammer in the middle of nowhere means almost nothing. A plain-looking rejection at a daily support, in an uptrend, means a lot. Read patterns in this order:

1. Trend (HTF)
2. Level (support, resistance, trendline)
3. Pattern (the candle's story at that level)

If the first two don't line up, the third doesn't matter.

## Warrior's rule

**A pattern is a witness, not a judge.** It supports a trade idea you already have at a level. It never creates one on its own.`,
    quiz: [
      q('A hammer is most meaningful when it appears…', ['Anywhere on the chart', 'At support in an uptrend', 'In the middle of a range', 'Right after big news'], 1, 'Location beats shape: a hammer at support, with the trend, tells a real story.'),
      q('What does a doji tell you?', ['A guaranteed reversal', 'Indecision: neither side won', 'Strong buying', 'Strong selling'], 1, 'Open ≈ close means a draw. It is a pause, not a signal.'),
      q('A bullish engulfing candle means…', ['The new bullish body fully covers the prior bearish body', 'Any big green candle', 'A candle with no wicks', 'Two dojis in a row'], 0, 'The bullish body "engulfs" the previous bearish body: control shifted.'),
      q('An inside bar is…', ['A candle whose range sits inside the previous candle range', 'A candle that closes at its low', 'A gap', 'A trendline touch'], 0, 'Inside bars show a pause/coil. The breakout direction is not known in advance.'),
      q('In what order should you read the chart?', ['Pattern, then level, then trend', 'Trend, then level, then pattern', 'News, then pattern', 'Only the pattern'], 1, 'Trend first, level second, pattern last. Patterns are witnesses, not judges.'),
    ],
  },
  {
    id: 'z1-sequences',
    zone: 1,
    order: 6,
    title: 'Candle Sequences: Momentum vs Exhaustion',
    content: `One candle is a word. A **sequence** of candles is a sentence. Learning to read sequences tells you whether a move is strong, tired, or turning.

## Momentum

Signs a move is strong:

- Bodies getting **bigger** in the direction of the move
- Closes near the **extreme** of each candle (near the high in a rally)
- **Small wicks** against the move
- Pullbacks are **short and shallow** (one or two small candles)

Strong momentum into your level is a warning: price may blast straight through it. Wait and see a reaction before trading against momentum.

## Exhaustion

Signs a move is getting tired:

- Bodies getting **smaller** while price still edges forward
- **Wicks growing** against the move (long upper wicks in a rally)
- Closes drifting away from the extremes
- Several attempts at a level that keep failing

Exhaustion **at a level** is where reversals are born. Exhaustion in the middle of nowhere is just a pause.

## Pullback quality

In a trend, the pullback tells you a lot:

- **Healthy pullback**: smaller, overlapping candles, lower momentum than the trend move. Buyers are resting, not leaving.
- **Dangerous pullback**: big, fast candles against the trend that break the last higher low. Sellers have arrived; the trend is in question.

## Putting it together

Ask three questions about the last 5-10 candles:

1. Which side has the bigger bodies?
2. Where are the wicks pointing (where is price being rejected)?
3. Is the move speeding up or slowing down?

## Warrior's rule

**Don't fight momentum. Wait for exhaustion at your level, then let a reaction confirm it.**`,
    quiz: [
      q('Which sequence shows strong bullish momentum?', ['Shrinking bodies with long upper wicks', 'Growing green bodies closing near their highs', 'Alternating dojis', 'Long lower wicks only'], 1, 'Bigger bodies closing near the highs = buyers in control.'),
      q('In a rally, growing upper wicks and shrinking bodies suggest…', ['Momentum is increasing', 'The move may be getting exhausted', 'A guaranteed crash', 'Nothing'], 1, 'Rejection above and smaller bodies = buyers are tiring.'),
      q('A healthy pullback in an uptrend usually looks like…', ['Huge red candles breaking the last higher low', 'Small overlapping candles with less momentum than the rally', 'A gap down', 'A news spike'], 1, 'Gentle, overlapping pullbacks = buyers resting, not leaving.'),
      q('Strong momentum is heading straight into your resistance level. What should you do?', ['Short immediately', 'Wait to see a reaction before trading against it', 'Double your size', 'Remove your stop'], 1, "Don't fight momentum. Let the level prove itself first."),
      q('Where does exhaustion matter most?', ['In the middle of a range', 'At a level from your plan', 'On the 1-second chart', 'During news'], 1, 'Exhaustion at a level is where reversals start; elsewhere it is just a pause.'),
    ],
  },

  // ---------------------------------------------------------------- ZONE 2 additions
  {
    id: 'z2-breakouts',
    zone: 2,
    order: 5,
    title: 'Breakouts Deep Dive: Break, Retest, Go',
    content: `A breakout is price leaving a zone where it was trapped: a range, a resistance level, or a trendline. Breakouts can start big moves. They also trap more beginners than anything else.

## Three kinds of breakout

- **Range breakout**: price closes beyond the ceiling or floor of a sideways range.
- **Level breakout**: price closes beyond a horizontal support or resistance.
- **Trendline break**: price closes through a trendline. This often means "trend slowing," not instantly "trend reversed."

## What a real breakout looks like

1. **Build-up**: price presses the level several times; pullbacks get shallower (buyers pushing the floor up toward the ceiling).
2. **Break**: a candle **closes** clearly beyond the level, ideally with a solid body (not just a wick).
3. **Retest**: price comes back to the broken level. Old resistance now acts as support (role reversal).
4. **Go**: the retest holds (rejection wick, engulfing) and price continues.

## The beginner's breakout plan: wait for the retest

- Don't buy the first breakout candle; it's often late and far from a logical stop.
- Wait for the **retest** of the broken level.
- Enter when the retest shows a reaction **after the candle closes**.
- Stop goes back **inside** the old range (if price returns inside, the breakout failed).
- Target: the next level, or a **measured move** (the height of the range projected from the breakout point). Check that RR is at least 1:2.

You will miss breakouts that never retest. That's the price of avoiding most fakeouts, and it's a good trade-off.

## Fakeouts (failed breakouts)

A fakeout pokes beyond a level and snaps back inside. Common signs:

- Only a **wick** beyond the level, close back inside
- Breakout right before or during **high-impact news**
- A breakout **against** the higher-timeframe trend
- A big level breaking with a tiny, hesitant candle

A failed breakout is information too: trapped breakout traders often have to exit, pushing price back the other way.

## Breakout checklist

- Is the HTF trend in the breakout's direction?
- Did a candle **close** beyond the level?
- Did I wait for the **retest**?
- Is my stop back inside the old zone?
- Is RR at least 1:2?
- Any news in the next 30 minutes?

## Warrior's rule

**Break, retest, go. If any step is missing, so is your trade.**`,
    quiz: [
      q('What confirms a breakout better than a wick through the level?', ['A candle closing clearly beyond the level', 'A big wick', 'A news headline', 'A social media post'], 0, 'Closes matter. Wicks alone often become fakeouts.'),
      q('After a breakout above resistance, the retest usually happens at…', ['The broken resistance, now acting as support', 'The middle of the old range', 'A random round number', 'The daily open'], 0, 'Role reversal: old resistance becomes new support.'),
      q('Where does the stop go on a breakout-retest long?', ['Far above entry', 'Back inside the old range, below the retest', 'At entry', 'No stop needed'], 1, 'If price returns inside the range, the breakout failed. That is where you are wrong.'),
      q('Which is a common fakeout warning sign?', ['A strong close with the HTF trend', 'Only a wick beyond the level, close back inside', 'A clean retest that holds', 'Low spreads'], 1, 'A wick poke with a close back inside is a classic fakeout.'),
      q('A breakout never retests and runs without you. What did you lose?', ['Your account', 'Nothing. Missing a move is free; chasing it is not', 'Your streak', 'XP'], 1, 'Missed moves cost nothing. Chased fakeouts cost HP.'),
    ],
  },
  {
    id: 'z2-pullbacks',
    zone: 2,
    order: 6,
    title: 'Pullbacks: Joining a Trend the Right Way',
    content: `Trends don't move in straight lines. After each push comes a **pullback**. For a beginner, pullbacks are the safest way to join a trend: you get a better price and a clear place for your stop.

## Where pullbacks tend to stop

- At a **previous resistance that broke** (now support), in an uptrend
- At a **rising trendline**
- At the **previous swing high** that price broke through
- At a **confluence** of two of the above, which is the strongest

## The pullback entry plan (uptrend example)

1. HTF trend is up: higher highs and higher lows.
2. Price pulls back **into** a level you marked in your prep.
3. The pullback slows down (smaller candles, lower wicks appearing).
4. A reaction candle **closes** at the level (hammer, bullish engulfing).
5. Enter; stop **below the level / the pullback's low**; target the recent high or the next resistance (RR ≥ 1:2).

For a downtrend, flip everything: pullback **up** into resistance, short on a bearish reaction.

## When a pullback is NOT a pullback

- It **breaks the last higher low** with strong candles, so the uptrend is in question.
- It slices through your level with momentum and no reaction.
- The HTF picture has changed (new lower high, lower low).

In those cases, stand aside. Log a **Disciplined Retreat** if you were watching a setup.

## Common beginner mistakes

- Buying the pullback **before** it reaches the level (impatience)
- Buying with **no reaction candle** (hope)
- Putting the stop **too tight** inside the noise, so normal wicks stop you out
- Chasing the push instead of waiting for the pullback (FOMO Wraith)

## Warrior's rule

**Trend gives the direction. The pullback gives the price. The level gives the stop.**`,
    quiz: [
      q('Why are pullbacks good entries for beginners?', ['They guarantee profit', 'Better price and a clear place for the stop', 'They happen only once a year', 'Brokers prefer them'], 1, 'You join the trend at a level, with a logical stop nearby.'),
      q('In an uptrend, a strong drop that breaks the last higher low means…', ['A perfect pullback buy', 'The uptrend is in question; stand aside', 'Double your size', 'Move your stop'], 1, 'Breaking the last higher low breaks the HH/HL structure.'),
      q('What should you wait for at the pullback level?', ['Nothing, buy instantly', 'A reaction candle that closes (e.g. hammer, engulfing)', 'A news release', 'Three red candles'], 1, 'Wait for a closed reaction candle at the level.'),
      q('Where does the stop go on a pullback long?', ['Above the recent high', 'Below the level / pullback low', 'At entry', 'Anywhere'], 1, 'Below the level is where the idea is wrong.'),
      q('Chasing the push instead of waiting for the pullback is the work of…', ['The FOMO Wraith', 'The Hope Ghost', 'The Boredom Bat', 'The News Banshee'], 0, 'Chasing moves you missed is FOMO.'),
    ],
  },

  // ---------------------------------------------------------------- ZONE 3: Entry Canyon (full)
  {
    id: 'z3-entry-checklist',
    zone: 3,
    order: 1,
    title: 'The 3-Check Entry',
    content: `Welcome to Entry Canyon. Everything you've learned comes together here into one repeatable entry routine. Three checks, every time, in order.

## Check 1: Trend (the map)

On your higher timeframe: up, down, or range? Write it down **before** looking for entries. In the Battle Station, this is the **HTF trend** choice.

- Uptrend → look for longs only
- Downtrend → look for shorts only
- Range → longs near the floor, shorts near the ceiling, nothing in the middle

## Check 2: Level (the place)

Is price **at** a level from your prep: support, resistance, a trendline, or a broken level being retested? Not "near-ish." At it.

If price isn't at your level, there is no trade. Set an alert and walk away.

## Check 3: Reaction (the trigger)

Did a candle **close** showing the level is holding in your direction? A rejection wick, an engulfing candle, a morning/evening star. This is your **confirmation**.

## Then the math

Only after all three checks:

- Stop beyond the level (where the idea is wrong)
- Target at the next level, RR at least 1:2
- Size with the Risk Forge
- Emotion check: calm enough to follow the plan?

That's exactly what the Battle Station's armor check enforces.

## Why three checks?

Each check removes a common way to lose:

- Trend check removes **Trend Defier** trades
- Level check removes **FOMO** and **Boredom** trades
- Reaction check removes **Hope** trades (buying before anything happened)

## Warrior's rule

**Trend, level, reaction, then math. Skip a check and you've skipped the trade.**`,
    quiz: [
      q('What are the three checks, in order?', ['Reaction, level, trend', 'Trend, level, reaction', 'News, trend, size', 'Level, size, emotion'], 1, 'Trend first, level second, reaction third, then the math.'),
      q('Price is 30 pips away from your support level. What do you do?', ['Buy now before it moves', 'No trade yet: set an alert and wait', 'Move the level to current price', 'Sell'], 1, 'No level, no trade. Let price come to you.'),
      q('What counts as a reaction?', ['A candle that closes showing the level holding (e.g. rejection wick)', 'A feeling', 'A tweet', 'Any moving price'], 0, 'A closed candle at the level that shows rejection or a shift in control.'),
      q('In a range, where do you trade?', ['Only the middle', 'Longs near the floor, shorts near the ceiling', 'Anywhere', 'Only breakouts'], 1, 'Edges, not middles.'),
      q('Skipping the level check most often lets which monsters in?', ['FOMO Wraith and Boredom Bat', 'News Banshee only', 'None', 'Stop-Loss Thief only'], 0, 'Trading away from your levels is usually FOMO or boredom.'),
    ],
  },
  {
    id: 'z3-confirmation',
    zone: 3,
    order: 2,
    title: 'Confirmation Without Paralysis',
    content: `Waiting for confirmation protects you. Waiting forever makes you miss everything and then chase. Here's how to confirm **just enough**.

## Good confirmation at a level

- A **rejection wick** into the level and a close back away from it
- An **engulfing** candle in your direction
- A **morning star / evening star** at the level
- On a breakout: the **retest holding** with a rejection

One clear signal **at the level** is enough. You don't need five.

## Which timeframe confirms?

Use your **entry timeframe** (e.g. 15-minute or 1-hour). Don't drop to the 1-minute to "be sure"; that's the Confirmation Fog.

## How long to wait

Give the setup a time limit:

- If price reaches your level and no reaction appears within a few candles, **skip it**.
- If price closes **through** your level with momentum, the level failed. **Skip it**, and log a Disciplined Retreat.

## The "late entry" problem

Sometimes the confirmation candle is huge, and by its close price is far from the level. Your stop (beyond the level) is now far away, and RR shrinks.

- If RR is still at least 1:2: you may take it.
- If not: skip, or wait for a small pullback toward the level. Never move your stop closer than the level just to make the RR look better.

## Confirmation is not certainty

Even perfect confirmation fails often. Confirmation improves the odds. That's all. Your stop and your small size handle the rest.

## Warrior's rule

**One clear reaction at your level, on your timeframe, then decide. No reaction, no trade.**`,
    quiz: [
      q('How many confirmation signals do you need at a level?', ['At least five', 'One clear signal is enough', 'None', 'Only news'], 1, 'One clear reaction at the level is enough. More is often paralysis.'),
      q('Switching to the 1-minute chart to "be sure" is…', ['Smart', 'The Confirmation Fog', 'Required', 'Risk management'], 1, 'Stick to your entry timeframe.'),
      q('Price closes through your level with strong momentum. What now?', ['Buy anyway', 'The level failed: skip and log a retreat', 'Move the level', 'Double down'], 1, 'A strong close through the level means it failed.'),
      q('The confirmation candle was huge and RR is now 1:1.2. What do you do?', ['Tighten the stop inside the level', 'Skip or wait for a pullback toward the level', 'Take it with double size', 'Remove the target'], 1, 'Never cheat the stop to fix RR. Skip or wait.'),
      q('Does perfect confirmation guarantee a win?', ['Yes', 'No: it improves odds; stop and size handle the rest', 'Only on Fridays', 'Only on gold'], 1, 'Confirmation is not certainty.'),
    ],
  },
  {
    id: 'z3-stops',
    zone: 3,
    order: 3,
    title: 'Where the Stop Really Goes',
    content: `The stop loss is your armor. Most beginners place it where the loss **feels small**. Warriors place it where the trade idea is **wrong**.

## The rule

Your stop goes at the price that proves your idea wrong:

- **Long at support** → below the support zone (and below the reaction candle's low)
- **Short at resistance** → above the resistance zone (and above the reaction candle's high)
- **Breakout-retest long** → back inside the old range
- **Pullback long** → below the pullback low / the level

## Add a buffer

Levels are zones, and price likes to poke a little beyond them. Add a small buffer beyond the zone, plus the **spread**, so a normal wick doesn't stop you out.

## Then size the trade to the stop

Never move the stop to fit the size you want. Do it the other way round:

1. Place the stop where the idea is wrong.
2. Measure the distance.
3. Let the **Risk Forge** calculate the lot size for your risk %.

Wide stop → smaller lots. Tight stop → bigger lots. The dollar risk stays the same.

## The forbidden moves

- **Moving the stop further away** once in a trade: Stop-Loss Thief. Costs -40 XP in Market Quest for a reason.
- **No stop at all**: one bad candle can break your daily limit.
- **Stop too tight** inside the noise: death by a thousand wicks.

## Allowed moves

- Moving the stop **toward profit** (to break-even after +1R, or trailing behind new swing lows) is fine, **if it's in your plan before entry**.

## Warrior's rule

**Stop where you're wrong. Size from the stop. Never move it away.**`,
    quiz: [
      q('Where does the stop go on a long at support?', ['Just above entry', 'Below the support zone (with a small buffer)', 'Above resistance', 'Wherever the loss feels small'], 1, 'Below the level is where the idea is proven wrong.'),
      q('Your stop is wide. What should change?', ['Move the stop closer', 'Use a smaller lot size so dollar risk stays the same', 'Use a bigger lot size', 'Skip the stop'], 1, 'Size from the stop, never the other way round.'),
      q('Why add a buffer beyond the level?', ['To increase risk', 'Levels are zones; normal pokes and spread can hit a stop placed exactly on the line', 'Brokers require it', 'It improves RR'], 1, 'A small buffer avoids getting wicked out by normal noise.'),
      q('Which stop move is allowed (if planned)?', ['Moving it further away', 'Moving it toward profit (e.g. break-even after +1R)', 'Removing it', 'Doubling it'], 1, 'Only toward profit, and only if it was in the plan.'),
      q('Moving your stop further away during a trade summons…', ['The Stop-Loss Thief', 'The Boredom Bat', 'The Overtrade Hydra', 'Nothing'], 0, 'That is exactly the Stop-Loss Thief.'),
    ],
  },
];

export const EXTRA_FLASHCARDS = [
  ['Doji?', 'Open ≈ close: indecision. A pause, not a signal.', 1],
  ['Hammer / bullish pin bar?', 'Small body near the top, long lower wick: buyers rejected lower prices. Best at support in an uptrend.', 1],
  ['Shooting star?', 'Small body near the bottom, long upper wick: sellers rejected higher prices. Best at resistance.', 1],
  ['Inside bar?', "A candle whose whole range sits inside the previous candle's range: the market is coiling.", 1],
  ['Morning star?', 'Big bearish candle, small indecision candle, big bullish candle: selling exhausted, buyers taking over.', 1],
  ['Location vs shape?', 'Location beats shape. A pattern only matters at a level, with the trend.', 1],
  ['Signs of momentum?', 'Growing bodies in one direction, closes near the extremes, small wicks against the move.', 1],
  ['Signs of exhaustion?', 'Shrinking bodies, growing wicks against the move, failed attempts at a level.', 1],
  ['Breakout steps?', 'Build-up, break (close beyond), retest, go.', 2],
  ['Measured move?', 'Project the height of the range from the breakout point to estimate a target.', 2],
  ['Breakout stop?', 'Back inside the old range: if price returns inside, the breakout failed.', 2],
  ['Healthy pullback?', 'Smaller, overlapping candles that hold above the last higher low.', 2],
  ['The 3-check entry?', 'Trend, level, reaction. Then the math (stop, RR, size).', 3],
  ['Late entry fix?', 'If RR falls below 1:2 after a huge confirmation candle, skip or wait for a pullback. Never cheat the stop.', 3],
  ['Size from the stop?', 'Place the stop where you are wrong, then let the Risk Forge pick the lot size.', 3],
];

export const EXTRA_DRILLS = [
  {
    id: 'drill-breakout-1', zone: 2, title: 'Spot the Breakout', kind: 'breakout',
    payload: {
      seed: 97, shape: 'breakout',
      lines: [{ label: 'R', at: 'range_high' }, { label: 'S', at: 'range_low' }],
      questions: [
        q('What happened on this chart?', ['Price stayed in the range', 'Price broke above the range ceiling (R)', 'Price broke below the floor (S)'], 1, 'Price left the range through the ceiling at line R.'),
        q('After the break, line R is likely to act as…', ['New support (role reversal)', 'Nothing', 'A trendline'], 0, 'Broken resistance often becomes support on the retest.'),
        q('The beginner-safe entry is…', ['Buying the first big breakout candle', 'Waiting for a retest of R that holds', 'Shorting the breakout'], 1, 'Break, retest, go.'),
        q('Where does the stop go for a retest long?', ['Back inside the range, below R', 'Above the latest high', 'No stop'], 0, 'If price returns inside the range, the breakout failed.'),
      ],
    },
  },
  {
    id: 'drill-candles-1', zone: 1, title: 'Candle Patterns Quiz', kind: 'patterns',
    payload: {
      seed: 103, shape: 'up',
      questions: [
        q('Small body near the top, long lower wick, at support. Name it.', ['Shooting star', 'Hammer / bullish pin bar', 'Doji'], 1, 'Long lower wick + body on top = hammer.'),
        q('Open and close almost equal, wicks both sides.', ['Doji', 'Marubozu', 'Engulfing'], 0, 'A doji: indecision.'),
        q('Big bullish body fully covering the previous bearish body.', ['Inside bar', 'Bullish engulfing', 'Evening star'], 1, 'That is a bullish engulfing.'),
        q('Which matters most?', ['The pattern name', 'Where the pattern appears (level + trend)', 'The candle colour'], 1, 'Location beats shape.'),
      ],
    },
  },
];
