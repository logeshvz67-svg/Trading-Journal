import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { XP_REASON_LABELS, type XpReason } from '@shared/xp';
import { api } from '../lib/api';
import { dateTime, fromLocalInput, toLocalInput, usd } from '../lib/format';
import { useMonsters } from '../lib/monsters';
import { playSound } from '../lib/sound';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { ArmorPanel } from '../components/ArmorPanel';
import { CloseForm, closePayload, closeReady, emptyClose, type CloseDraft } from '../components/CloseForm';
import { MistakePicker } from '../components/MistakePicker';
import { ScreenshotInput } from '../components/ScreenshotInput';
import { XpResult, type XpOutcome } from '../components/XpResult';
import { Banner, Card, Field, Spinner, errMsg, toast } from '../components/ui';

export default function TradeDetail() {
  const { id } = useParams();
  const { tz, refreshState, refreshMe } = useStore();
  const nav = useNavigate();
  const monsters = useMonsters();
  const [trade, setTrade] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [close, setClose] = useState<CloseDraft>(emptyClose(toLocalInput(new Date(), tz)));
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<XpOutcome | null>(null);
  const [notes, setNotes] = useState({ good: '', improve: '' });
  const [lateTags, setLateTags] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await api(`/trades/${id}`);
      setTrade(r.trade);
      setEvents(r.xpEvents);
      setNotes({ good: r.trade.notes_good ?? '', improve: r.trade.notes_improve ?? '' });
    } catch (e) {
      setError(errMsg(e));
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Banner tone="danger">{error}</Banner>;
  if (!trade) return <Spinner />;

  const tags: string[] = (trade.trade_mistakes ?? []).map((m: any) => m.monster_id);
  const nameOf = (mid: string) => {
    const m = monsters?.monsters.find((x) => x.id === mid);
    return m ? `${m.emoji} ${m.name}` : mid;
  };

  async function submitClose() {
    setBusy(true);
    try {
      const r = await api(`/trades/${id}/close`, { method: 'POST', body: closePayload(close, fromLocalInput(close.closed_at, tz)) });
      await Promise.all([refreshState(), refreshMe(), load()]);
      playSound(r.xp.delta >= 0 ? 'good' : 'bad');
      if (r.xp.leveledUp) playSound('level');
      setOutcome({
        title: r.trade.followed_plan ? '🛡️ Battle recorded' : '👺 Battle recorded',
        message: r.message,
        lines: r.xp.applied,
        total: r.tradeXp,
        leveledUp: r.xp.leveledUp,
        rank: r.xp.rank,
        defeated: r.defeatedMonsters,
      });
      if (r.state?.locked) toast(r.state.lockMessage, 'bad');
      else if (r.state?.alertMessage) toast(r.state.alertMessage, 'bad');
    } catch (e) {
      toast(errMsg(e), 'bad');
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: Record<string, unknown>, msg = 'Saved.') {
    try {
      const r = await api(`/trades/${id}`, { method: 'PATCH', body });
      await load();
      if (r.xp) {
        await Promise.all([refreshState(), refreshMe()]);
        toast(`Honesty noted. ${r.xp.delta >= 0 ? '+' : ''}${r.xp.delta} XP. The lesson is now yours.`, 'ok');
      } else toast(msg, 'ok');
      setLateTags([]);
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  }

  async function remove() {
    if (!confirm('Delete this trade from your journal? Its XP history stays (penalties cannot be erased).')) return;
    try {
      await api(`/trades/${id}`, { method: 'DELETE' });
      await refreshState();
      nav('/log');
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  }

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <Link to="/log" className="text-sm text-muted">
        ← {theme.labels.log}
      </Link>
      <h1 className="text-2xl font-bold">
        {trade.direction === 'long' ? '▲' : '▼'} {trade.pair}
        <span className="ml-2 align-middle text-sm font-normal text-muted">{trade.status === 'skipped' ? 'Disciplined Retreat' : trade.status}</span>
      </h1>

      {outcome && <XpResult outcome={outcome} />}

      <Card title="The plan" icon="🗺️">
        {row('Opened', dateTime(trade.opened_at, tz))}
        {row('HTF trend / level', `${trade.htf_trend ?? '—'} / ${trade.level_type ?? '—'}`)}
        {row('Entry / SL / TP', `${trade.entry ?? '—'} / ${trade.stop_loss ?? '—'} / ${trade.take_profit ?? '—'}`)}
        {row('Planned RR', trade.planned_rr ? `1:${Number(trade.planned_rr).toFixed(2)}` : '—')}
        {row('Lots / risk', `${trade.lot_size ?? '—'} lots · ${usd(trade.risk_amount)} (${trade.risk_percent ?? '—'}%)`)}
        {row('Emotion before', trade.emotion_before ? `${theme.moods[trade.emotion_before as keyof typeof theme.moods].emoji} ${trade.emotion_before}` : '—')}
        {row('Armor check', trade.armor_check_passed ? '✅ Passed' : '❌ Not done before entry')}
        {trade.skip_reason && row('Why I retreated', trade.skip_reason)}
      </Card>

      {trade.status === 'closed' && (
        <Card title="The outcome" icon="📜">
          {row('Closed', dateTime(trade.closed_at, tz))}
          {row('Exit', trade.exit_price)}
          {row('P/L', usd(trade.pnl))}
          {row('R multiple', trade.r_multiple !== null ? `${Number(trade.r_multiple).toFixed(2)}R` : '—')}
          {row('Followed plan', trade.followed_plan ? '✅ Yes' : '❌ No')}
          {row('Stop moved', trade.stop_moved ? 'Yes' : 'No')}
          {row('Emotion after', trade.emotion_after ?? '—')}
          {tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="chip border-danger/50 text-xs">{nameOf(t)}</span>)}</div>}
        </Card>
      )}

      {trade.status === 'open' && !outcome && (
        <Card title="Close this battle" icon="🏁">
          <p className="mb-3 text-sm text-muted">Log within 10 minutes of closing for +20 XP.</p>
          <CloseForm value={close} onChange={setClose} trade={trade} lockedTags={tags} />
          <button className="btn-primary mt-4 w-full" disabled={busy || !closeReady(close)} onClick={submitClose}>
            {busy ? 'Recording...' : 'Record the outcome'}
          </button>
        </Card>
      )}

      {trade.status !== 'open' && (
        <Card title="Journal" icon="🪶">
          <div className="space-y-3">
            <Field label="What went well?">
              <textarea className="input" rows={2} maxLength={2000} value={notes.good} onChange={(e) => setNotes({ ...notes, good: e.target.value })} />
            </Field>
            <Field label="What will you improve?">
              <textarea className="input" rows={2} maxLength={2000} value={notes.improve} onChange={(e) => setNotes({ ...notes, improve: e.target.value })} />
            </Field>
            <button className="btn-ghost w-full" onClick={() => patch({ notes_good: notes.good, notes_improve: notes.improve }, 'Notes saved.')}>
              Save notes
            </button>
            <ScreenshotInput value={trade.screenshot_url} onChange={(p) => patch({ screenshot_url: p }, p ? 'Screenshot saved.' : 'Screenshot removed.')} />
          </div>
        </Card>
      )}

      {trade.status === 'closed' && (
        <Card title="Spotted a mistake later?" icon="🔍">
          <p className="mb-3 text-sm text-muted">Admitting it earns +15 XP for honesty, and the trade will count as plan broken.</p>
          <MistakePicker value={lateTags} onChange={setLateTags} locked={tags} />
          {lateTags.length > 0 && (
            <button className="btn-ghost mt-3 w-full" onClick={() => patch({ add_mistakes: lateTags })}>
              Confess {lateTags.length} mistake{lateTags.length > 1 ? 's' : ''}
            </button>
          )}
        </Card>
      )}

      <Card title="XP for this trade" icon="✦">
        {events.length ? (
          <ul className="space-y-1 text-sm">
            {events.map((e, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-muted">{XP_REASON_LABELS[e.reason as XpReason] ?? e.reason}</span>
                <span className={e.amount >= 0 ? 'text-xp' : 'text-danger'}>
                  {e.amount > 0 ? '+' : ''}
                  {e.amount}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border pt-1 font-bold">
              <span>Total</span>
              <span>{trade.xp_awarded} XP</span>
            </li>
          </ul>
        ) : (
          <p className="text-sm text-muted">No XP recorded yet.</p>
        )}
      </Card>

      {trade.armor_report && <ArmorPanel report={trade.armor_report} title="Armor check at entry" />}

      <button className="btn-ghost w-full text-sm text-danger" onClick={remove}>
        Delete trade
      </button>
    </div>
  );
}
