import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { appConfig } from '@/app/config';
import { queryKeys } from '@/lib/api/queryKeys';
import { RatesSocketClient } from '@/lib/ws/client';

import { useLiveRatesStore } from '../store';

export function useRatesSocket(symbols: string[]): void {
  const queryClient = useQueryClient();
  const clientRef = useRef<RatesSocketClient | null>(null);
  const symbolsRef = useRef(symbols);

  useEffect(() => {
    const client = new RatesSocketClient({
      url: appConfig.wsUrl,
      reconnect: appConfig.reconnect,
      onTick: (tick) => {
        useLiveRatesStore.getState().receiveTicks([tick]);
      },
      onStateChange: (state) => {
        useLiveRatesStore.getState().setConnectionState(state);
      },
      onOpen: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.ratesRoot });
        void queryClient.invalidateQueries({ queryKey: queryKeys.candlesRoot });
        void queryClient.invalidateQueries({ queryKey: queryKeys.providers });
      },
      onProtocolError: (failure) => {
        if (import.meta.env.DEV) {
          console.warn('Ignored WebSocket message', failure.reason, failure.raw);
        }
      },
    });

    clientRef.current = client;
    client.setSymbols(symbolsRef.current);
    client.connect();

    return () => {
      clientRef.current = null;
      client.disconnect();
    };
  }, [queryClient]);

  useEffect(() => {
    symbolsRef.current = symbols;
    clientRef.current?.setSymbols(symbols);
  }, [symbols]);
}
