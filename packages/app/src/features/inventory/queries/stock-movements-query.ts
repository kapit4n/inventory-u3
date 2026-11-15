import { useQuery } from '@tanstack/react-query';
import { listStockMovements } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { inventoryQueryKey } from './stock-balances-query.js';

export const stockMovementsQueryKey = (branchId: string, productId: string) =>
  [...inventoryQueryKey, 'movements', branchId, productId] as const;

export function useStockMovements(branchId: string, productId: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: stockMovementsQueryKey(branchId, productId),
    queryFn: () => listStockMovements(client, productId, branchId),
    enabled: branchId.length > 0 && productId.length > 0,
  });
}
