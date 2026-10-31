import { EXTRA_LESSONS, EXTRA_FLASHCARDS, EXTRA_DRILLS } from './academy-extra.mjs';
// Training Academy content. Run `npm run seed:academy` to regenerate supabase/seed_academy.sql.
// Lesson text uses a tiny markdown subset: "## heading", "- bullet", "**bold**", blank-line paragraphs.

export const ZONES = [
  { zone: 1, name: 'Candle Village', icon: '🕯️' },
  { zone: 2, name: 'Structure Forest', icon: '🌲' },
  { zone: 3, name: 'Entry Canyon', icon: '🏜️' },
  { zone: 4, name: 'Risk Fortress', icon: '🏯' },
  { zone: 5, name: 'Mind Temple', icon: '🛕' },
  { zone: 6, name: 'Boss Castle', icon: '🏰' },
  { zone: 7, name: "Master's Tower", icon: '🗼' },
];

const q = (question, options, answer, why) => ({ q: question, options, answer, why });

export const LESSONS = [
  // ---------------------------------------------------------------- ZONE 1: Candle Village
  {
    id: 'z1-candles',
    zone: 1,
    order: 1,
    title: 'Reading a Candle',
    content: `Welcome to Candle Village. Every chart you will ever trade is made of candles, so this is where every warrior starts.

## One candle = one story

A candle shows what price did during one period of time (one minute, one hour, one day). It records four prices:

- **Open**: the price when the period started
- **High**: the highest price reached
- **Low**: the lowest price reached
- **Close**: the price when the period ended

## The body and the wicks

The thick part is the **body**. It spans from the open to the close. The thin lines above and below are the **wicks** (also called shadows). They show how far price travelled before being pushed back.

- If the close is **above** the open, the candle is **bullish** (usually green or white). Buyers won that period.
- If the close is **below** the open, the candle is **bearish** (usually red or black). Sellers won that period.

## Why this matters to you

You don't need to memorise fancy candle names. You need to answer one question: **who is in control right now, and where did they get pushed back?** The body tells you who won. The wicks tell you where the fight happened.

A long body with small wicks = one side was firmly in control. A small body with long wicks = a battle with no clear winner. That's indecision, and indecision is not a reason to trade.

## Warrior's rule

A single candle is a sentence, not a book. Never take a trade because of one candle alone. In the next lessons you'll learn where candles matter: **at your levels**.`,
    quiz: [
      q('Which four prices does a candle record?', ['Open, high, low, close', 'Bid, ask, spread, volume', 'Entry, stop, target, lot size', 'Monday to Thursday prices'], 0, 'Every candle stores the open, high, low and close for its time period.'),
      q('A candle opens at 1.1000 and closes at 1.1030. What kind of candle is it?', ['Bearish', 'Bullish', 'Neutral by definition', 'Impossible to tell'], 1, 'Close above open = bullish. Buyers won that period.'),
      q('What does a long upper wick show?', ['Price never went higher', 'Price went up but was pushed back down', 'The market was closed', 'Volume was low'], 1, 'The wick marks where price travelled before sellers pushed it back.'),
      q('A small body with long wicks on both sides usually means:', ['Strong uptrend', 'Strong downtrend', 'Indecision: neither side won clearly', 'A guaranteed reversal'], 2, 'Small body + long wicks = a battle with no clear winner. Nothing is guaranteed in trading.'),
      q('Should you take a trade because of one strong candle alone?', ['Yes, strong candles are signals', 'Only on Fridays', 'No: a single candle needs context like a level and the trend', 'Yes, if it is green'], 2, 'One candle is a sentence, not a book. Context (trend + level) comes first.'),
    ],
  },
  {
    id: 'z1-wicks',
    zone: 1,
    order: 2,
    title: 'Bullish, Bearish and the Story of Wicks',
    content: `You know bullish (close > open) and bearish (close < open). Now let's read candles the way a scout reads footprints.

## Rejection wicks

When price pushes into an area and gets slammed back, it leaves a long wick. At a **support** level, a long **lower** wick says: "sellers tried to break this floor, and buyers threw them back." At **resistance**, a long **upper** wick says the opposite.

A rejection wick **at a level you marked before the session** is meaningful. The same wick in the middle of nowhere means very little.

## Momentum candles

A large body with tiny wicks shows conviction. Several big bullish bodies in a row = buyers are pushing hard. Here is the trap: by the time you notice three huge green candles, the move is often stretched. Chasing it is how the **FOMO Wraith** feeds.

## Engulfing (just one pattern worth knowing)

A bullish engulfing happens when a bullish candle's body completely covers the previous bearish candle's body. It shows a shift in control. At support, in an uptrend, it can be confirmation. On its own, it's just a candle.

## Colours lie, closes don't

Intra-candle moves are noise. A candle that spikes through a level but **closes** back inside has told you the level held. Wait for the close before you decide what a candle "said."

## Warrior's rule

Read candles **only at your levels**, and always **after they close**.`,
    quiz: [
      q('At support, a long lower wick suggests:', ['Sellers are in total control', 'Buyers pushed price back up from the floor', 'The broker had an error', 'You must buy immediately'], 1, 'A lower wick at support shows buyers rejected lower prices. It is information, not an order.'),
      q('Three huge green candles in a row just appeared. What is the main risk of buying now?', ['None, momentum always continues', 'Chasing a stretched move (FOMO Wraith)', 'Spreads disappear', 'The candles will turn red'], 1, 'Late entries after big moves put your stop far away and your entry at a bad price.'),
      q('What is a bullish engulfing?', ["A bullish body that fully covers the previous bearish body", 'Any green candle', 'A candle with no wicks', 'Two red candles'], 0, 'The bullish body "engulfs" the prior bearish body, showing a shift in control.'),
      q('Price spikes below support but the candle closes back above it. What happened?', ['Support broke', 'Support held on a closing basis', 'The trend changed to down', 'Nothing can be learned'], 1, 'Closes matter more than spikes. Closing back above means the level held.'),
      q('Where do candle signals matter most?', ['Anywhere on the chart', 'At levels you marked before the session', 'Only on the 1-minute chart', 'Only when news is out'], 1, 'Candles are confirmation at your levels, not standalone signals.'),
    ],
  },
  {
    id: 'z1-timeframes',
    zone: 1,
    order: 3,
    title: 'Timeframes: Zoom Out Before You Zoom In',
    content: `The same pair can look like an uptrend on the 15-minute chart and a downtrend on the daily chart. Both are true. That's why warriors use **two timeframes with two jobs**.

## The higher timeframe (HTF): the map

Pick one higher timeframe, for example the **4-hour** or **daily**. Its job is to answer:

- Is price trending up, trending down, or ranging?
- Where are the big support and resistance levels?

This is the "HTF trend" you select in the Battle Station. You decide it **before** you look for entries.

## The lower timeframe (LTF): the door

Your entry timeframe (for example **15-minute** or **1-hour**) has one job: show you a clean entry **at a level from your HTF map**, with a sensible place for your stop.

## Why beginners lose here

Beginners zoom in until they find something that agrees with them. That's the **Confirmation Fog**. If the daily is a strong downtrend, a little rally on the 5-minute chart is usually just a pullback, not a new uptrend.

## A simple routine

1. Daily or 4-hour: mark the trend and 2-3 key levels.
2. Write them in your Pre-Battle Prep.
3. Drop to your entry timeframe **only** when price reaches one of those levels.
4. Trade in the HTF direction (or at the clear edges of an HTF range).

## Warrior's rule

**Map first, door second.** Never let the small chart overrule the big one.`,
    quiz: [
      q('What is the main job of the higher timeframe?', ['Finding the exact entry tick', 'Showing the trend and key levels', 'Calculating lot size', 'Predicting tomorrow'], 1, 'The HTF is your map: trend direction and the big levels.'),
      q('The daily chart is in a strong downtrend. The 5-minute chart shows a small rally. This rally is most likely:', ['A guaranteed new uptrend', 'A pullback inside the bigger downtrend', 'A broker glitch', 'A reason to buy with big size'], 1, 'Small rallies inside a big downtrend are usually pullbacks. Respect the map.'),
      q('Zooming through timeframes until one agrees with you is called:', ['Confluence', 'Confirmation Fog', 'Risk management', 'Position sizing'], 1, 'Searching for agreement and ignoring disagreement is the Confirmation Fog.'),
      q('When should you look at your entry timeframe?', ['All day long', 'When price reaches a level from your HTF map', 'Only after a loss', 'Never'], 1, 'Wait for price to come to your level. Watching every tick invites overtrading.'),
      q('Which is a sensible beginner timeframe pair?', ['Daily map + 15-minute or 1-hour entries', '1-second + 5-second', 'Monthly + weekly entries only', 'Whatever looks best each day'], 0, 'One clear map timeframe plus one entry timeframe keeps your process consistent.'),
    ],
  },
  {
    id: 'z1-what-moves-price',
    zone: 1,
    order: 4,
    title: "What Moves Price (and Why You Don't Need to Predict It)",
    content: `Price moves because orders hit the market: banks, funds, businesses, and traders like you buying and selling. You will never know all of them. Good news: **you don't need to.**

## You are not a fortune teller

Your job is not to predict. Your job is to:

- find places where the odds are a bit in your favour (levels, trend),
- risk a small, fixed amount,
- and let a large number of trades play out.

A single trade is close to a coin flip. Your edge only shows over **many** trades taken the **same** way. That's why discipline beats cleverness.

## Sessions

Forex trades 24 hours on weekdays, but activity changes:

- **Asian session**: often quieter, tighter ranges.
- **London session**: volume picks up; breakouts of the Asian range are common.
- **New York session**: busy, especially in the London–New York overlap.

Pick **one** session that fits your life and trade it consistently.

## News

High-impact news (interest rate decisions, CPI inflation, NFP jobs data) can move price violently in seconds. Spreads widen, stops can slip. Many prop firms restrict trading around news. That's the **News Banshee**. Check the economic calendar in your Pre-Battle Prep every day.

## Spreads and costs

Each trade costs a little (spread and commission). Tiny targets mean the costs eat a big share of your profit, which is another reason to look for **1:2 or better**.

## Warrior's rule

You don't control price. You control **where you trade, how much you risk, and whether you follow your plan.**`,
    quiz: [
      q('Your main job as a trader is to:', ['Predict every move', 'Follow a repeatable plan with fixed small risk', 'Trade every session', 'Win every trade'], 1, 'Edge comes from repeating a good process many times, not from prediction.'),
      q('Why does discipline matter more than any single trade?', ['Single trades are guaranteed', 'An edge only shows over many trades taken the same way', 'Brokers reward discipline', 'It does not matter'], 1, 'One trade is close to random. A consistent process over many trades is what counts.'),
      q('What often happens around high-impact news?', ['Spreads tighten and price stops moving', 'Spreads widen and price can jump, slipping stops', 'Markets close', 'Nothing changes'], 1, 'News can cause spikes, wider spreads and slippage, and many firms have news rules.'),
      q('Why are tiny profit targets a problem?', ['They are illegal', 'Costs like spread eat a large share of the reward', 'They always hit', 'Prop firms ban them'], 1, 'Small targets make costs relatively large, one reason to look for 1:2 or better.'),
      q('Which session approach suits a beginner best?', ['Trade all sessions to find more setups', 'Pick one session that fits your life and stick to it', 'Only trade during news', 'Switch sessions daily'], 1, 'Consistency of session makes your results comparable and your routine stable.'),
    ],
  },
  // ---------------------------------------------------------------- ZONE 2: Structure Forest
  {
    id: 'z2-trends',
    zone: 2,
    order: 1,
    title: 'Trends: Higher Highs and Higher Lows',
    content: `Welcome to Structure Forest. Here you learn to see the paths through the trees: **market structure**.

## Swings

Price never moves in a straight line. It moves in waves: a push, a pullback, a push. The turning points are **swing highs** (peaks) and **swing lows** (troughs).

## Uptrend

An uptrend is a series of **higher highs (HH)** and **higher lows (HL)**. Each push goes further than the last, and each pullback stops above the previous low.

## Downtrend

A downtrend is a series of **lower highs (LH)** and **lower lows (LL)**.

## Range

If highs and lows stay roughly level, price is **ranging**: neither side is winning.

## When is a trend broken?

In an uptrend, the key level is the **most recent higher low**. If price closes clearly below it, the uptrend is in question. Until then, pullbacks are normal; they are the trend breathing, not dying.

## How to use this in the Battle Station

- HTF making HH + HL → choose **Up**, and look mainly for **longs** at support.
- HTF making LH + LL → choose **Down**, and look mainly for **shorts** at resistance.
- No clear sequence → choose **Range**, and only trade the clear edges.

Trading against the HTF trend is the **Trend Defier's** favourite trap. The Battle Station will warn you when you try it.

## Warrior's rule

**Name the trend before you name the trade.**`,
    quiz: [
      q('An uptrend is defined by:', ['Lower highs and lower lows', 'Higher highs and higher lows', 'Only green candles', 'A moving average'], 1, 'HH + HL = uptrend.'),
      q('Price in an uptrend pulls back but stays above the last higher low. This is:', ['The end of the trend', 'A normal pullback', 'A guaranteed crash', 'A downtrend'], 1, 'Pullbacks that hold above the last higher low are the trend breathing.'),
      q('What would first put an uptrend in question?', ['Any red candle', 'A clear close below the most recent higher low', 'A long upper wick', 'Low volume'], 1, 'Losing the last higher low breaks the HH/HL sequence.'),
      q('Highs and lows staying roughly level means price is:', ['Trending up', 'Trending down', 'Ranging', 'Closed'], 2, 'Flat highs and lows = range.'),
      q('Your HTF shows LH + LL. Which trades should you mainly look for?', ['Longs at support', 'Shorts at resistance', 'Any trade at all', 'None ever'], 1, 'Trade with the HTF trend: in a downtrend, look for shorts at resistance.'),
    ],
  },
  {
    id: 'z2-sr',
    zone: 2,
    order: 2,
    title: "Support and Resistance: The Market's Memory",
    content: `Support and resistance are the **market's memory**: places where big decisions happened before and might happen again.

## Support

A price **area** below current price where buying stepped in before. Price fell to it and bounced.

## Resistance

A price **area** above current price where selling stepped in before. Price rose to it and turned down.

## Zones, not lines

Levels are rarely exact to the pip. Mark a small **zone** (a few pips wide) around the turning points. Expect price to poke into a zone a little before reacting.

## What makes a level strong?

- **Clear reactions**: price turned sharply from it.
- **Multiple touches**: two or three clean reactions.
- **Higher timeframe**: a daily level beats a 5-minute level.
- **Role reversal**: old resistance that broke and now acts as support (or the reverse). These are among the cleanest levels.

## How many levels?

Two or three per pair, from your HTF map. If your chart is covered in lines, every price looks like a level and none of them mean anything.

## Trading a level (the beginner way)

1. Price comes **to** your level. You don't chase it.
2. The HTF trend agrees with the direction you want to trade.
3. You see a reaction (a rejection wick or engulfing candle) **after it closes**.
4. Your stop goes **beyond** the level, where your idea is clearly wrong.
5. Your target gives at least **1:2**.

## Warrior's rule

**Let price come to your level. Never run after it.**`,
    quiz: [
      q('Support is:', ['A price area where buying stepped in before', 'Any round number', 'The current price', 'Where your broker puts stops'], 0, 'Support is where buyers previously stopped a fall.'),
      q('Why mark zones instead of exact lines?', ['Lines are illegal', 'Price rarely reacts to the exact pip', 'Zones look nicer', 'It increases RR'], 1, 'Levels are areas. Expect small pokes beyond the exact price.'),
      q('Old resistance that broke and now holds price up is called:', ['A fakeout', 'Role reversal', 'A trendline', 'Overtrading'], 1, 'Broken resistance becoming support is role reversal, often a clean level.'),
      q('Where should your stop go when buying at support?', ['Right at entry', 'Just beyond (below) the support zone, where the idea is wrong', 'Above resistance', 'No stop needed'], 1, 'The stop belongs where the level would be clearly broken.'),
      q('Your chart has 15 levels on it. What is the problem?', ['None', 'Every price looks like a level, so none are meaningful', 'Too few levels', 'It makes RR better'], 1, 'Keep 2-3 key levels per pair from your HTF map.'),
    ],
  },
  {
    id: 'z2-trendlines',
    zone: 2,
    order: 3,
    title: 'Drawing Trendlines Without Fooling Yourself',
    content: `A trendline is a diagonal support or resistance. It's simple, and it's easy to abuse.

## How to draw one

- **Uptrend**: connect two or more clear **swing lows**. The line slopes up and sits under price.
- **Downtrend**: connect two or more clear **swing highs**. The line slopes down and sits above price.

Two points draw a line; a **third touch** that respects it makes it meaningful.

## Rules that keep you honest

1. **Draw it on the HTF first.** Trendlines on tiny timeframes break constantly.
2. **Use obvious swings.** If you have to squint, it isn't a swing.
3. **Don't redraw after every break.** If price closes clearly through your line, the line is broken. Adjusting it to "still be valid" is the **Confirmation Fog**.
4. **Bodies or wicks: pick one and stay consistent.**

## Trendline + horizontal level = confluence

The strongest areas are where a trendline meets a horizontal support or resistance. Two independent reasons in the same place.

## A trendline break is not an instant reversal

When an uptrend line breaks, the trend may simply be slowing or ranging. Wait for structure (a lower high, then a lower low) before assuming a downtrend.

## Warrior's rule

**If you have to force the line, the line isn't there.**`,
    quiz: [
      q('In an uptrend, a trendline connects:', ['Swing highs', 'Swing lows', 'Random candles', 'Closing prices only on Mondays'], 1, 'Uptrend lines connect swing lows and sit below price.'),
      q('When does a trendline become more meaningful?', ['After one touch', 'After a third touch that respects it', 'When you redraw it', 'When it is horizontal'], 1, 'Two points make a line; a third respected touch confirms it.'),
      q('Price closes clearly through your trendline. What should you avoid?', ['Accepting it is broken', 'Redrawing it so it still looks valid', 'Waiting for new structure', 'Updating your plan'], 1, 'Redrawing lines to keep your idea alive is Confirmation Fog.'),
      q('What is confluence?', ['Trading two pairs at once', 'Several independent reasons at the same area', 'A news event', 'A type of candle'], 1, 'For example, a trendline meeting horizontal support.'),
      q('An uptrend line breaks. What does that confirm?', ['A guaranteed downtrend', 'Nothing yet: wait for lower highs/lows to confirm a new trend', 'You must short immediately', 'The broker is wrong'], 1, 'A break can mean slowing or ranging. Structure confirms direction.'),
    ],
  },
  {
    id: 'z2-ranges',
    zone: 2,
    order: 4,
    title: 'Ranges, Breakouts and Fakeouts',
    content: `Markets spend a lot of time going sideways. Learning to recognise a range saves you from many bad trades.

## Anatomy of a range

A range has a **ceiling** (resistance) and a **floor** (support), each tested at least twice. The middle of the range is no-man's land: RR is poor and direction is random.

## Trading inside a range (beginner version)

- Look for longs only near the **floor**, shorts only near the **ceiling**.
- Stop just outside the range edge.
- Target the other side (or the middle if the range is narrow; check RR is still at least 1:2).
- **Skip the middle.** That's what Disciplined Retreats are for.

## Breakouts

Eventually a range breaks. A real breakout usually shows a **strong close** beyond the level, and often a **retest**: price comes back to the broken level, which now acts in the opposite role (role reversal), and holds.

## Fakeouts

Many breakouts fail. Price pokes through, catches eager traders, then snaps back inside. That's why beginners should prefer:

1. waiting for a **close** beyond the level, and
2. entering on the **retest**, not the first spike.

You will miss some breakouts. That's fine. Missing a move costs you nothing; chasing a fakeout costs you HP.

## Warrior's rule

**Edges, not middles. Retests, not spikes.**`,
    quiz: [
      q('Where should a beginner look for longs inside a range?', ['In the middle', 'Near the floor (support)', 'Near the ceiling', 'Anywhere'], 1, 'Buy near the floor, sell near the ceiling, skip the middle.'),
      q('Why avoid trading the middle of a range?', ['It is illegal', 'Poor RR and random direction', 'Spreads are higher', 'Brokers block it'], 1, 'From the middle, both edges are close: low RR and no edge.'),
      q('What is a fakeout?', ['A strong trend', 'A break beyond a level that quickly reverses back inside', 'A news release', 'A trendline'], 1, 'Fakeouts trap traders who chase the first break.'),
      q('Safer beginner breakout entry:', ['Buy the first spike', 'Wait for a close beyond the level, then enter on the retest', 'Enter before the break', 'Double the size'], 1, 'Close + retest filters many fakeouts.'),
      q('You missed a breakout. What did it cost you?', ['Your account', 'Nothing: missing a move is free, chasing one is not', 'Your streak', 'XP'], 1, 'Missed trades cost nothing. Forced trades cost HP.'),
    ],
  },
];

