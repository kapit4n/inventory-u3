import { useQuery } from '@tanstack/react-query';
import { listProducts } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const productsQueryKey = ['products'] as const;

export function useProducts() {
  const client = useApiClient();

  return useQuery({
    queryKey: productsQueryKey,
    queryFn: () => listProducts(client),
  });
}
