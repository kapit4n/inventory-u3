import { and, desc, eq, inArray } from 'drizzle-orm';

import { purchaseItems, purchases } from '@inventory-u3/database/schema';
import type {
  Purchase,
  PurchaseItem,
  PurchaseReceipt,
  PurchaseRepository,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asPurchaseId,
  asPurchaseItemId,
  asSupplierId,
  asUserId,
  type BranchId,
  type IsoDate,
  type OrganizationId,
  type PurchaseId,
  type UserId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type PurchaseRow = typeof purchases.$inferSelect;
type PurchaseItemRow = typeof purchaseItems.$inferSelect;

export class DrizzlePurchaseRepository implements PurchaseRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
  ): Promise<Purchase | undefined> {
    const [row] = await this.db
      .select()
      .from(purchases)
      .where(and(eq(purchases.organizationId, organizationId), eq(purchases.id, purchaseId)))
      .limit(1);

    if (!row) {
      return undefined;
    }

    const items = await this.itemsFor(organizationId, [purchaseId]);
    return toPurchase(row, items);
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly Purchase[]> {
    const rows = await this.db
      .select()
      .from(purchases)
      .where(eq(purchases.organizationId, organizationId))
      .orderBy(desc(purchases.createdAt), desc(purchases.id));

    return this.withItems(organizationId, rows);
  }

  async listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly Purchase[]> {
    const rows = await this.db
      .select()
      .from(purchases)
      .where(and(eq(purchases.organizationId, organizationId), eq(purchases.branchId, branchId)))
      .orderBy(desc(purchases.createdAt), desc(purchases.id));

    return this.withItems(organizationId, rows);
  }

  async create(purchase: Purchase): Promise<Purchase> {
    const [purchaseRow] = await this.db
      .insert(purchases)
      .values({
        id: purchase.id,
        organizationId: purchase.organizationId,
        branchId: purchase.branchId,
        supplierId: purchase.supplierId,
        status: purchase.status,
        deliveryDate: purchase.deliveryDate,
        currency: purchase.currency,
        totalMinor: purchase.totalMinor,
        note: purchase.note ?? null,
        createdByUserId: purchase.createdByUserId,
        receivedByUserId: purchase.receivedByUserId ?? null,
        receivedAt: toDate(purchase.receivedAt),
        cancelledAt: toDate(purchase.cancelledAt),
        correctedByUserId: purchase.correctedByUserId ?? null,
        correctedAt: toDate(purchase.correctedAt),
        createdAt: new Date(purchase.createdAt),
        updatedAt: new Date(purchase.updatedAt),
      })
      .returning();

    if (!purchaseRow) {
      throw new Error('Purchase insert did not return a row');
    }

    const itemRows = await this.db
      .insert(purchaseItems)
      .values(
        purchase.items.map((item) => ({
          id: item.id,
          organizationId: item.organizationId,
          purchaseId: item.purchaseId,
          productId: item.productId,
          unitId: item.unitId,
          quantityMilli: item.quantityMilli,
          unitPriceMinor: item.unitPriceMinor,
          lineTotalMinor: item.lineTotalMinor,
          position: item.position,
          createdAt: new Date(item.createdAt),
        })),
      )
      .returning();

    return toPurchase(purchaseRow, itemRows.map(toPurchaseItem));
  }

  async markReceived(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
    receipt: PurchaseReceipt,
  ): Promise<Purchase | undefined> {
    const [row] = await this.db
      .update(purchases)
      .set({
        status: 'RECEIVED',
        receivedByUserId: receipt.receivedByUserId,
        receivedAt: new Date(receipt.receivedAt),
        updatedAt: new Date(receipt.receivedAt),
      })
      .where(
        and(
          eq(purchases.organizationId, organizationId),
          eq(purchases.id, purchaseId),
          eq(purchases.status, 'DRAFT'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, purchaseId) : undefined;
  }

  async markCancelled(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
    at: string,
  ): Promise<Purchase | undefined> {
    const [row] = await this.db
      .update(purchases)
      .set({ status: 'CANCELLED', cancelledAt: new Date(at), updatedAt: new Date(at) })
      .where(
        and(
          eq(purchases.organizationId, organizationId),
          eq(purchases.id, purchaseId),
          eq(purchases.status, 'DRAFT'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, purchaseId) : undefined;
  }

  async markCorrected(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
    correction: { readonly correctedByUserId: UserId; readonly correctedAt: string },
  ): Promise<Purchase | undefined> {
    const [row] = await this.db
      .update(purchases)
      .set({
        status: 'CORRECTED',
        correctedByUserId: correction.correctedByUserId,
        correctedAt: new Date(correction.correctedAt),
        updatedAt: new Date(correction.correctedAt),
      })
      .where(
        and(
          eq(purchases.organizationId, organizationId),
          eq(purchases.id, purchaseId),
          eq(purchases.status, 'RECEIVED'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, purchaseId) : undefined;
  }

  private async withItems(
    organizationId: OrganizationId,
    rows: readonly PurchaseRow[],
  ): Promise<readonly Purchase[]> {
    if (rows.length === 0) {
      return [];
    }

    const items = await this.itemsFor(
      organizationId,
      rows.map((row) => asPurchaseId(row.id)),
    );
    const byPurchase = new Map<string, PurchaseItem[]>();
    for (const item of items) {
      const list = byPurchase.get(item.purchaseId) ?? [];
      list.push(item);
      byPurchase.set(item.purchaseId, list);
    }

    return rows.map((row) => toPurchase(row, byPurchase.get(row.id) ?? []));
  }

  private async itemsFor(
    organizationId: OrganizationId,
    purchaseIds: readonly PurchaseId[],
  ): Promise<readonly PurchaseItem[]> {
    if (purchaseIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(purchaseItems)
      .where(
        and(
          eq(purchaseItems.organizationId, organizationId),
          inArray(purchaseItems.purchaseId, purchaseIds),
        ),
      )
      .orderBy(purchaseItems.position, purchaseItems.id);

    return rows.map(toPurchaseItem);
  }
}

function toPurchase(row: PurchaseRow, items: readonly PurchaseItem[]): Purchase {
  return {
    id: asPurchaseId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    supplierId: asSupplierId(row.supplierId),
    status: row.status,
    deliveryDate: row.deliveryDate as IsoDate,
    currency: row.currency,
    totalMinor: row.totalMinor,
    ...(row.note === null ? {} : { note: row.note }),
    createdByUserId: asUserId(row.createdByUserId),
    ...(row.receivedByUserId === null ? {} : { receivedByUserId: asUserId(row.receivedByUserId) }),
    ...(row.receivedAt === null ? {} : { receivedAt: row.receivedAt.toISOString() }),
    ...(row.cancelledAt === null ? {} : { cancelledAt: row.cancelledAt.toISOString() }),
    ...(row.correctedByUserId === null
      ? {}
      : { correctedByUserId: asUserId(row.correctedByUserId) }),
    ...(row.correctedAt === null ? {} : { correctedAt: row.correctedAt.toISOString() }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
  };
}

function toPurchaseItem(row: PurchaseItemRow): PurchaseItem {
  return {
    id: asPurchaseItemId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    purchaseId: asPurchaseId(row.purchaseId),
    productId: asProductId(row.productId),
    unitId: asMeasurementUnitId(row.unitId),
    quantityMilli: row.quantityMilli,
    unitPriceMinor: row.unitPriceMinor,
    lineTotalMinor: row.lineTotalMinor,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDate(value: string | undefined): Date | null {
  return value === undefined ? null : new Date(value);
}
