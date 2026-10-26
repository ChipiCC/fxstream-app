import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RatesSocketProvider } from '@/features/rates/RatesSocketProvider';

import { AppRouter } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5_000,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RatesSocketProvider>
        <AppRouter />
      </RatesSocketProvider>
    </QueryClientProvider>
  );
}
