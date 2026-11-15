import {
  assertStockDoesNotGoNegative,
  createInventoryWaste,
  createStockMovement,
  type Clock,
  type IdGenerator,
  type InventoryWaste,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asInventoryWasteId,
  asStockMovementId,
  type BranchId,
  type OrganizationId,
  type ProductId,
  type UserId,
} from '@inventory-u3/types';

import { requireActiveStockTargets } from './stock-references.js';

export interface RecordInventoryWasteCommand {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly quantityMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly recordedByUserId: UserId;
}

export interface RecordInventoryWasteDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export async function recordInventoryWasteUseCase(
  command: RecordInventoryWasteCommand,
  { unitOfWork, ids, clock }: RecordInventoryWasteDependencies,
): Promise<InventoryWaste> {
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

    assertStockDoesNotGoNegative(currentQuantityMilli, -command.quantityMilli, {
      branchId: command.branchId,
      productId: command.productId,
    });

    const at = clock.now();
    const waste = createInventoryWaste(
      {
        id: asInventoryWasteId(ids.nextId()),
        organizationId: command.organizationId,
        branchId: command.branchId,
        productId: command.productId,
        quantityMilli: command.quantityMilli,
        reason: command.reason,
        note: command.note,
        occurredAt: at,
        recordedByUserId: command.recordedByUserId,
      },
      at,
    );

    const saved = await repositories.inventoryWaste.create(waste);

    await repositories.stockMovements.create(
      createStockMovement(
        {
          id: asStockMovementId(ids.nextId()),
          organizationId: command.organizationId,
          branchId: command.branchId,
          productId: command.productId,
          quantityDeltaMilli: -command.quantityMilli,
          reason: 'WASTE',
          source: { type: 'WASTE_REPORT', id: waste.id },
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
