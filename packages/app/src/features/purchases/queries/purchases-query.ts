import { useQuery } from '@tanstack/react-query';
import { listPurchases } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const purchasesQueryKey = ['purchases'] as const;

export function usePurchases() {
  const client = useApiClient();

  return useQuery({
    queryKey: purchasesQueryKey,
    queryFn: () => listPurchases(client),
  });
}
