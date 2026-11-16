import {
  assertStockDoesNotGoNegative,
  correctProductionBatch,
  createStockMovement,
  DomainError,
  notFound,
  type Clock,
  type IdGenerator,
  type ProductionBatch,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asStockMovementId,
  type OrganizationId,
  type ProductId,
  type ProductionBatchId,
  type UserId,
} from '@inventory-u3/types';

export interface CorrectProductionBatchCommand {
  readonly organizationId: OrganizationId;
  readonly productionBatchId: ProductionBatchId;
  readonly correctedByUserId: UserId;
  readonly reason: string;
}

export interface CorrectProductionBatchDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function correctProductionBatchUseCase(
  command: CorrectProductionBatchCommand,
  { unitOfWork, ids, clock }: CorrectProductionBatchDependencies,
): Promise<ProductionBatch> {
  return unitOfWork.transaction(async (repositories) => {
    const batch = await repositories.productionBatches.findById(
      command.organizationId,
      command.productionBatchId,
    );

    if (!batch) {
      throw notFound('ProductionBatch', command.productionBatchId);
    }

    if (batch.status !== 'CONFIRMED') {
      throw new DomainError('INVALID_STATE', 'Only a confirmed production batch can be corrected', {
        status: batch.status,
      });
    }

    const movements = await repositories.stockMovements.listBySource(command.organizationId, {
      type: 'PRODUCTION_BATCH',
      id: batch.id,
    });

    if (movements.length === 0) {
      throw new DomainError(
        'INVALID_STATE',
        'The confirmed production batch has no stock movements to correct',
      );
    }

    const reversalByProduct = new Map<ProductId, number>();
    for (const movement of movements) {
      reversalByProduct.set(
        movement.productId,
        (reversalByProduct.get(movement.productId) ?? 0) - movement.quantityDeltaMilli,
      );
    }

    for (const [productId, reversalQuantityMilli] of reversalByProduct) {
      const currentQuantityMilli = await repositories.stockMovements.getBalanceMilli(
        command.organizationId,
        batch.branchId,
        productId,
      );
      assertStockDoesNotGoNegative(currentQuantityMilli, reversalQuantityMilli, {
        productionBatchId: batch.id,
        branchId: batch.branchId,
        productId,
      });
    }

    const correctedAt = clock.now();
    const correction = {
      correctedByUserId: command.correctedByUserId,
      correctedAt,
      reason: command.reason,
    };
    correctProductionBatch(batch, correction);

    const saved = await repositories.productionBatches.markCorrected(
      command.organizationId,
      batch.id,
      correction,
    );

    if (!saved) {
      throw new DomainError('INVALID_STATE', 'The production batch was already corrected');
    }

    for (const movement of movements) {
      await repositories.stockMovements.create(
        createStockMovement(
          {
            id: asStockMovementId(ids.nextId()),
            organizationId: command.organizationId,
            branchId: movement.branchId,
            productId: movement.productId,
            quantityDeltaMilli: -movement.quantityDeltaMilli,
            reason: 'CORRECTION',
            source: { type: 'PRODUCTION_BATCH', id: batch.id },
            correctsMovementId: movement.id,
            occurredAt: correctedAt,
            recordedByUserId: command.correctedByUserId,
            note: saved.correctionReason ?? command.reason,
          },
          correctedAt,
        ),
      );
    }

    return saved;
  });
}
