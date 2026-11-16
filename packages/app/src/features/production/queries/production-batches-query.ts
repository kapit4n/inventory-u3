import { useQuery } from '@tanstack/react-query';
import { listProductionBatches } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const productionBatchesQueryKey = ['production-batches'] as const;

export const branchProductionBatchesQueryKey = (branchId: string) =>
  [...productionBatchesQueryKey, branchId] as const;

export function useProductionBatches(branchId: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: branchProductionBatchesQueryKey(branchId),
    queryFn: () => listProductionBatches(client, branchId),
    enabled: branchId.length > 0,
  });
}
