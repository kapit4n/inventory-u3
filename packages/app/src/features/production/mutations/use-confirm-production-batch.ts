import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmProductionBatch } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productionBatchesQueryKey } from '../queries/production-batches-query.js';

export function useConfirmProductionBatch() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: string) => confirmProductionBatch(client, batchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productionBatchesQueryKey }),
  });
}
