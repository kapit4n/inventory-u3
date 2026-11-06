/**
 * Authentication wire schemas.
 *
 * `loginSchema` is the only thing a caller sends: an email and a password. The
 * password is not trimmed and not length-capped beyond a sane maximum — a
 * person's password may contain spaces.
 */

import { z } from 'zod';

import { emailSchema } from '../common/index.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(1024),
});

export type LoginBody = z.infer<typeof loginSchema>;

/**
 * The development-only "sign in as" request (ADR 0030).
 */
export const devLoginSchema = z.object({
  userId: z.uuid(),
});

export type DevLoginBody = z.infer<typeof devLoginSchema>;

/**
 * The authenticated caller, as returned to a client.
 *
 * No password hash, ever: the shape a route sends is this one, and it has no
 * field the hash could hide in.
 */
export const authenticatedUserSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(['ADMINISTRATOR', 'MANAGER', 'STAFF']),
  isActive: z.boolean(),
  lastLoginAt: z.string().optional(),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: authenticatedUserSchema,
});

export const sessionResponseSchema = z.object({
  user: authenticatedUserSchema,
  expiresAt: z.string().nullable(),
});
