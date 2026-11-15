import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordInventoryWaste } from '@inventory-u3/api-client';
import type { InventoryWasteBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { inventoryQueryKey } from '../queries/stock-balances-query.js';

export function useRecordInventoryWaste() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: InventoryWasteBody) => recordInventoryWaste(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKey }),
  });
}