// Zones 4-7: outlines now, full lessons in a later content drop. (Zone 3 is in academy-extra.mjs.)
const stub = (id, zone, order, title, summary) => ({
  id,
  zone,
  order,
  title,
  is_stub: true,
  content: `This lesson is still being forged.\n\n## What it will cover\n\n${summary}\n\nMeanwhile, keep practising in your journal. Every honest log is a lesson.`,
  quiz: [],
});

LESSONS.push(
  stub('z4-one-percent', 4, 1, 'The 1% Rule', '- Why small risk keeps you alive through losing streaks\n- Streak math: 10 losses at 1% vs 5%'),
  stub('z4-sizing', 4, 2, 'Position Sizing in Practice', '- Using the Risk Forge for forex, gold and indices\n- Rounding down, minimum lots, and when to skip'),
  stub('z4-prop-math', 4, 3, 'Prop Firm Math', '- Daily loss and max drawdown as HP and Shield\n- How many losing trades your rules allow'),
  stub('z5-monsters', 5, 1, 'Meet Your Monsters', '- The 12 mistake monsters and their triggers\n- Tagging honestly to spot patterns'),
  stub('z5-tilt', 5, 2, 'Tilt and the Cooldown', '- What tilt feels like in your body\n- The Campfire protocol'),
  stub('z5-process', 5, 3, 'Process Over Outcome', '- Grading trades by decisions, not results\n- Why a good loss beats a lucky win'),
  stub('z6-rulebook', 6, 1, "Reading Your Firm's Rulebook", '- Daily loss, drawdown, consistency, news and minimum days\n- Turning rules into your Boss Arena settings'),
  stub('z6-gameplan', 6, 2, 'The Evaluation Game Plan', '- Pace, not speed\n- What to do after a big day or a bad day'),
  stub('z7-playbook', 7, 1, 'Your One-Strategy Playbook', '- Writing a setup you can repeat 100 times\n- Using the Codex playbook'),
  stub('z7-review', 7, 2, 'Reviewing 100 Trades', '- Reading the Hall of Records like a pro\n- Finding one change worth testing'),
);

