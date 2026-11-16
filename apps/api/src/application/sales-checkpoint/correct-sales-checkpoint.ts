import {
  assertStockDoesNotGoNegative,
  correctSalesCheckpoint,
  createStockMovement,
  DomainError,
  notFound,
  type Clock,
  type IdGenerator,
  type SalesCheckpoint,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asStockMovementId,
  type OrganizationId,
  type ProductId,
  type SalesCheckpointId,
  type UserId,
} from '@inventory-u3/types';

export interface CorrectSalesCheckpointCommand {
  readonly organizationId: OrganizationId;
  readonly salesCheckpointId: SalesCheckpointId;
  readonly correctedByUserId: UserId;
  readonly reason: string;
}

export interface CorrectSalesCheckpointDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function correctSalesCheckpointUseCase(
  command: CorrectSalesCheckpointCommand,
  { unitOfWork, ids, clock }: CorrectSalesCheckpointDependencies,
): Promise<SalesCheckpoint> {
  return unitOfWork.transaction(async (repositories) => {
    const checkpoint = await repositories.salesCheckpoints.findById(
      command.organizationId,
      command.salesCheckpointId,
    );

    if (!checkpoint) {
      throw notFound('SalesCheckpoint', command.salesCheckpointId);
    }

    if (checkpoint.status !== 'CONFIRMED') {
      throw new DomainError('INVALID_STATE', 'Only a confirmed sales checkpoint can be corrected', {
        status: checkpoint.status,
      });
    }

    const movements = await repositories.stockMovements.listBySource(command.organizationId, {
      type: 'SALES_CHECKPOINT',
      id: checkpoint.id,
    });

    if (movements.length === 0) {
      throw new DomainError(
        'INVALID_STATE',
        'The confirmed sales checkpoint has no stock movements to correct',
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
        checkpoint.branchId,
        productId,
      );
      assertStockDoesNotGoNegative(currentQuantityMilli, reversalQuantityMilli, {
        salesCheckpointId: checkpoint.id,
        branchId: checkpoint.branchId,
        productId,
      });
    }

    const correctedAt = clock.now();
    const correction = {
      correctedByUserId: command.correctedByUserId,
      correctedAt,
      reason: command.reason,
    };
    correctSalesCheckpoint(checkpoint, correction);

    const saved = await repositories.salesCheckpoints.markCorrected(
      command.organizationId,
      checkpoint.id,
      correction,
    );

    if (!saved) {
      throw new DomainError('INVALID_STATE', 'The sales checkpoint was already corrected');
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
            source: { type: 'SALES_CHECKPOINT', id: checkpoint.id },
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
