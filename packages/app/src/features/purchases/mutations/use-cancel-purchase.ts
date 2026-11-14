import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelPurchase } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { purchasesQueryKey } from '../queries/purchases-query.js';

export function useCancelPurchase() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseId: string) => cancelPurchase(client, purchaseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchasesQueryKey }),
  });
}
