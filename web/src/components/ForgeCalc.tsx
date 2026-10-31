import { INSTRUMENT_PRESETS, type Direction, type InstrumentType } from '@shared/constants';
import { big, money, positionSize, rewardRisk } from '@shared/risk';
import { Field } from './ui';

export interface ForgeValues {
  pair: string;
  instrument_type: InstrumentType;
  direction: Direction;
  entry: string;
  stop_loss: string;
  take_profit: string;
  pip_size: string;
  pip_value: string;
  risk_percent: string;
  lot_size: string;
}

export const EMPTY_FORGE: ForgeValues = {
  pair: 'EURUSD',
  instrument_type: 'forex',
  direction: 'long',
  entry: '',
  stop_loss: '',
  take_profit: '',
  pip_size: '0.0001',
  pip_value: '10',
  risk_percent: '1',
  lot_size: '',
};

/** Risk Forge: position size, RR visual, and the "what if I lose" HP preview. */
export function ForgeCalc({
  value,
  onChange,
  balance,
  hpRemaining,
  showLotInput = true,
}: {
  value: ForgeValues;
  onChange: (v: ForgeValues) => void;
  balance: string;
  hpRemaining?: string;
  showLotInput?: boolean;
}) {
  const set = (k: keyof ForgeValues) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const preset = INSTRUMENT_PRESETS.find((p) => p.symbol === value.pair);
  const size = positionSize({ balance, riskPercent: value.risk_percent, entry: value.entry, stopLoss: value.stop_loss, pipSize: value.pip_size, pipValue: value.pip_value });
  const rr = rewardRisk(value.direction, value.entry, value.stop_loss, value.take_profit);
  const tpPips = big(value.entry) && big(value.take_profit) && big(value.pip_size) ? big(value.take_profit)!.minus(big(value.entry)!).abs().div(big(value.pip_size)!) : null;

  // "What if I lose": the dollar risk of the lots you will actually use.
  const lotsUsed = big(value.lot_size) ?? (size ? big(size.lots) : null);
  const lossIfStopped = lotsUsed && size && big(value.pip_value) ? lotsUsed.times(big(size.slPips)!).times(big(value.pip_value)!) : null;
  const hp = big(hpRemaining ?? '');
  const hpCost = lossIfStopped && hp && hp.gt(0) ? Number(lossIfStopped.div(hp).times(100).toFixed(0)) : null;

  function pickPreset(symbol: string) {
    const p = INSTRUMENT_PRESETS.find((x) => x.symbol === symbol);
    onChange(p ? { ...value, pair: p.symbol, instrument_type: p.type, pip_size: p.pipSize, pip_value: p.pipValue } : { ...value, pair: symbol, instrument_type: 'other' });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Instrument">
          <input className="input uppercase" list="instrument-presets" value={value.pair} onChange={(e) => pickPreset(e.target.value.toUpperCase())} />
          <datalist id="instrument-presets">
            {INSTRUMENT_PRESETS.map((p) => (
              <option key={p.symbol} value={p.symbol} />
            ))}
          </datalist>
        </Field>
        <Field group label="Direction">
          <div className="grid grid-cols-2 gap-1.5">
            {(['long', 'short'] as const).map((d) => (
              <button key={d} type="button" onClick={() => onChange({ ...value, direction: d })} className={`chip rounded-xl py-2.5 ${value.direction === d ? (d === 'long' ? 'border-ok bg-ok/20' : 'border-danger bg-danger/20') : ''}`}>
                {d === 'long' ? '▲ Long' : '▼ Short'}
              </button>
            ))}
          </div>
        </Field>
      </div>
      {preset?.note && <p className="text-xs text-warn">{preset.note}</p>}

      <div className="grid grid-cols-3 gap-2">
        <Field label="Entry">
          <input className="input" inputMode="decimal" value={value.entry} onChange={set('entry')} />
        </Field>
        <Field label="Stop loss">
          <input className="input" inputMode="decimal" value={value.stop_loss} onChange={set('stop_loss')} />
        </Field>
        <Field label="Take profit">
          <input className="input" inputMode="decimal" value={value.take_profit} onChange={set('take_profit')} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Risk %">
          <input className="input" inputMode="decimal" value={value.risk_percent} onChange={set('risk_percent')} />
        </Field>
        <Field label="Pip/point size">
          <input className="input" inputMode="decimal" value={value.pip_size} onChange={set('pip_size')} />
        </Field>
        <Field label="$ per pip / lot">
          <input className="input" inputMode="decimal" value={value.pip_value} onChange={set('pip_value')} />
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 rounded-xl bg-surface2 p-3">
        <div className="space-y-1 text-sm">
          {size ? (
            <>
              <div className="text-xs text-muted">Position size</div>
              <div className="font-display text-2xl font-bold">{size.lots} lots</div>
              <div className="text-muted">
                Stop: {size.slPips} pips · Risk ${size.actualRisk} ({size.actualRiskPercent}%)
              </div>
              {size.tooSmall && <div className="text-warn">Even 0.01 lots risks more than your limit here. Use a tighter stop or skip.</div>}
              {rr && (
                <div className={rr.gte(2) ? 'text-ok' : 'text-danger'}>
                  Reward:risk 1:{rr.toFixed(2)} {tpPips ? `· Target ${tpPips.round(1).toString()} pips` : ''}
                </div>
              )}
              {lossIfStopped && (
                <div className="pt-1">
                  <b>If you lose:</b> -${money(lossIfStopped)}
                  {hpCost !== null && (
                    <span className={hpCost > 50 ? ' text-danger' : ' text-muted'}>
                      {' '}
                      = {hpCost}% of today's HP
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted">Enter entry, stop and risk to forge your position size.</div>
          )}
        </div>
        <RrVisual direction={value.direction} entry={value.entry} sl={value.stop_loss} tp={value.take_profit} />
      </div>

      {showLotInput && (
        <Field label="Lot size you will use" hint="This is what the armor check measures.">
          <div className="flex gap-2">
            <input className="input" inputMode="decimal" value={value.lot_size} onChange={set('lot_size')} placeholder={size?.lots ?? '0.00'} />
            {size && !size.tooSmall && (
              <button type="button" className="btn-ghost shrink-0 text-sm" onClick={() => onChange({ ...value, lot_size: size.lots })}>
                Use {size.lots}
              </button>
            )}
          </div>
        </Field>
      )}
    </div>
  );
}

/** Vertical bar: green reward zone vs red risk zone, scaled to each other. */
function RrVisual({ direction, entry, sl, tp }: { direction: Direction; entry: string; sl: string; tp: string }) {
  const rr = rewardRisk(direction, entry, sl, tp);
  if (!rr) return <div className="w-10" />;
  const r = Number(rr.toFixed(2));
  const total = r + 1;
  const reward = (r / total) * 100;
  const zones = [
    <div key="tp" className="flex items-center justify-center bg-ok/70 text-[10px] font-bold text-white" style={{ height: `${reward}%` }}>
      {r.toFixed(1)}R
    </div>,
    <div key="sl" className="flex items-center justify-center bg-danger/70 text-[10px] font-bold text-white" style={{ height: `${100 - reward}%` }}>
      1R
    </div>,
  ];
  return (
    <div className="flex h-28 w-10 flex-col overflow-hidden rounded-lg border border-border" aria-label={`Reward to risk 1 to ${r}`}>
      {direction === 'long' ? zones : zones.reverse()}
    </div>
  );
}
