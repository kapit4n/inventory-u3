import { useQuery } from '@tanstack/react-query';
import { listProductPrices } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export function productPricesQueryKey(productId: string) {
  return ['product-prices', productId] as const;
}

export function useProductPrices(productId: string, enabled = true) {
  const client = useApiClient();

  return useQuery({
    queryKey: productPricesQueryKey(productId),
    queryFn: () => listProductPrices(client, productId),
    enabled,
  });
}
