import { useMutation } from '@tanstack/react-query';

import { createQuote } from '@/lib/api/client';

export function useCreateQuote() {
  return useMutation({
    mutationFn: createQuote,
  });
}
