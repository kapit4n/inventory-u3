import { useQuery } from '@tanstack/react-query';
import { listSalesCheckpoints } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const salesCheckpointsQueryKey = ['sales-checkpoints'] as const;

export const branchSalesCheckpointsQueryKey = (branchId: string) =>
  [...salesCheckpointsQueryKey, branchId] as const;

export function useSalesCheckpoints(branchId: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: branchSalesCheckpointsQueryKey(branchId),
    queryFn: () => listSalesCheckpoints(client, branchId),
    enabled: branchId.length > 0,
  });
}
