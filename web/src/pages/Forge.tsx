import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { theme } from '../theme/config';
import { Card, PageTitle } from '../components/ui';
import { EMPTY_FORGE, ForgeCalc, type ForgeValues } from '../components/ForgeCalc';

export default function Forge() {
  const { state } = useStore();
  const [v, setV] = useState<ForgeValues>({ ...EMPTY_FORGE, risk_percent: state?.maxRisk ?? '1' });
  return (
    <div className="space-y-4">
      <PageTitle icon="⚒️" title={theme.labels.forge} subtitle="Size every position with math, not feelings. Lots are always rounded DOWN so you never risk more than planned." />
      <Card>
        <ForgeCalc value={v} onChange={setV} balance={state?.balance ?? '0'} hpRemaining={state?.daily.remaining} showLotInput={false} />
      </Card>
      <Card title="How it works" icon="📐">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Risk $ = balance × risk %.</li>
          <li>Lots = risk $ ÷ (stop distance in pips × $ per pip per lot).</li>
          <li>Forex majors: 1 pip = 0.0001 and about $10 per pip per standard lot.</li>
          <li>Gold (XAUUSD): $0.10 move = $10 per lot on most brokers.</li>
          <li>Indices differ a lot between brokers. Check your broker's contract specs and edit $ per point.</li>
        </ul>
        <Link to="/battle" className="btn-primary mt-4 w-full">
          Take this to the Battle Station
        </Link>
      </Card>
    </div>
  );
}
