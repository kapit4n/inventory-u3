import {
  assertStockDoesNotGoNegative,
  createManualAdjustment,
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

export interface AdjustStockCommand {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly quantityDeltaMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly recordedByUserId: UserId;
}

export interface AdjustStockDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function adjustStockUseCase(
  command: AdjustStockCommand,
  { unitOfWork, ids, clock }: AdjustStockDependencies,
): Promise<StockAdjustment> {
  return unitOfWork.transaction(async (repositories) => {
    await requireActiveStockTargets(
      repositories,
      command.organizationId,
      command.branchId,
      command.productId,
    );

    const currentQuantityMilli = await repositories.stockMovements.getBalanceMilli(
      command.organizationId,
      command.branchId,
      command.productId,
    );

    assertStockDoesNotGoNegative(currentQuantityMilli, command.quantityDeltaMilli, {
      branchId: command.branchId,
      productId: command.productId,
    });

    const at = clock.now();
    const adjustment = createManualAdjustment(
      {
        id: asStockAdjustmentId(ids.nextId()),
        organizationId: command.organizationId,
        branchId: command.branchId,
        productId: command.productId,
        quantityDeltaMilli: command.quantityDeltaMilli,
        reason: command.reason,
        note: command.note,
        occurredAt: at,
        recordedByUserId: command.recordedByUserId,
      },
      at,
    );

    const saved = await repositories.stockAdjustments.create(adjustment);

    await repositories.stockMovements.create(
      createStockMovement(
        {
          id: asStockMovementId(ids.nextId()),
          organizationId: command.organizationId,
          branchId: command.branchId,
          productId: command.productId,
          quantityDeltaMilli: command.quantityDeltaMilli,
          reason: 'ADJUSTMENT',
          source: { type: 'ADJUSTMENT', id: adjustment.id },
          occurredAt: at,
          recordedByUserId: command.recordedByUserId,
          note: command.note,
        },
        at,
      ),
    );

    return saved;
  });
}
