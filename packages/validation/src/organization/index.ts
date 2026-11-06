import { z } from 'zod';

import { currencyCodeSchema, timeZoneSchema } from '../common/index.js';

export const updateOrganizationSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  timezone: timeZoneSchema,
  currency: currencyCodeSchema,
});

export type UpdateOrganizationSettingsBody = z.infer<typeof updateOrganizationSettingsSchema>;
