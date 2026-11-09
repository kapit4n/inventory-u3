/**
 * Typed branch resource functions.
 *
 * They stay outside React so the application and tests share the same contract
 * and response validation.
 */

import {
  branchListResponseSchema,
  branchSchema,
  type BranchListResponse,
  type BranchResponse,
  type CreateBranchBody,
  type UpdateBranchBody,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listBranches(client: ApiClient): Promise<readonly BranchResponse[]> {
  const response = await client.get<BranchListResponse>('/branches', {
    schema: branchListResponseSchema,
  });
  return response.items;
}

export async function createBranch(
  client: ApiClient,
  body: CreateBranchBody,
): Promise<BranchResponse> {
  return client.post<BranchResponse, CreateBranchBody>('/branches', body, { schema: branchSchema });
}

export async function updateBranch(
  client: ApiClient,
  branchId: string,
  body: UpdateBranchBody,
): Promise<BranchResponse> {
  return client.put<BranchResponse, UpdateBranchBody>(
    `/branches/${encodeURIComponent(branchId)}`,
    body,
    { schema: branchSchema },
  );
}
