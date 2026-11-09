import { useQuery } from '@tanstack/react-query';
import { listEmployees } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const employeesQueryKey = ['employees'] as const;

export function useEmployees() {
  const client = useApiClient();

  return useQuery({
    queryKey: employeesQueryKey,
    queryFn: () => listEmployees(client),
  });
}