export const FLASHCARDS = [
  ['What four prices does a candle show?', 'Open, high, low, close.', 1],
  ['Bullish candle?', 'Closes above where it opened.', 1],
  ['Bearish candle?', 'Closes below where it opened.', 1],
  ['What does a long lower wick at support suggest?', 'Buyers rejected lower prices there.', 1],
  ['Why wait for the candle to close?', 'Spikes inside a candle are noise. The close shows what actually held.', 1],
  ['Job of the higher timeframe?', 'The map: trend direction and key levels.', 1],
  ['Job of the entry timeframe?', 'The door: a clean entry at a level from the map.', 1],
  ['What is the Confirmation Fog?', 'Only looking for evidence that agrees with you, e.g. switching timeframes until one does.', 1],
  ['Name the three main forex sessions.', 'Asian, London, New York.', 1],
  ['Why check the news calendar every day?', 'High-impact news can spike price, widen spreads and break firm rules.', 1],
  ['Uptrend structure?', 'Higher highs and higher lows.', 2],
  ['Downtrend structure?', 'Lower highs and lower lows.', 2],
  ['What puts an uptrend in question?', 'A clear close below the most recent higher low.', 2],
  ['Support?', 'An area below price where buying stepped in before.', 2],
  ['Resistance?', 'An area above price where selling stepped in before.', 2],
  ['Role reversal?', 'Broken resistance acting as support (or broken support acting as resistance).', 2],
  ['How many key levels per pair?', 'Two or three, from the higher timeframe.', 2],
  ['Uptrend line connects…?', 'Swing lows.', 2],
  ['When is a trendline more meaningful?', 'After a third touch that respects it.', 2],
  ['Where to trade in a range?', 'Near the edges. Skip the middle.', 2],
  ['Fakeout?', 'A break of a level that quickly reverses back inside.', 2],
  ['Safer breakout entry?', 'Wait for a close beyond the level, enter on the retest.', 2],
  ['Minimum reward:risk in your armor check?', '1:2. Reward at least twice the risk.', 4],
  ['Position size formula?', 'Risk $ ÷ (stop distance in pips × $ per pip per lot).', 4],
  ['Why round lot size DOWN?', 'So you never risk more than planned.', 4],
  ['What is 1R?', 'The dollar amount you risk on a trade. Results are measured in R.', 4],
  ['What should you do after a loss?', 'Take the Campfire cooldown before looking for the next trade.', 5],
  ['What earns XP in Market Quest?', 'Following your process. Never profit.', 5],
  ['Two losses in a row today?', 'Loss-streak protocol: done for the day.', 5],
  ['Where does your stop go?', 'Where your trade idea is clearly wrong, beyond the level.', 3],
];

