import { useQuery } from '@tanstack/react-query';
import { getReport, type ReportFilters } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const reportQueryKey = (filters: ReportFilters) =>
  [
    'report',
    filters.from,
    filters.to,
    filters.granularity ?? 'day',
    filters.branchId ?? 'all',
  ] as const;

export function useReport(filters: ReportFilters, enabled = true) {
  const client = useApiClient();

  return useQuery({
    queryKey: reportQueryKey(filters),
    queryFn: () => getReport(client, filters),
    enabled:
      enabled && filters.from.length > 0 && filters.to.length > 0 && filters.from <= filters.to,
  });
}
