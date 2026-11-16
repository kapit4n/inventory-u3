import {
  assertStockDoesNotGoNegative,
  confirmProductionBatch,
  createStockMovement,
  DomainError,
  notFound,
  productionOutputQuantityMilli,
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

export interface ConfirmProductionBatchCommand {
  readonly organizationId: OrganizationId;
  readonly productionBatchId: ProductionBatchId;
  readonly confirmedByUserId: UserId;
}

export interface ConfirmProductionBatchDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function confirmProductionBatchUseCase(
  command: ConfirmProductionBatchCommand,
  { unitOfWork, ids, clock }: ConfirmProductionBatchDependencies,
): Promise<ProductionBatch> {
  return unitOfWork.transaction(async (repositories) => {
    const batch = await repositories.productionBatches.findById(
      command.organizationId,
      command.productionBatchId,
    );

    if (!batch) {
      throw notFound('ProductionBatch', command.productionBatchId);
    }

    if (batch.status !== 'DRAFT') {
      throw new DomainError('INVALID_STATE', 'Only a draft production batch can be confirmed', {
        status: batch.status,
      });
    }

    const netDeltaByProduct = new Map<ProductId, number>();
    for (const line of batch.inputs) {
      addDelta(netDeltaByProduct, line.productId, -line.quantityMilli);
    }
    for (const line of batch.waste) {
      addDelta(netDeltaByProduct, line.productId, -line.quantityMilli);
    }
    for (const line of batch.outputs) {
      addDelta(netDeltaByProduct, line.productId, productionOutputQuantityMilli(line));
    }

    for (const [productId, netDeltaMilli] of netDeltaByProduct) {
      if (netDeltaMilli === 0) {
        continue;
      }

      const currentQuantityMilli = await repositories.stockMovements.getBalanceMilli(
        command.organizationId,
        batch.branchId,
        productId,
      );
      assertStockDoesNotGoNegative(currentQuantityMilli, netDeltaMilli, {
        productionBatchId: batch.id,
        branchId: batch.branchId,
        productId,
      });
    }

    const confirmedAt = clock.now();
    const confirmation = {
      confirmedByUserId: command.confirmedByUserId,
      confirmedAt,
    };
    confirmProductionBatch(batch, confirmation);

    const saved = await repositories.productionBatches.markConfirmed(
      command.organizationId,
      batch.id,
      confirmation,
    );

    if (!saved) {
      throw new DomainError('INVALID_STATE', 'The production batch was already confirmed');
    }

    for (const line of batch.inputs) {
      await repositories.stockMovements.create(
        createStockMovement(
          {
            id: asStockMovementId(ids.nextId()),
            organizationId: command.organizationId,
            branchId: batch.branchId,
            productId: line.productId,
            quantityDeltaMilli: -line.quantityMilli,
            reason: 'PRODUCTION_INPUT',
            source: { type: 'PRODUCTION_BATCH', id: batch.id },
            occurredAt: confirmedAt,
            recordedByUserId: command.confirmedByUserId,
            ...(batch.note === undefined ? {} : { note: batch.note }),
          },
          confirmedAt,
        ),
      );
    }

    for (const line of batch.outputs) {
      await repositories.stockMovements.create(
        createStockMovement(
          {
            id: asStockMovementId(ids.nextId()),
            organizationId: command.organizationId,
            branchId: batch.branchId,
            productId: line.productId,
            quantityDeltaMilli: productionOutputQuantityMilli(line),
            reason: 'PRODUCTION_OUTPUT',
            source: { type: 'PRODUCTION_BATCH', id: batch.id },
            occurredAt: confirmedAt,
            recordedByUserId: command.confirmedByUserId,
            ...(batch.note === undefined ? {} : { note: batch.note }),
          },
          confirmedAt,
        ),
      );
    }

    for (const line of batch.waste) {
      await repositories.stockMovements.create(
        createStockMovement(
          {
            id: asStockMovementId(ids.nextId()),
            organizationId: command.organizationId,
            branchId: batch.branchId,
            productId: line.productId,
            quantityDeltaMilli: -line.quantityMilli,
            reason: 'WASTE',
            source: { type: 'PRODUCTION_BATCH', id: batch.id },
            occurredAt: confirmedAt,
            recordedByUserId: command.confirmedByUserId,
            note: line.reason,
          },
          confirmedAt,
        ),
      );
    }

    return saved;
  });
}

function addDelta(deltas: Map<ProductId, number>, productId: ProductId, delta: number): void {
  deltas.set(productId, (deltas.get(productId) ?? 0) + delta);
}
