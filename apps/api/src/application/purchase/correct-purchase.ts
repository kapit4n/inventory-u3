import {
  DomainError,
  assertStockDoesNotGoNegative,
  correctPurchase,
  createPurchaseCorrection,
  createStockMovement,
  notFound,
  type Clock,
  type IdGenerator,
  type Purchase,
  type PurchaseCorrection,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asPurchaseCorrectionId,
  asStockMovementId,
  type OrganizationId,
  type ProductId,
  type PurchaseId,
  type UserId,
} from '@inventory-u3/types';

export interface CorrectPurchaseCommand {
  readonly organizationId: OrganizationId;
  readonly purchaseId: PurchaseId;
  readonly correctedByUserId: UserId;
  readonly reason: string;
}

export interface CorrectPurchaseDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export interface PurchaseCorrectionResult {
  readonly purchase: Purchase;
  readonly correction: PurchaseCorrection;
}

export async function correctPurchaseUseCase(
  command: CorrectPurchaseCommand,
  { unitOfWork, ids, clock }: CorrectPurchaseDependencies,
): Promise<PurchaseCorrectionResult> {
  return unitOfWork.transaction(async (repositories) => {
    const purchase = await repositories.purchases.findById(
      command.organizationId,
      command.purchaseId,
    );

    if (!purchase) {
      throw notFound('Purchase', command.purchaseId);
    }

    if (purchase.status !== 'RECEIVED') {
      throw new DomainError('INVALID_STATE', 'Only a received purchase can be corrected', {
        status: purchase.status,
      });
    }

    const receiptMovements = await repositories.stockMovements.listBySource(
      command.organizationId,
      { type: 'PURCHASE_RECEIPT', id: purchase.id },
    );

    if (receiptMovements.length === 0) {
      throw new DomainError(
        'INVALID_STATE',
        'The received purchase has no stock movements to correct',
      );
    }

    const reversalByProduct = new Map<ProductId, number>();
    for (const movement of receiptMovements) {
      reversalByProduct.set(
        movement.productId,
        (reversalByProduct.get(movement.productId) ?? 0) - movement.quantityDeltaMilli,
      );
    }

    for (const [productId, reversalQuantityMilli] of reversalByProduct) {
      const currentQuantityMilli = await repositories.stockMovements.getBalanceMilli(
        command.organizationId,
        purchase.branchId,
        productId,
      );
      assertStockDoesNotGoNegative(currentQuantityMilli, reversalQuantityMilli, {
        purchaseId: purchase.id,
        productId,
      });
    }

    const correctedAt = clock.now();
    const correction = createPurchaseCorrection(
      {
        id: asPurchaseCorrectionId(ids.nextId()),
        organizationId: command.organizationId,
        purchaseId: purchase.id,
        correctedByUserId: command.correctedByUserId,
        reason: command.reason,
        beforeTotalMinor: purchase.totalMinor,
      },
      correctedAt,
    );

    correctPurchase(purchase, correction, correctedAt);
    const saved = await repositories.purchases.markCorrected(command.organizationId, purchase.id, {
      correctedByUserId: correction.correctedByUserId,
      correctedAt,
    });

    if (!saved) {
      throw new DomainError('INVALID_STATE', 'The purchase was already corrected');
    }

    const storedCorrection = await repositories.purchaseCorrections.create(correction);

    for (const movement of receiptMovements) {
      const reversal = createStockMovement(
        {
          id: asStockMovementId(ids.nextId()),
          organizationId: command.organizationId,
          branchId: movement.branchId,
          productId: movement.productId,
          quantityDeltaMilli: -movement.quantityDeltaMilli,
          reason: 'CORRECTION',
          source: { type: 'PURCHASE_CORRECTION', id: correction.id },
          correctsMovementId: movement.id,
          occurredAt: correctedAt,
          recordedByUserId: command.correctedByUserId,
          note: `Purchase correction: ${correction.reason}`,
        },
        correctedAt,
      );
      await repositories.stockMovements.create(reversal);
    }

    return { purchase: saved, correction: storedCorrection };
  });
}
