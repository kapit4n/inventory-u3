import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupplier } from '@inventory-u3/api-client';
import type { CreateSupplierBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { suppliersQueryKey } from '../queries/suppliers-query.js';

export function useCreateSupplier() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateSupplierBody) => createSupplier(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suppliersQueryKey }),
  });
}
