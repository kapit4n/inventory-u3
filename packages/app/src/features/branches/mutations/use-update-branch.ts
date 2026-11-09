import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBranch } from '@inventory-u3/api-client';
import type { UpdateBranchBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { branchesQueryKey } from '../queries/branches-query.js';

export function useUpdateBranch() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, body }: { branchId: string; body: UpdateBranchBody }) =>
      updateBranch(client, branchId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: branchesQueryKey }),
  });
}
