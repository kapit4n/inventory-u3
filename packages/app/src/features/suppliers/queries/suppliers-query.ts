import { useQuery } from '@tanstack/react-query';
import { listSuppliers } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const suppliersQueryKey = ['suppliers'] as const;

export function useSuppliers() {
  const client = useApiClient();

  return useQuery({
    queryKey: suppliersQueryKey,
    queryFn: () => listSuppliers(client),
  });
}
