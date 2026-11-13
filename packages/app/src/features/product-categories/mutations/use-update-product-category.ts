import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProductCategory } from '@inventory-u3/api-client';
import type { UpdateProductCategoryBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productCategoriesQueryKey } from '../queries/product-categories-query.js';

export function useUpdateProductCategory() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productCategoryId,
      body,
    }: {
      productCategoryId: string;
      body: UpdateProductCategoryBody;
    }) => updateProductCategory(client, productCategoryId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey }),
  });
}
