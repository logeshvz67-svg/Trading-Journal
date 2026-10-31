// Domain constants shared by the API and the web app.
// Keep this file free of runtime dependencies so both bundles stay small.

export const MOODS = ['calm', 'anxious', 'angry', 'bored', 'overconfident'] as const;
export type Mood = (typeof MOODS)[number];

export const EMOTIONS = MOODS; // same scale before/after a trade
export type Emotion = Mood;

export const DIRECTIONS = ['long', 'short'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const HTF_TRENDS = ['up', 'down', 'range'] as const;
export type HtfTrend = (typeof HTF_TRENDS)[number];

export const LEVEL_TYPES = ['support', 'resistance', 'trendline'] as const;
export type LevelType = (typeof LEVEL_TYPES)[number];

export const ACCOUNT_PHASES = ['practice', 'evaluation', 'verification', 'funded'] as const;
export type AccountPhase = (typeof ACCOUNT_PHASES)[number];

export const DRAWDOWN_MODES = ['static', 'trailing'] as const;
export type DrawdownMode = (typeof DRAWDOWN_MODES)[number];

export const TRADE_MODES = ['battle', 'logged', 'skipped'] as const;
export type TradeMode = (typeof TRADE_MODES)[number];

export const INSTRUMENT_TYPES = ['forex', 'metal', 'index', 'other'] as const;
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];

/**
 * Instrument presets for the Risk Forge.
 * pipSize  = the price move you count in (pip for forex, point for indices).
 * pipValue = account-currency (USD) value of ONE pipSize move for 1.00 lot.
 * These are typical CFD values; brokers differ, so the UI always lets you edit them.
 */
export interface InstrumentPreset {
  symbol: string;
  type: InstrumentType;
  pipSize: string;
  pipValue: string;
  note?: string;
}

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  { symbol: 'EURUSD', type: 'forex', pipSize: '0.0001', pipValue: '10' },
  { symbol: 'GBPUSD', type: 'forex', pipSize: '0.0001', pipValue: '10' },
  { symbol: 'AUDUSD', type: 'forex', pipSize: '0.0001', pipValue: '10' },
  { symbol: 'NZDUSD', type: 'forex', pipSize: '0.0001', pipValue: '10' },
  { symbol: 'USDJPY', type: 'forex', pipSize: '0.01', pipValue: '6.5', note: 'JPY pip value changes with the USDJPY rate. Check your broker.' },
  { symbol: 'USDCAD', type: 'forex', pipSize: '0.0001', pipValue: '7.3', note: 'Pip value depends on the USDCAD rate. Check your broker.' },
  { symbol: 'USDCHF', type: 'forex', pipSize: '0.0001', pipValue: '11.5', note: 'Pip value depends on the USDCHF rate. Check your broker.' },
  { symbol: 'XAUUSD', type: 'metal', pipSize: '0.1', pipValue: '10', note: 'Gold: 1 lot = 100 oz, so a $0.10 move = $10.' },
  { symbol: 'US30', type: 'index', pipSize: '1', pipValue: '1', note: 'Index CFDs vary a lot by broker. Confirm the $ per point per lot.' },
  { symbol: 'NAS100', type: 'index', pipSize: '1', pipValue: '1', note: 'Index CFDs vary a lot by broker. Confirm the $ per point per lot.' },
  { symbol: 'SPX500', type: 'index', pipSize: '1', pipValue: '1', note: 'Index CFDs vary a lot by broker. Confirm the $ per point per lot.' },
  { symbol: 'GER40', type: 'index', pipSize: '1', pipValue: '1.1', note: 'Priced in EUR. Confirm with your broker.' },
];

export const MIN_RR = 2; // armor rule: reward must be at least 2x the risk
export const LOT_STEP = '0.01';
export const REVENGE_WINDOW_MIN = 15;
export const LOSS_COOLDOWN_MIN = 30;
export const TIMELY_LOG_WINDOW_MIN = 10;
export const ALERT_PCT = 70;
export const LOCKOUT_PCT = 90;
export const LOW_FOCUS_THRESHOLD = 60;
export const MAX_SKIP_REWARDS_PER_DAY = 3;

export const MONSTER_IDS = [
  'revenge-goblin',
  'fomo-wraith',
  'stop-loss-thief',
  'overlord-oversize',
  'early-exit-imp',
  'hope-ghost',
  'trend-defier',
  'boredom-bat',
  'overconfidence-dragon',
  'news-banshee',
  'overtrade-hydra',
  'confirmation-fog',
] as const;
export type MonsterId = (typeof MONSTER_IDS)[number];

export const MONSTER_ACTIVE_AT = 3; // encounters before a monster becomes "active"
export const MONSTER_DEFEAT_CLEAN_TRADES = 5;
