import { z } from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/index.js';

const supplierNameSchema = z.string().trim().min(1).max(160);

export const supplierSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: supplierNameSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const supplierListResponseSchema = z.object({
  items: z.array(supplierSchema),
});

export const createSupplierSchema = z.object({
  name: supplierNameSchema,
  isActive: z.boolean().optional(),
});

export const updateSupplierSchema = z.object({
  name: supplierNameSchema,
  isActive: z.boolean(),
});

export const supplierIdParamsSchema = z.object({
  supplierId: uuidSchema,
});

export type SupplierResponse = z.infer<typeof supplierSchema>;
export type SupplierListResponse = z.infer<typeof supplierListResponseSchema>;
export type CreateSupplierBody = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierBody = z.infer<typeof updateSupplierSchema>;
