import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSupplier } from '@inventory-u3/api-client';
import type { UpdateSupplierBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { suppliersQueryKey } from '../queries/suppliers-query.js';

export function useUpdateSupplier() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ supplierId, body }: { supplierId: string; body: UpdateSupplierBody }) =>
      updateSupplier(client, supplierId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suppliersQueryKey }),
  });
}
