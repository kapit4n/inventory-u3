/**
 * Measurement-unit persistence, on SQLite — the twin of
 * `repositories/measurement-unit-repository.ts`.
 */

import { and, asc, eq } from 'drizzle-orm';

import { measurementUnits } from '@inventory-u3/database/schema/sqlite';
import type { MeasurementUnit, MeasurementUnitRepository } from '@inventory-u3/domain';
import {
  asMeasurementUnitId,
  asOrganizationId,
  type IsoDateTime,
  type MeasurementUnitId,
  type OrganizationId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type MeasurementUnitRow = typeof measurementUnits.$inferSelect;

export class SQLiteMeasurementUnitRepository implements MeasurementUnitRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(
    organizationId: OrganizationId,
    measurementUnitId: MeasurementUnitId,
  ): Promise<MeasurementUnit | undefined> {
    const [row] = await this.db
      .select()
      .from(measurementUnits)
      .where(
        and(
          eq(measurementUnits.organizationId, organizationId),
          eq(measurementUnits.id, measurementUnitId),
        ),
      )
      .limit(1);

    return row ? toMeasurementUnit(row) : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly MeasurementUnit[]> {
    const rows = await this.db
      .select()
      .from(measurementUnits)
      .where(eq(measurementUnits.organizationId, organizationId))
      .orderBy(asc(measurementUnits.code), asc(measurementUnits.id));

    return rows.map(toMeasurementUnit);
  }

  async create(measurementUnit: MeasurementUnit): Promise<MeasurementUnit> {
    const [row] = await this.db
      .insert(measurementUnits)
      .values({
        id: measurementUnit.id,
        organizationId: measurementUnit.organizationId,
        code: measurementUnit.code,
        name: measurementUnit.name,
        isActive: measurementUnit.isActive,
        createdAt: new Date(measurementUnit.createdAt),
        updatedAt: new Date(measurementUnit.updatedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Measurement unit insert did not return a row');
    }

    return toMeasurementUnit(row);
  }
}

function toMeasurementUnit(row: MeasurementUnitRow): MeasurementUnit {
  return {
    id: asMeasurementUnitId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
    updatedAt: row.updatedAt.toISOString() as IsoDateTime,
  };
}
