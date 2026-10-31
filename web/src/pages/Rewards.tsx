import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { playSound } from '../lib/sound';
import { useStore } from '../store';
import { Card, Field, PageTitle, Spinner, errMsg, toast } from '../components/ui';

export default function Rewards() {
  const { refreshMe, refreshState } = useStore();
  const [shop, setShop] = useState<any | null>(null);
  const [ach, setAch] = useState<any[] | null>(null);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('100');

  const load = () => Promise.all([api('/shop').then(setShop), api('/progress').then((p) => setAch(p.achievements))]).catch((e) => toast(errMsg(e), 'bad'));
  useEffect(() => {
    load();
  }, []);

  async function act(fn: () => Promise<any>) {
    try {
      const r = await fn();
      if (r?.message) toast(r.message, 'ok');
      playSound('good');
      await Promise.all([load(), refreshMe(), refreshState()]);
    } catch (e) {
      toast(errMsg(e), 'bad');
    }
  }

  if (!shop || !ach) return <Spinner />;
  const owned = new Set<string>(shop.owned);

  return (
    <div className="space-y-4">
      <PageTitle icon="🏅" title="Rewards" subtitle="Gold comes only from discipline. Spend it on cosmetics or real-life treats you choose." />
      <div className="card flex items-center justify-between">
        <span className="text-sm text-muted">Your purse</span>
        <span className="font-display text-2xl font-bold text-gold">● {shop.gold}</span>
      </div>

      <Card title={`Achievements (${ach.filter((a) => a.unlocked).length}/${ach.length})`} icon="🏆">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ach.map((a) => (
            <div key={a.id} className={`rounded-xl p-3 text-center ${a.unlocked ? 'bg-gold/10 ring-1 ring-gold/40' : 'bg-surface2 opacity-60'}`}>
              <div className={`text-3xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</div>
              <div className="text-sm font-semibold">{a.name}</div>
              <div className="text-[11px] text-muted">{a.description}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Real-life rewards" icon="🎁">
        <p className="mb-3 text-xs text-muted">Promise yourself something (a nice dinner, a new book) and buy it with discipline gold.</p>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Field label="Reward">
            <input className="input" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Coffee at my favourite cafe" />
          </Field>
          <Field label="Gold cost">
            <input className="input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        </div>
        <button className="btn-ghost mt-2 w-full" disabled={!title.trim()} onClick={() => act(async () => { await api('/rewards', { method: 'POST', body: { title, cost } }); setTitle(''); })}>
          Add reward
        </button>
        <ul className="mt-3 space-y-2">
          {shop.rewards.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface2 p-3 text-sm">
              <span className={r.redeemed_at ? 'line-through opacity-60' : ''}>{r.title}</span>
              <span className="flex shrink-0 items-center gap-2">
                {r.redeemed_at ? (
                  <span className="text-xs text-ok">Redeemed</span>
                ) : (
                  <button className="btn-primary px-3 py-1.5 text-xs" disabled={shop.gold < r.cost} onClick={() => act(() => api(`/rewards/${r.id}/redeem`, { method: 'POST' }))}>
                    ● {r.cost}
                  </button>
                )}
                <button className="text-xs text-muted" aria-label="Delete reward" onClick={() => act(() => api(`/rewards/${r.id}`, { method: 'DELETE' }))}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Gold shop (cosmetics only)" icon="🛒">
        <ul className="space-y-2">
          {shop.items.map((i: any) => {
            const has = owned.has(i.id);
            const equipped = (i.kind === 'title' || i.kind === 'frame') && shop.equipped?.[i.kind] === i.value;
            return (
              <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface2 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {i.kind === 'avatar' ? `${i.value} ` : ''}
                    {i.name}
                  </div>
                  <div className="text-xs text-muted">{i.description}</div>
                </div>
                {!has ? (
                  <button className="btn-primary shrink-0 px-3 py-1.5 text-xs" disabled={shop.gold < i.price} onClick={() => act(() => api('/shop/buy', { method: 'POST', body: { item_id: i.id } }))}>
                    ● {i.price}
                  </button>
                ) : i.kind === 'avatar' ? (
                  <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={() => act(() => api('/profile', { method: 'PATCH', body: { avatar: i.value } }))}>
                    Use
                  </button>
                ) : (
                  <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs" onClick={() => act(() => api('/shop/equip', { method: 'POST', body: { kind: i.kind, item_id: equipped ? null : i.id } }))}>
                    {equipped ? 'Unequip' : 'Equip'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
