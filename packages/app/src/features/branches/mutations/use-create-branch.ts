import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBranch } from '@inventory-u3/api-client';
import type { CreateBranchBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { branchesQueryKey } from '../queries/branches-query.js';

export function useCreateBranch() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateBranchBody) => createBranch(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: branchesQueryKey }),
  });
}
