import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProduct } from '@inventory-u3/api-client';
import type { UpdateProductBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productsQueryKey } from '../queries/products-query.js';

export function useUpdateProduct() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: UpdateProductBody }) =>
      updateProduct(client, productId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsQueryKey }),
  });
}
