import { useQuery } from '@tanstack/react-query';
import { listProductCategories } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const productCategoriesQueryKey = ['product-categories'] as const;

export function useProductCategories() {
  const client = useApiClient();

  return useQuery({
    queryKey: productCategoriesQueryKey,
    queryFn: () => listProductCategories(client),
  });
}
