import { useMutation, useQueryClient } from '@tanstack/react-query';
import { correctProductionBatch } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productionBatchesQueryKey } from '../queries/production-batches-query.js';

export interface CorrectProductionBatchInput {
  readonly batchId: string;
  readonly reason: string;
}

export function useCorrectProductionBatch() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId, reason }: CorrectProductionBatchInput) =>
      correctProductionBatch(client, batchId, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productionBatchesQueryKey }),
  });
}
