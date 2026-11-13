import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProductPresentation } from '@inventory-u3/api-client';
import type { UpdateProductPresentationBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productPresentationsQueryKey } from '../queries/product-presentations-query.js';
import { productsQueryKey } from '../queries/products-query.js';

export function useUpdateProductPresentation(productId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      presentationId,
      body,
    }: {
      presentationId: string;
      body: UpdateProductPresentationBody;
    }) => updateProductPresentation(client, productId, presentationId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: productPresentationsQueryKey(productId) }),
        queryClient.invalidateQueries({ queryKey: productsQueryKey }),
      ]),
  });
}
