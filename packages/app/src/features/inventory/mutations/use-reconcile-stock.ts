import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reconcileStock } from '@inventory-u3/api-client';
import type { StockReconciliationBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { inventoryQueryKey } from '../queries/stock-balances-query.js';

export function useReconcileStock() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: StockReconciliationBody) => reconcileStock(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKey }),
  });
}
