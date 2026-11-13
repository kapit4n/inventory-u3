import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '@inventory-u3/api-client';
import type { CreateProductBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productsQueryKey } from '../queries/products-query.js';

export function useCreateProduct() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductBody) => createProduct(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsQueryKey }),
  });
}
