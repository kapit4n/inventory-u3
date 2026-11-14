import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProductPrice } from '@inventory-u3/api-client';
import type { CreateProductPriceHistoryBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productPricesQueryKey } from '../queries/product-prices-query.js';

export function useCreateProductPrice(productId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductPriceHistoryBody) =>
      createProductPrice(client, productId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productPricesQueryKey(productId) }),
  });
}
