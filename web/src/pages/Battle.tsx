import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { armorCheck, type ArmorReport } from '@shared/armor';
import { EMOTIONS, HTF_TRENDS, LEVEL_TYPES, type Emotion, type HtfTrend, type LevelType } from '@shared/constants';
import { api, ApiError } from '../lib/api';
import { fromLocalInput, toLocalInput } from '../lib/format';
import { playSound } from '../lib/sound';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { ArmorPanel } from '../components/ArmorPanel';
import { CloseForm, closePayload, closeReady, emptyClose, type CloseDraft } from '../components/CloseForm';
import { EMPTY_FORGE, ForgeCalc, type ForgeValues } from '../components/ForgeCalc';
import { XpResult, type XpOutcome } from '../components/XpResult';
import { Banner, Card, Chips, Field, PageTitle, Toggle, errMsg, toast } from '../components/ui';

type Mode = 'battle' | 'logged' | 'skipped';

const TREND_LABEL: Record<HtfTrend, string> = { up: '↗ Uptrend', down: '↘ Downtrend', range: '↔ Range' };

export default function Battle() {
  const { state, tz, refreshState, refreshMe } = useStore();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = (['battle', 'logged', 'skipped'].includes(params.get('mode') ?? '') ? params.get('mode') : 'battle') as Mode;

  const [forge, setForge] = useState<ForgeValues>({ ...EMPTY_FORGE, risk_percent: state?.maxRisk ?? '1' });
  const [htf, setHtf] = useState<HtfTrend | ''>('');
  const [level, setLevel] = useState<LevelType | ''>('');
  const [emotion, setEmotion] = useState<Emotion | ''>('');
  const [openedAt, setOpenedAt] = useState(toLocalInput(new Date(), tz));
  const [alreadyClosed, setAlreadyClosed] = useState(true);
  const [close, setClose] = useState<CloseDraft>(emptyClose(toLocalInput(new Date(), tz)));
  const [skipReason, setSkipReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverReport, setServerReport] = useState<ArmorReport | null>(null);
  const [outcome, setOutcome] = useState<XpOutcome | null>(null);

  const report = useMemo(() => {
    if (!state) return null;
    return armorCheck(
      {
        direction: forge.direction,
        htfTrend: htf,
        levelType: level,
        entry: forge.entry,
        stopLoss: forge.stop_loss,
        takeProfit: forge.take_profit,
        riskPercent: forge.risk_percent,
        lotSize: forge.lot_size,
        pipSize: forge.pip_size,
        pipValue: forge.pip_value,
        emotionBefore: emotion,
      },
      {
        balance: state.balance,
        maxRiskPercent: state.maxRisk,
        maxTrades: state.maxTrades,
        tradesToday: state.tradesToday,
        hpRemaining: state.daily.remaining,
        openRisk: state.openRisk,
        locked: state.locked,
        lockMessage: state.lockMessage ?? undefined,
      },
    );
  }, [state, forge, htf, level, emotion]);

  if (!state) return null;

  const setMode = (m: Mode) => {
    setParams(m === 'battle' ? {} : { mode: m });
    setServerReport(null);
    setOutcome(null);
  };

  const planned = () => ({
    pair: forge.pair,
    instrument_type: forge.instrument_type,
    direction: forge.direction,
    htf_trend: htf || null,
    level_type: level || null,
    entry: forge.entry,
    stop_loss: forge.stop_loss || null,
    take_profit: forge.take_profit || null,
    pip_size: forge.pip_size || null,
    pip_value: forge.pip_value || null,
    risk_percent: forge.risk_percent || null,
    lot_size: forge.lot_size || null,
    emotion_before: emotion || null,
  });

  async function submit() {
    setBusy(true);
    setServerReport(null);
    try {
      let body: Record<string, unknown> = { ...planned(), mode };
      if (mode === 'logged') {
        body.opened_at = fromLocalInput(openedAt, tz);
        if (alreadyClosed) body.close = closePayload(close, fromLocalInput(close.closed_at, tz));
      }
      if (mode === 'skipped') body = { ...body, skip_reason: skipReason };
      const r = await api('/trades', { method: 'POST', body });
      await Promise.all([refreshState(), refreshMe()]);

      if (mode === 'battle') {
        playSound('good');
        toast(`${r.note} +${r.xp.delta} XP`, 'ok');
        nav(`/log/${r.trade.id}`);
        return;
      }
      if (mode === 'skipped') {
        playSound('good');
        setOutcome({ title: '🏳️ Disciplined Retreat', message: r.message, lines: r.xp.applied, total: r.xp.delta, leveledUp: r.xp.leveledUp, rank: r.xp.rank, tradeId: r.trade.id });
        return;
      }
      // logged
      const lines = r.openXp ? [...r.openXp.applied, ...r.xp.applied] : r.xp.applied;
      const total = r.openXp ? r.openXp.delta + r.xp.delta : r.xp.delta;
      playSound(total >= 0 ? 'good' : 'bad');
      setOutcome({ title: '📜 Trade logged', message: r.message ?? r.note, note: r.note, lines, total, leveledUp: r.xp.leveledUp || !!r.openXp?.leveledUp, rank: r.xp.rank, tradeId: r.trade.id, autoTags: r.autoTags });
    } catch (e) {
      if (e instanceof ApiError && e.data?.report) {
        setServerReport(e.data.report);
        playSound('bad');
      }
      toast(errMsg(e), 'bad');
    } finally {
      setBusy(false);
    }
  }

  if (outcome) {
    return (
      <div className="space-y-4">
        <XpResult outcome={outcome} />
        <div className="grid grid-cols-2 gap-2">
          <Link to={`/log/${outcome.tradeId}`} className="btn-ghost">
            View in Battle Log
          </Link>
          <Link to="/" className="btn-primary">
            Command Center
          </Link>
        </div>
      </div>
    );
  }

  const shown = serverReport ?? report!;
  const canSubmit =
    mode === 'battle'
      ? report?.passed
      : mode === 'skipped'
        ? skipReason.trim().length > 0 && !!forge.entry
        : !!forge.entry && !!openedAt && (!alreadyClosed || closeReady(close));

  return (
    <div className="space-y-4">
      <PageTitle icon="⚔️" title={theme.labels.battle} subtitle="No armor, no battle. Every check must pass before a trade is saved." />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface2 p-1 text-sm">
        {(
          [
            ['battle', '⚔️ New battle'],
            ['logged', '📝 Already taken'],
            ['skipped', '🏳️ Skip setup'],
          ] as const
        ).map(([m, label]) => (
          <button key={m} className={`rounded-lg py-2 font-semibold ${mode === m ? 'bg-surface shadow' : 'text-muted'}`} onClick={() => setMode(m)}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'battle' && state.locked && (
        <Banner tone="danger">
          🔒 {state.lockMessage} <Link to="/campfire" className="underline">Campfire</Link>
        </Banner>
      )}
      {mode === 'battle' && !state.session && (
        <Banner tone="info">
          No prep yet today. <Link to="/prep" className="font-semibold underline">Do your Pre-Battle Prep</Link> first for +10 XP and tighter limits.
        </Banner>
      )}
      {mode === 'logged' && (
        <Banner tone="warn">Logging a trade you took without the Battle Station costs -30 XP (no armor check). Logging it honestly is still the right move: the journal must see every trade.</Banner>
      )}
      {mode === 'skipped' && <Banner tone="ok">Saw a setup but it didn't pass your rules? Record it. Retreating with discipline earns XP.</Banner>}

      <Card title="Read the battlefield" icon="🔭">
        <div className="space-y-3">
          <Field group label="Higher-timeframe trend">
            <Chips options={HTF_TRENDS} value={htf} onChange={setHtf} render={(t) => TREND_LABEL[t]} />
          </Field>
          <Field group label="What level are you trading?">
            <Chips options={LEVEL_TYPES} value={level} onChange={setLevel} />
          </Field>
        </div>
      </Card>

      <Card title={theme.labels.forge} icon="⚒️">
        <ForgeCalc value={forge} onChange={setForge} balance={state.balance} hpRemaining={state.daily.remaining} />
      </Card>

      <Card title="Emotion check" icon="🧠">
        <Chips options={EMOTIONS} value={emotion} onChange={setEmotion} render={(m) => `${theme.moods[m].emoji} ${theme.moods[m].label}`} />
      </Card>

      {mode === 'logged' && (
        <Card title="When did it happen?" icon="🕰️">
          <div className="space-y-3">
            <Field label="Opened at">
              <input className="input" type="datetime-local" value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} />
            </Field>
            <Toggle checked={alreadyClosed} onChange={setAlreadyClosed} label="This trade is already closed" />
          </div>
        </Card>
      )}
      {mode === 'logged' && alreadyClosed && (
        <Card title="Battle outcome" icon="📜">
          <CloseForm value={close} onChange={setClose} trade={{ direction: forge.direction, entry: forge.entry, lot_size: forge.lot_size, pip_size: forge.pip_size, pip_value: forge.pip_value }} />
        </Card>
      )}
      {mode === 'skipped' && (
        <Card title="Why are you retreating?" icon="🏳️">
          <textarea className="input" rows={3} maxLength={500} value={skipReason} onChange={(e) => setSkipReason(e.target.value)} placeholder="e.g. RR only 1:1.5, price already left my level, news in 10 minutes" />
        </Card>
      )}

      {mode !== 'skipped' && shown && <ArmorPanel report={shown} title={mode === 'battle' ? 'Armor check' : 'Armor check (for the record)'} />}

      <button className={mode === 'battle' && !report?.passed ? 'btn-ghost w-full' : 'btn-primary w-full'} disabled={busy || !canSubmit} onClick={submit}>
        {busy
          ? 'Saving...'
          : mode === 'battle'
            ? report?.passed
              ? '⚔️ Armor secured. Enter the battle'
              : '🛡️ Armor incomplete'
            : mode === 'skipped'
              ? '🏳️ Log Disciplined Retreat'
              : '📝 Log this trade'}
      </button>
      {mode === 'battle' && !report?.passed && (
        <button className="btn-ghost w-full text-sm" onClick={() => setMode('skipped')}>
          Retreat: skip this trade instead
        </button>
      )}
    </div>
  );
}
