import { useParams } from 'react-router';

import { isConfiguredSymbol } from '@/app/config';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { StatePanel } from '@/components/ui/StatePanel';

import { DashboardView } from './DashboardView';

export function PairPage() {
  const { base = '', quote = '' } = useParams();
  const symbol = `${base.toUpperCase()}/${quote.toUpperCase()}`;

  if (!base || !quote || !isConfiguredSymbol(symbol)) {
    return (
      <StatePanel
        title="Unknown pair"
        description={`${symbol || 'That pair'} is not in the configured symbol list. Choose a supported pair from the dashboard.`}
        action={<ButtonLink to="/">Back to dashboard</ButtonLink>}
      />
    );
  }

  return <DashboardView selectedSymbol={symbol} />;
}
