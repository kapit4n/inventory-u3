import {
  dailyClosingListResponseSchema,
  dailyClosingSchema,
  type CreateDailyClosingBody,
  type DailyClosingListResponse,
  type DailyClosingResponse,
  type ReopenDailyClosingBody,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listDailyClosings(
  client: ApiClient,
  filters: { readonly branchId?: string; readonly businessDate?: string } = {},
): Promise<readonly DailyClosingResponse[]> {
  const response = await client.get<DailyClosingListResponse>('/daily-closings', {
    query: { branchId: filters.branchId, businessDate: filters.businessDate },
    schema: dailyClosingListResponseSchema,
  });
  return response.items;
}

export async function getDailyClosing(
  client: ApiClient,
  dailyClosingId: string,
): Promise<DailyClosingResponse> {
  return client.get<DailyClosingResponse>(`/daily-closings/${encodeURIComponent(dailyClosingId)}`, {
    schema: dailyClosingSchema,
  });
}

export async function createDailyClosing(
  client: ApiClient,
  body: CreateDailyClosingBody,
): Promise<DailyClosingResponse> {
  return client.post<DailyClosingResponse, CreateDailyClosingBody>('/daily-closings', body, {
    schema: dailyClosingSchema,
  });
}

export async function reviewDailyClosing(
  client: ApiClient,
  dailyClosingId: string,
): Promise<DailyClosingResponse> {
  return client.post<DailyClosingResponse, Record<string, never>>(
    `/daily-closings/${encodeURIComponent(dailyClosingId)}/review`,
    {},
    { schema: dailyClosingSchema },
  );
}

export async function confirmDailyClosing(
  client: ApiClient,
  dailyClosingId: string,
): Promise<DailyClosingResponse> {
  return client.post<DailyClosingResponse, Record<string, never>>(
    `/daily-closings/${encodeURIComponent(dailyClosingId)}/confirm`,
    {},
    { schema: dailyClosingSchema },
  );
}

export async function reopenDailyClosing(
  client: ApiClient,
  dailyClosingId: string,
  body: ReopenDailyClosingBody,
): Promise<DailyClosingResponse> {
  return client.post<DailyClosingResponse, ReopenDailyClosingBody>(
    `/daily-closings/${encodeURIComponent(dailyClosingId)}/reopen`,
    body,
    { schema: dailyClosingSchema },
  );
}
