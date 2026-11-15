import {
  DomainError,
  createStockMovement,
  notFound,
  type Clock,
  type IdGenerator,
  type Purchase,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asStockMovementId,
  type OrganizationId,
  type PurchaseId,
  type UserId,
} from '@inventory-u3/types';

export interface ReceivePurchaseCommand {
  readonly organizationId: OrganizationId;
  readonly purchaseId: PurchaseId;
  readonly receivedByUserId: UserId;
}

export interface ReceivePurchaseDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function receivePurchaseUseCase(
  command: ReceivePurchaseCommand,
  { unitOfWork, ids, clock }: ReceivePurchaseDependencies,
): Promise<Purchase> {
  return unitOfWork.transaction(async (repositories) => {
    const purchase = await repositories.purchases.findById(
      command.organizationId,
      command.purchaseId,
    );

    if (!purchase) {
      throw notFound('Purchase', command.purchaseId);
    }

    if (purchase.status !== 'DRAFT') {
      throw new DomainError('INVALID_STATE', 'Only a draft purchase can be received', {
        status: purchase.status,
      });
    }

    for (const item of purchase.items) {
      const product = await repositories.products.findById(command.organizationId, item.productId);
      if (!product) {
        throw notFound('Product', item.productId);
      }
      if (product.inventoryUnitId !== item.unitId) {
        throw new DomainError(
          'INVALID_INPUT',
          'Purchase line unit must match the product inventory unit until unit conversion is supported',
          { productId: product.id, unitId: item.unitId },
        );
      }
    }

    const receivedAt = clock.now();
    const receipt = {
      receivedByUserId: command.receivedByUserId,
      receivedAt,
    };
    const received = await repositories.purchases.markReceived(
      command.organizationId,
      command.purchaseId,
      receipt,
    );

    if (!received) {
      throw new DomainError('INVALID_STATE', 'The purchase was already received');
    }

    for (const item of purchase.items) {
      const movement = createStockMovement(
        {
          id: asStockMovementId(ids.nextId()),
          organizationId: command.organizationId,
          branchId: purchase.branchId,
          productId: item.productId,
          quantityDeltaMilli: item.quantityMilli,
          reason: 'RECEIVING',
          source: { type: 'PURCHASE_RECEIPT', id: purchase.id },
          occurredAt: receivedAt,
          recordedByUserId: command.receivedByUserId,
        },
        receivedAt,
      );
      await repositories.stockMovements.create(movement);
    }

    return received;
  });
}
