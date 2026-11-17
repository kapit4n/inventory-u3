import { useQuery } from '@tanstack/react-query';
import { listDailyClosings } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const dailyClosingsQueryKey = ['daily-closings'] as const;

export const branchDailyClosingsQueryKey = (branchId: string, businessDate: string) =>
  [...dailyClosingsQueryKey, branchId, businessDate] as const;

export function useDailyClosings(branchId: string, businessDate: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: branchDailyClosingsQueryKey(branchId, businessDate),
    queryFn: () => listDailyClosings(client, { branchId, businessDate }),
    enabled: branchId.length > 0 && businessDate.length > 0,
  });
}
