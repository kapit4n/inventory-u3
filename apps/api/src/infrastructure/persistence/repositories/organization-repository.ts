/**
 * Organization persistence, on PostgreSQL.
 *
 * The organization row is the tenant. Its timezone and currency are the
 * defaults every future inventory document reads.
 */

import { asc, eq } from 'drizzle-orm';

import { organizations } from '@inventory-u3/database/schema';
import type {
  Organization,
  OrganizationRepository,
  OrganizationSettingsUpdate,
} from '@inventory-u3/domain';
import { asOrganizationId, type OrganizationId } from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type OrganizationRow = typeof organizations.$inferSelect;

export class DrizzleOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(organizationId: OrganizationId): Promise<Organization | undefined> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return row ? toOrganization(row) : undefined;
  }

  async updateSettings(
    organizationId: OrganizationId,
    settings: OrganizationSettingsUpdate,
  ): Promise<Organization | undefined> {
    const [row] = await this.db
      .update(organizations)
      .set({
        name: settings.name,
        timezone: settings.timezone,
        currency: settings.currency,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    return row ? toOrganization(row) : undefined;
  }

  async getDefault(): Promise<Organization | undefined> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.isActive, true))
      .orderBy(asc(organizations.id))
      .limit(1);

    return row ? toOrganization(row) : undefined;
  }
}

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: asOrganizationId(row.id),
    name: row.name,
    timezone: row.timezone,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
