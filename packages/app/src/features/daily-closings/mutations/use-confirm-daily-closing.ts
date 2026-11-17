import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmDailyClosing } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { dailyClosingsQueryKey } from '../queries/daily-closings-query.js';

export function useConfirmDailyClosing() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dailyClosingId: string) => confirmDailyClosing(client, dailyClosingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dailyClosingsQueryKey }),
  });
}
