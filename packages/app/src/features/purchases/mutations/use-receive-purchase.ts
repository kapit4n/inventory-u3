import { useMutation, useQueryClient } from '@tanstack/react-query';
import { receivePurchase } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { purchasesQueryKey } from '../queries/purchases-query.js';

export function useReceivePurchase() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseId: string) => receivePurchase(client, purchaseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchasesQueryKey }),
  });
}
