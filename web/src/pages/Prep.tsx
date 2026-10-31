import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MOODS, type Mood } from '@shared/constants';
import { focusScore, focusVerdict } from '@shared/prep';
import { api } from '../lib/api';
import { playSound } from '../lib/sound';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { Banner, Card, Chips, Field, Meter, PageTitle, Toggle, errMsg, toast } from '../components/ui';

export default function Prep() {
  const { state, me, refreshState, refreshMe } = useStore();
  const nav = useNavigate();
  const s = state?.session;
  const account = me?.account;
  const [mood, setMood] = useState<Mood | ''>(s?.mood ?? '');
  const [sleepOk, setSleepOk] = useState<boolean>(s?.sleep_ok ?? true);
  const [distractions, setDistractions] = useState<boolean>(s?.distractions ?? false);
  const [newsChecked, setNewsChecked] = useState<boolean>(s?.news_checked ?? false);
  const [newsNotes, setNewsNotes] = useState<string>(s?.news_notes ?? '');
  const [pairs, setPairs] = useState<string>((s?.plan_pairs ?? []).join(', '));
  const [levels, setLevels] = useState<string>(s?.key_levels ?? '');
  const [maxTrades, setMaxTrades] = useState<string>(String(s?.max_trades ?? account?.max_trades_per_day ?? 3));
  const [maxRisk, setMaxRisk] = useState<string>(String(s?.max_risk ?? account?.max_risk_percent ?? 1));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ focus: number; verdict: string } | null>(null);

  const preview = mood ? focusScore({ mood, sleepOk, distractions, newsChecked }) : null;

  async function save() {
    if (!mood) return toast('Pick your mood first.', 'bad');
    setBusy(true);
    try {
      const r = await api('/sessions', {
        method: 'POST',
        body: {
          mood,
          sleep_ok: sleepOk,
          distractions,
          news_checked: newsChecked,
          news_notes: newsNotes,
          plan_pairs: pairs.split(/[,\s]+/).filter(Boolean),
          key_levels: levels,
          max_trades: maxTrades,
          max_risk: maxRisk,
        },
      });
      await Promise.all([refreshState(), refreshMe()]);
      setResult({ focus: r.focus, verdict: r.verdict });
      if (r.xp.delta) {
        toast(`Prep complete. +${r.xp.delta} XP`, 'ok');
        playSound('good');
      } else toast('Prep updated.', 'ok');
    } catch (e) {
      toast(errMsg(e), 'bad');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle icon="🌅" title={theme.labels.prep} subtitle="A warrior who prepares wins more battles against themselves." />

      <Card title="How do you feel right now?" icon="🧠">
        <Chips options={MOODS} value={mood} onChange={setMood} render={(m) => `${theme.moods[m].emoji} ${theme.moods[m].label}`} />
      </Card>

      <Card title="Body & battlefield" icon="🛌">
        <div className="space-y-2">
          <Toggle checked={sleepOk} onChange={setSleepOk} label="I slept enough (about 7h+)" />
          <Toggle checked={distractions} onChange={setDistractions} label="I'm distracted (noise, work, phone, worries)" />
          <Toggle checked={newsChecked} onChange={setNewsChecked} label="I checked today's high-impact news" />
          {newsChecked && <input className="input" placeholder="e.g. USD CPI 8:30 New York time" value={newsNotes} onChange={(e) => setNewsNotes(e.target.value)} maxLength={500} />}
          {account?.news_rule && <p className="text-xs text-muted">Firm news rule: {account.news_rule}</p>}
        </div>
      </Card>

      <Card title="Battle plan" icon="🗺️">
        <div className="space-y-3">
          <Field label="Pairs I'll watch" hint="Fewer is better. 1-3 pairs.">
            <input className="input uppercase" value={pairs} onChange={(e) => setPairs(e.target.value)} placeholder="EURUSD, XAUUSD" />
          </Field>
          <Field label="Key levels (support, resistance, trendlines)">
            <textarea className="input" rows={3} value={levels} onChange={(e) => setLevels(e.target.value)} placeholder="EURUSD support 1.0820, resistance 1.0900, rising trendline from Monday low" maxLength={1000} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max trades today" hint={`Account rule: ${account?.max_trades_per_day}`}>
              <input className="input" inputMode="numeric" value={maxTrades} onChange={(e) => setMaxTrades(e.target.value)} />
            </Field>
            <Field label="Max risk per trade %" hint={`Account rule: ${account?.max_risk_percent}%`}>
              <input className="input" inputMode="decimal" value={maxRisk} onChange={(e) => setMaxRisk(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      {preview !== null && (
        <Card>
          <Meter label={`🧠 ${theme.labels.focus}`} color="focus" remainingPct={preview} valueText={`${preview}/100`} />
          {focusVerdict(preview) === 'campfire' && (
            <div className="mt-3">
              <Banner tone="warn">Your focus is low. The Campfire might serve you better than the charts today.</Banner>
            </div>
          )}
        </Card>
      )}

      {result ? (
        <div className="space-y-2">
          {result.verdict === 'campfire' ? (
            <>
              <Banner tone="warn">Focus {result.focus}/100. Consider resting at the Campfire instead of trading. If you do trade, go half size.</Banner>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/campfire" className="btn-primary">
                  🔥 Campfire
                </Link>
                <button className="btn-ghost" onClick={() => nav('/battle')}>
                  Trade anyway
                </button>
              </div>
            </>
          ) : (
            <button className="btn-primary w-full" onClick={() => nav('/battle')}>
              ⚔️ To the Battle Station
            </button>
          )}
        </div>
      ) : (
        <button className="btn-primary w-full" disabled={busy || !mood} onClick={save}>
          {busy ? 'Saving...' : s ? 'Update prep' : 'Complete prep (+10 XP)'}
        </button>
      )}
    </div>
  );
}
