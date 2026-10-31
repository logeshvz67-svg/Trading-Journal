import { Link } from 'react-router-dom';
import { COPY } from '@shared/copy';
import { Card, PageTitle } from '../components/ui';

export default function Disclaimer() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-0 py-2">
      <PageTitle icon="⚖️" title="Disclaimer" />
      <Card>
        <div className="space-y-3 text-sm">
          <p className="font-semibold">{COPY.disclaimer}</p>
          <p>Market Quest helps you plan, size, journal and review your own trades. It never gives buy or sell signals, price predictions, or recommendations about any instrument.</p>
          <p>Trading forex, metals, indices and CFDs carries a high risk of losing money, especially with leverage. Past results, including your own journal statistics, do not guarantee future results.</p>
          <p>Calculations (position size, pip values, drawdown) are estimates. Brokers and prop firms use their own contract specs, fees and rule definitions. Always confirm against your broker and your firm's official rules.</p>
          <p>XP, gold and levels reward process and discipline only. They are not a measure of trading skill or profitability.</p>
        </div>
      </Card>
      <Link to="/" className="btn-ghost w-full">
        Back
      </Link>
    </div>
  );
}
