import { useQuery } from '@tanstack/react-query';
import { listStockBalances } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const inventoryQueryKey = ['inventory'] as const;

export const stockBalancesQueryKey = (branchId: string) =>
  [...inventoryQueryKey, 'balances', branchId] as const;

export function useStockBalances(branchId: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: stockBalancesQueryKey(branchId),
    queryFn: () => listStockBalances(client, branchId),
    enabled: branchId.length > 0,
  });
}
