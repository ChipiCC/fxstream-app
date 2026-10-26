import { ButtonLink } from '@/components/ui/ButtonLink';
import { StatePanel } from '@/components/ui/StatePanel';

export function NotFoundPage() {
  return (
    <StatePanel
      title="Not found"
      description="The page you requested does not exist. The dashboard is still available."
      action={<ButtonLink to="/">Back to dashboard</ButtonLink>}
    />
  );
}
