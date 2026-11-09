import { z } from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/index.js';

const employeeNameSchema = z.string().trim().min(1).max(160);

export const employeeSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  fullName: employeeNameSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const employeeListResponseSchema = z.object({
  items: z.array(employeeSchema),
});

export const createEmployeeSchema = z.object({
  branchId: uuidSchema,
  fullName: employeeNameSchema,
  isActive: z.boolean().optional(),
});

export const updateEmployeeSchema = z.object({
  branchId: uuidSchema,
  fullName: employeeNameSchema,
  isActive: z.boolean(),
});

export const employeeIdParamsSchema = z.object({
  employeeId: uuidSchema,
});

export type EmployeeResponse = z.infer<typeof employeeSchema>;
export type EmployeeListResponse = z.infer<typeof employeeListResponseSchema>;
export type CreateEmployeeBody = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeSchema>;
