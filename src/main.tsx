import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { appConfig } from '@/app/config';
import '@/styles/index.css';

async function enableMocking(): Promise<void> {
  if (!appConfig.useMockApi) {
    return;
  }

  const { worker } = await import('@/test/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

async function bootstrap(): Promise<void> {
  try {
    await enableMocking();
  } catch (error) {
    console.error('Failed to start the mock API worker', error);
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
