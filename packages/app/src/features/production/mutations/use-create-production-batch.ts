import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProductionBatch } from '@inventory-u3/api-client';
import type { CreateProductionBatchBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productionBatchesQueryKey } from '../queries/production-batches-query.js';

export function useCreateProductionBatch() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductionBatchBody) => createProductionBatch(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productionBatchesQueryKey }),
  });
}