export const DRILLS = [
  {
    id: 'drill-trend-1', zone: 2, title: 'Name the Trend I', kind: 'trend',
    payload: { seed: 11, shape: 'up', questions: [q('What is the trend on this chart?', ['Uptrend', 'Downtrend', 'Range'], 0, 'Higher highs and higher lows: an uptrend.'), q('Which trades fit this chart best?', ['Longs at support', 'Shorts at resistance', 'Any direction'], 0, 'Trade with the trend: longs at support.')] },
  },
  {
    id: 'drill-trend-2', zone: 2, title: 'Name the Trend II', kind: 'trend',
    payload: { seed: 23, shape: 'down', questions: [q('What is the trend on this chart?', ['Uptrend', 'Downtrend', 'Range'], 1, 'Lower highs and lower lows: a downtrend.'), q('A small bounce appears. Most likely it is:', ['A new uptrend', 'A pullback in the downtrend', 'A guaranteed reversal'], 1, 'Bounces inside a downtrend are usually pullbacks.')] },
  },
  {
    id: 'drill-trend-3', zone: 2, title: 'Name the Trend III', kind: 'trend',
    payload: { seed: 37, shape: 'range', questions: [q('What is price doing?', ['Uptrend', 'Downtrend', 'Ranging'], 2, 'Highs and lows stay roughly level: a range.'), q('Where is the worst place to enter?', ['Near the floor', 'Near the ceiling', 'In the middle'], 2, 'The middle of a range has poor RR and no edge.')] },
  },
  {
    id: 'drill-levels-1', zone: 2, title: 'Find the Floor', kind: 'level',
    payload: { seed: 41, shape: 'range', lines: [{ label: 'A', at: 'high' }, { label: 'B', at: 'mid' }, { label: 'C', at: 'low' }], questions: [q('Which line is support?', ['Line A', 'Line B', 'Line C'], 2, 'Support is the floor where price bounced: line C.'), q('Which line is resistance?', ['Line A', 'Line B', 'Line C'], 0, 'Resistance is the ceiling: line A.'), q('Buying at line B gives you:', ['Great RR', 'Poor RR in the middle of the range', 'A guaranteed win'], 1, 'From the middle, the target and stop are both close.')] },
  },
  {
    id: 'drill-levels-2', zone: 2, title: 'Stop Placement', kind: 'level',
    payload: { seed: 53, shape: 'range', lines: [{ label: 'A', at: 'high' }, { label: 'C', at: 'low' }], questions: [q('You buy near line C. Where does the stop go?', ['Just above line A', 'Just below line C', 'At your entry'], 1, 'Below the support zone, where the idea is wrong.'), q('Where is a logical target?', ['Near line A', 'Below line C', 'No target'], 0, 'The other side of the range.')] },
  },
  {
    id: 'drill-rr-1', zone: 4, title: 'RR Calculator I', kind: 'rr',
    payload: { seed: 61, shape: 'up', questions: [q('Long EURUSD: entry 1.1000, stop 1.0980, target 1.1040. What is the RR?', ['1:1', '1:2', '1:3'], 1, 'Risk 20 pips, reward 40 pips = 1:2.'), q('Does it pass the armor check minimum?', ['Yes', 'No'], 0, '1:2 meets the minimum.'), q('Same trade with target 1.1030?', ['1:1.5, fails', '1:2, passes', '1:3, passes'], 0, '30 ÷ 20 = 1.5. Look for 1:2 or better.')] },
  },
  {
    id: 'drill-rr-2', zone: 4, title: 'RR Calculator II', kind: 'rr',
    payload: { seed: 67, shape: 'down', questions: [q('Short gold: entry 2400, stop 2405, target 2385. RR?', ['1:2', '1:3', '1:4'], 1, 'Risk $5, reward $15 = 1:3.'), q('Short EURUSD: entry 1.0900, stop 1.0925, target 1.0850. RR?', ['1:2', '1:2.5', '1:1'], 0, 'Risk 25 pips, reward 50 pips = 1:2.')] },
  },
  {
    id: 'drill-size-1', zone: 4, title: 'Position Size I', kind: 'size',
    payload: { seed: 71, shape: 'up', questions: [q('$5,000 account, 1% risk, 20-pip stop on EURUSD ($10/pip/lot). Lot size?', ['0.10', '0.25', '0.50'], 1, '$50 ÷ (20 × $10) = 0.25 lots.'), q('Same account, 1% risk, 50-pip stop. Lot size?', ['0.10', '0.25', '1.00'], 0, '$50 ÷ (50 × $10) = 0.10 lots.'), q('Your stop gets wider. Your lot size should:', ['Get bigger', 'Get smaller', 'Stay the same'], 1, 'Wider stop → smaller lots, same dollar risk.')] },
  },
  {
    id: 'drill-size-2', zone: 4, title: 'Position Size II (Gold)', kind: 'size',
    payload: { seed: 79, shape: 'range', questions: [q('$5,000, 0.5% risk, gold stop $5 away ($10 per $0.10 per lot). Lot size?', ['0.05', '0.10', '0.50'], 0, '$25 ÷ (50 × $10) = 0.05 lots.'), q('Why round lots DOWN, not up?', ['Brokers require it', 'So you never risk more than planned', 'It increases RR'], 1, 'Rounding down keeps risk at or below your limit.')] },
  },
  {
    id: 'drill-mind-1', zone: 5, title: 'Monster Spotting', kind: 'mind',
    payload: { seed: 83, shape: 'up', questions: [q('You lost a trade 5 minutes ago and want to re-enter bigger. Which monster?', ['FOMO Wraith', 'Revenge Goblin', 'Hope Ghost'], 1, 'Re-entering quickly after a loss is the Revenge Goblin.'), q('You moved your stop further away to "give it room". Which monster?', ['Stop-Loss Thief', 'Boredom Bat', 'Early Exit Imp'], 0, 'Moving the stop away is the Stop-Loss Thief.'), q('Nothing is happening, so you take a so-so setup. Which monster?', ['News Banshee', 'Boredom Bat', 'Trend Defier'], 1, 'Trading out of boredom is the Boredom Bat.')] },
  },
];

LESSONS.push(...EXTRA_LESSONS);
FLASHCARDS.push(...EXTRA_FLASHCARDS);
DRILLS.push(...EXTRA_DRILLS);
