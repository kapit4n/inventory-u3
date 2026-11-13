import { useQuery } from '@tanstack/react-query';
import { listProductPresentations } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export function productPresentationsQueryKey(productId: string) {
  return ['product-presentations', productId] as const;
}

export function useProductPresentations(productId: string, enabled = true) {
  const client = useApiClient();

  return useQuery({
    queryKey: productPresentationsQueryKey(productId),
    queryFn: () => listProductPresentations(client, productId),
    enabled,
  });
}
