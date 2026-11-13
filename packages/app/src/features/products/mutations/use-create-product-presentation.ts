import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProductPresentation } from '@inventory-u3/api-client';
import type { CreateProductPresentationBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productPresentationsQueryKey } from '../queries/product-presentations-query.js';
import { productsQueryKey } from '../queries/products-query.js';

export function useCreateProductPresentation(productId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductPresentationBody) =>
      createProductPresentation(client, productId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: productPresentationsQueryKey(productId) }),
        queryClient.invalidateQueries({ queryKey: productsQueryKey }),
      ]),
  });
}
