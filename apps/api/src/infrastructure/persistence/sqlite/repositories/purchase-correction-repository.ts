import { and, eq } from 'drizzle-orm';

import { purchaseCorrections } from '@inventory-u3/database/schema/sqlite';
import type { PurchaseCorrection, PurchaseCorrectionRepository } from '@inventory-u3/domain';
import {
  asOrganizationId,
  asPurchaseCorrectionId,
  asPurchaseId,
  asUserId,
  type OrganizationId,
  type PurchaseId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type PurchaseCorrectionRow = typeof purchaseCorrections.$inferSelect;

export class SQLitePurchaseCorrectionRepository implements PurchaseCorrectionRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findByPurchaseId(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
  ): Promise<PurchaseCorrection | undefined> {
    const [row] = await this.db
      .select()
      .from(purchaseCorrections)
      .where(
        and(
          eq(purchaseCorrections.organizationId, organizationId),
          eq(purchaseCorrections.purchaseId, purchaseId),
        ),
      )
      .limit(1);

    return row ? toPurchaseCorrection(row) : undefined;
  }

  async create(purchaseCorrection: PurchaseCorrection): Promise<PurchaseCorrection> {
    const [row] = await this.db
      .insert(purchaseCorrections)
      .values({
        id: purchaseCorrection.id,
        organizationId: purchaseCorrection.organizationId,
        purchaseId: purchaseCorrection.purchaseId,
        correctedByUserId: purchaseCorrection.correctedByUserId,
        reason: purchaseCorrection.reason,
        beforeTotalMinor: purchaseCorrection.beforeTotalMinor,
        afterTotalMinor: purchaseCorrection.afterTotalMinor,
        correctedAt: new Date(purchaseCorrection.correctedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Purchase correction insert did not return a row');
    }

    return toPurchaseCorrection(row);
  }
}

function toPurchaseCorrection(row: PurchaseCorrectionRow): PurchaseCorrection {
  return {
    id: asPurchaseCorrectionId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    purchaseId: asPurchaseId(row.purchaseId),
    correctedByUserId: asUserId(row.correctedByUserId),
    reason: row.reason,
    beforeTotalMinor: row.beforeTotalMinor,
    afterTotalMinor: row.afterTotalMinor,
    correctedAt: row.correctedAt.toISOString(),
  };
}
