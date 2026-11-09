import { z } from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/index.js';

const branchNameSchema = z.string().trim().min(1).max(120);

export const branchSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: branchNameSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const branchListResponseSchema = z.object({
  items: z.array(branchSchema),
});

export const createBranchSchema = z.object({
  name: branchNameSchema,
  isActive: z.boolean().optional(),
});

export const updateBranchSchema = z.object({
  name: branchNameSchema,
  isActive: z.boolean(),
});

export const branchIdParamsSchema = z.object({
  branchId: uuidSchema,
});

export type BranchResponse = z.infer<typeof branchSchema>;
export type BranchListResponse = z.infer<typeof branchListResponseSchema>;
export type CreateBranchBody = z.infer<typeof createBranchSchema>;
export type UpdateBranchBody = z.infer<typeof updateBranchSchema>;
