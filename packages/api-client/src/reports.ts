import { reportSchema, type ReportResponse } from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export interface ReportFilters {
  readonly from: string;
  readonly to: string;
  readonly granularity?: 'day' | 'week' | 'month';
  readonly branchId?: string;
}

export async function getReport(
  client: ApiClient,
  filters: ReportFilters,
): Promise<ReportResponse> {
  return client.get<ReportResponse>('/reports/summary', {
    query: {
      from: filters.from,
      to: filters.to,
      granularity: filters.granularity ?? 'day',
      branchId: filters.branchId,
    },
    schema: reportSchema,
  });
}
