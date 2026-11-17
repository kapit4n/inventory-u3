import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reopenDailyClosing } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { dailyClosingsQueryKey } from '../queries/daily-closings-query.js';

export function useReopenDailyClosing() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { dailyClosingId: string; reason: string }) =>
      reopenDailyClosing(client, input.dailyClosingId, { reason: input.reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dailyClosingsQueryKey }),
  });
}
