import { ACCOUNT_PHASES, DRAWDOWN_MODES } from '@shared/constants';
import { big, money } from '@shared/risk';
import { Chips, Field } from './ui';

export interface AccountDraft {
  firm_name: string;
  starting_balance: string;
  daily_loss_limit: string;
  max_drawdown: string;
  drawdown_mode: (typeof DRAWDOWN_MODES)[number];
  profit_target: string;
  min_trading_days: string;
  consistency_rule: string;
  consistency_pct: string;
  news_rule: string;
  phase: (typeof ACCOUNT_PHASES)[number];
  max_risk_percent: string;
  max_trades_per_day: string;
}

/** Typical $5k evaluation: 5% daily loss, 10% max drawdown, 8% target. Edit to match YOUR firm. */
export const DEFAULT_ACCOUNT: AccountDraft = {
  firm_name: 'My Prop Firm',
  starting_balance: '5000',
  daily_loss_limit: '250',
  max_drawdown: '500',
  drawdown_mode: 'static',
  profit_target: '400',
  min_trading_days: '4',
  consistency_rule: '',
  consistency_pct: '',
  news_rule: 'No trades 2 minutes before or after high-impact news.',
  phase: 'evaluation',
  max_risk_percent: '1',
  max_trades_per_day: '3',
};

export function accountFromApi(a: any): AccountDraft {
  const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
  return {
    firm_name: s(a.firm_name),
    starting_balance: s(a.starting_balance),
    daily_loss_limit: s(a.daily_loss_limit),
    max_drawdown: s(a.max_drawdown),
    drawdown_mode: a.drawdown_mode,
    profit_target: s(a.profit_target),
    min_trading_days: s(a.min_trading_days),
    consistency_rule: s(a.consistency_rule),
    consistency_pct: s(a.consistency_pct),
    news_rule: s(a.news_rule),
    phase: a.phase,
    max_risk_percent: s(a.max_risk_percent),
    max_trades_per_day: s(a.max_trades_per_day),
  };
}

export function accountPayload(d: AccountDraft) {
  return {
    ...d,
    profit_target: d.profit_target.trim() === '' ? null : d.profit_target,
    consistency_pct: d.consistency_pct.trim() === '' ? null : d.consistency_pct,
    consistency_rule: d.consistency_rule.trim() || null,
    news_rule: d.news_rule.trim() || null,
  };
}

function pctOf(amount: string, base: string) {
  const a = big(amount);
  const b = big(base);
  if (!a || !b || b.lte(0)) return '';
  return `${a.div(b).times(100).round(2).toString()}%`;
}

export function AccountForm({ value, onChange }: { value: AccountDraft; onChange: (v: AccountDraft) => void }) {
  const set = (k: keyof AccountDraft) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const setPct = (k: 'daily_loss_limit' | 'max_drawdown' | 'profit_target', pct: string) => {
    const b = big(value.starting_balance);
    const p = big(pct);
    if (b && p) onChange({ ...value, [k]: money(b.times(p).div(100)) });
  };
  const riskDollar = big(value.starting_balance) && big(value.max_risk_percent) ? money(big(value.starting_balance)!.times(big(value.max_risk_percent)!).div(100)) : null;

  return (
    <div className="space-y-4">
      <Field label="Firm / account name">
        <input className="input" value={value.firm_name} onChange={set('firm_name')} maxLength={60} />
      </Field>
      <Field group label="Phase (boss stage)">
        <Chips options={ACCOUNT_PHASES} value={value.phase} onChange={(phase) => onChange({ ...value, phase })} />
      </Field>
      <Field label="Starting balance ($)">
        <input className="input" inputMode="decimal" value={value.starting_balance} onChange={set('starting_balance')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Daily loss limit ($)" hint={pctOf(value.daily_loss_limit, value.starting_balance) + ' of balance'}>
          <input className="input" inputMode="decimal" value={value.daily_loss_limit} onChange={set('daily_loss_limit')} />
        </Field>
        <Field label="Max drawdown ($)" hint={pctOf(value.max_drawdown, value.starting_balance) + ' of balance'}>
          <input className="input" inputMode="decimal" value={value.max_drawdown} onChange={set('max_drawdown')} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted">Quick set:</span>
        <button type="button" className="chip" onClick={() => setPct('daily_loss_limit', '4')}>Daily 4%</button>
        <button type="button" className="chip" onClick={() => setPct('daily_loss_limit', '5')}>Daily 5%</button>
        <button type="button" className="chip" onClick={() => setPct('max_drawdown', '6')}>Max DD 6%</button>
        <button type="button" className="chip" onClick={() => setPct('max_drawdown', '10')}>Max DD 10%</button>
      </div>
      <Field group label="Drawdown type" hint="Static: floor never moves. Trailing: floor rises with your highest balance (stops at the starting balance).">
        <Chips options={DRAWDOWN_MODES} value={value.drawdown_mode} onChange={(drawdown_mode) => onChange({ ...value, drawdown_mode })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Profit target ($)" hint={value.profit_target ? pctOf(value.profit_target, value.starting_balance) : 'Optional'}>
          <input className="input" inputMode="decimal" value={value.profit_target} onChange={set('profit_target')} />
        </Field>
        <Field label="Min trading days">
          <input className="input" inputMode="numeric" value={value.min_trading_days} onChange={set('min_trading_days')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Max risk per trade (%)" hint={riskDollar ? `= $${riskDollar} per trade. Beginners: 0.5-1%.` : 'Max 5%'}>
          <input className="input" inputMode="decimal" value={value.max_risk_percent} onChange={set('max_risk_percent')} />
        </Field>
        <Field label="Max trades per day">
          <input className="input" inputMode="numeric" value={value.max_trades_per_day} onChange={set('max_trades_per_day')} />
        </Field>
      </div>
      <Field group label="Consistency rule (optional)" hint="e.g. no single day may be more than 30% of total profit">
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <input className="input" value={value.consistency_rule} onChange={set('consistency_rule')} placeholder="Describe your firm's rule" />
          <input className="input" inputMode="decimal" value={value.consistency_pct} onChange={set('consistency_pct')} placeholder="max %" />
        </div>
      </Field>
      <Field label="News rule (optional)">
        <input className="input" value={value.news_rule} onChange={set('news_rule')} />
      </Field>
    </div>
  );
}
