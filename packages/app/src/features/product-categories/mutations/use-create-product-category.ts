import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProductCategory } from '@inventory-u3/api-client';
import type { CreateProductCategoryBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { productCategoriesQueryKey } from '../queries/product-categories-query.js';

export function useCreateProductCategory() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProductCategoryBody) => createProductCategory(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productCategoriesQueryKey }),
  });
}
