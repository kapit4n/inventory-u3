import { useQuery } from '@tanstack/react-query';
import { listBranches } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const branchesQueryKey = ['branches'] as const;

export function useBranches() {
  const client = useApiClient();

  return useQuery({
    queryKey: branchesQueryKey,
    queryFn: () => listBranches(client),
  });
}
