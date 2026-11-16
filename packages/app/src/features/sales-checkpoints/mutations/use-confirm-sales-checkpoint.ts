import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmSalesCheckpoint } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { salesCheckpointsQueryKey } from '../queries/sales-checkpoints-query.js';

export function useConfirmSalesCheckpoint() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (checkpointId: string) => confirmSalesCheckpoint(client, checkpointId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesCheckpointsQueryKey }),
  });
}
