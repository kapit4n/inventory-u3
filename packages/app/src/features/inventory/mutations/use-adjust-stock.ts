import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustStock } from '@inventory-u3/api-client';
import type { StockAdjustmentBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { inventoryQueryKey } from '../queries/stock-balances-query.js';

export function useAdjustStock() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: StockAdjustmentBody) => adjustStock(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKey }),
  });
}
