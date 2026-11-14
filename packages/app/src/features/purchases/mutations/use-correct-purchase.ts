import { useMutation, useQueryClient } from '@tanstack/react-query';
import { correctPurchase } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { purchasesQueryKey } from '../queries/purchases-query.js';

export interface CorrectPurchaseInput {
  readonly purchaseId: string;
  readonly reason: string;
}

export function useCorrectPurchase() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseId, reason }: CorrectPurchaseInput) =>
      correctPurchase(client, purchaseId, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchasesQueryKey }),
  });
}
