import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPurchase } from '@inventory-u3/api-client';
import type { CreatePurchaseBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { purchasesQueryKey } from '../queries/purchases-query.js';

export function useCreatePurchase() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreatePurchaseBody) => createPurchase(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchasesQueryKey }),
  });
}
