import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewDailyClosing } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';
import { dailyClosingsQueryKey } from '../queries/daily-closings-query.js';

export function useReviewDailyClosing() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dailyClosingId: string) => reviewDailyClosing(client, dailyClosingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dailyClosingsQueryKey }),
  });
}
