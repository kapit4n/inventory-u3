import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSalesCheckpoint } from '@inventory-u3/api-client';
import type { CreateSalesCheckpointBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { salesCheckpointsQueryKey } from '../queries/sales-checkpoints-query.js';

export function useCreateSalesCheckpoint() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateSalesCheckpointBody) => createSalesCheckpoint(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesCheckpointsQueryKey }),
  });
}
