import { useMutation, useQueryClient } from '@tanstack/react-query';
import { correctSalesCheckpoint } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { salesCheckpointsQueryKey } from '../queries/sales-checkpoints-query.js';

export interface CorrectSalesCheckpointInput {
  readonly checkpointId: string;
  readonly reason: string;
}

export function useCorrectSalesCheckpoint() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ checkpointId, reason }: CorrectSalesCheckpointInput) =>
      correctSalesCheckpoint(client, checkpointId, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesCheckpointsQueryKey }),
  });
}
