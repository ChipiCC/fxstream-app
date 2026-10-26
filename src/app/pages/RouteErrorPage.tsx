import { isRouteErrorResponse, useRouteError } from 'react-router';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { StatePanel } from '@/components/ui/StatePanel';

export function RouteErrorPage() {
  const error = useRouteError();
  const description = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred while rendering this page.';

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <StatePanel
        tone="error"
        title="The dashboard hit an error"
        description={description}
        action={<ButtonLink to="/">Reload the dashboard</ButtonLink>}
      />
    </div>
  );
}
