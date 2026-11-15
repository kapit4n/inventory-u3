import {
  assertStockDoesNotGoNegative,
  createReconciliation,
  createStockMovement,
  type Clock,
  type IdGenerator,
  type StockAdjustment,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asStockAdjustmentId,
  asStockMovementId,
  type BranchId,
  type OrganizationId,
  type ProductId,
  type UserId,
} from '@inventory-u3/types';

import { requireActiveStockTargets } from './stock-references.js';

export interface ReconcileStockCommand {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly countedQuantityMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly recordedByUserId: UserId;
}

export interface ReconcileStockDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function reconcileStockUseCase(
  command: ReconcileStockCommand,
  { unitOfWork, ids, clock }: ReconcileStockDependencies,
): Promise<StockAdjustment> {
  return unitOfWork.transaction(async (repositories) => {
    await requireActiveStockTargets(
      repositories,
      command.organizationId,
      command.branchId,
      command.productId,
    );

    const expectedQuantityMilli = await repositories.stockMovements.getBalanceMilli(
      command.organizationId,
      command.branchId,
      command.productId,
    );

    const at = clock.now();
    const adjustment = createReconciliation(
      {
        id: asStockAdjustmentId(ids.nextId()),
        organizationId: command.organizationId,
        branchId: command.branchId,
        productId: command.productId,
        expectedQuantityMilli,
        countedQuantityMilli: command.countedQuantityMilli,
        reason: command.reason,
        note: command.note,
        occurredAt: at,
        recordedByUserId: command.recordedByUserId,
      },
      at,
    );

    assertStockDoesNotGoNegative(expectedQuantityMilli, adjustment.quantityDeltaMilli, {
      branchId: command.branchId,
      productId: command.productId,
    });

    const saved = await repositories.stockAdjustments.create(adjustment);

    if (adjustment.quantityDeltaMilli !== 0) {
      await repositories.stockMovements.create(
        createStockMovement(
          {
            id: asStockMovementId(ids.nextId()),
            organizationId: command.organizationId,
            branchId: command.branchId,
            productId: command.productId,
            quantityDeltaMilli: adjustment.quantityDeltaMilli,
            reason: 'ADJUSTMENT',
            source: { type: 'ADJUSTMENT', id: adjustment.id },
            occurredAt: at,
            recordedByUserId: command.recordedByUserId,
            note: command.note,
          },
          at,
        ),
      );
    }

    return saved;
  });
}
