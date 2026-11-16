import {
  assertStockDoesNotGoNegative,
  confirmSalesCheckpoint,
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

export interface ConfirmSalesCheckpointCommand {
  readonly organizationId: OrganizationId;
  readonly salesCheckpointId: SalesCheckpointId;
  readonly confirmedByUserId: UserId;
}

export interface ConfirmSalesCheckpointDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function confirmSalesCheckpointUseCase(
  command: ConfirmSalesCheckpointCommand,
  { unitOfWork, ids, clock }: ConfirmSalesCheckpointDependencies,
): Promise<SalesCheckpoint> {
  return unitOfWork.transaction(async (repositories) => {
    const checkpoint = await repositories.salesCheckpoints.findById(
      command.organizationId,
      command.salesCheckpointId,
    );

    if (!checkpoint) {
      throw notFound('SalesCheckpoint', command.salesCheckpointId);
    }

    if (checkpoint.status !== 'DRAFT') {
      throw new DomainError('INVALID_STATE', 'Only a draft sales checkpoint can be confirmed', {
        status: checkpoint.status,
      });
    }

    const netDeltaByProduct = new Map<ProductId, number>();
    for (const line of checkpoint.items) {
      netDeltaByProduct.set(
        line.productId,
        (netDeltaByProduct.get(line.productId) ?? 0) - line.quantityMilli,
      );
    }

    for (const [productId, netDeltaMilli] of netDeltaByProduct) {
      const currentQuantityMilli = await repositories.stockMovements.getBalanceMilli(
        command.organizationId,
        checkpoint.branchId,
        productId,
      );
      assertStockDoesNotGoNegative(currentQuantityMilli, netDeltaMilli, {
        salesCheckpointId: checkpoint.id,
        branchId: checkpoint.branchId,
        productId,
      });
    }

    const confirmedAt = clock.now();
    const confirmation = {
      confirmedByUserId: command.confirmedByUserId,
      confirmedAt,
    };
    confirmSalesCheckpoint(checkpoint, confirmation);

    const saved = await repositories.salesCheckpoints.markConfirmed(
      command.organizationId,
      checkpoint.id,
      confirmation,
    );

    if (!saved) {
      throw new DomainError('INVALID_STATE', 'The sales checkpoint was already confirmed');
    }

    for (const line of checkpoint.items) {
      await repositories.stockMovements.create(
        createStockMovement(
          {
            id: asStockMovementId(ids.nextId()),
            organizationId: command.organizationId,
            branchId: checkpoint.branchId,
            productId: line.productId,
            quantityDeltaMilli: -line.quantityMilli,
            reason: 'SALES_CHECKPOINT',
            source: { type: 'SALES_CHECKPOINT', id: checkpoint.id },
            occurredAt: confirmedAt,
            recordedByUserId: command.confirmedByUserId,
            ...(checkpoint.note === undefined ? {} : { note: checkpoint.note }),
          },
          confirmedAt,
        ),
      );
    }

    return saved;
  });
}
