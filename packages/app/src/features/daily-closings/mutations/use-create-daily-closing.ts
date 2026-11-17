import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDailyClosing } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { dailyClosingsQueryKey } from '../queries/daily-closings-query.js';

export function useCreateDailyClosing() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { branchId: string; businessDate: string }) =>
      createDailyClosing(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dailyClosingsQueryKey }),
  });
}
