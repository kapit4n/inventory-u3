import type { Repositories, UnitOfWork } from '@inventory-u3/domain';

import type { InventoryDatabase } from './connection.js';
import { DrizzleBranchRepository } from '../repositories/branch-repository.js';
import { DrizzleEmployeeRepository } from '../repositories/employee-repository.js';
import { DrizzleMeasurementUnitRepository } from '../repositories/measurement-unit-repository.js';
import { DrizzleOrganizationRepository } from '../repositories/organization-repository.js';
import { DrizzleProductCategoryRepository } from '../repositories/product-category-repository.js';
import { DrizzleProductPresentationRepository } from '../repositories/product-presentation-repository.js';
import { DrizzleProductPriceHistoryRepository } from '../repositories/product-price-history-repository.js';
import { DrizzleProductRepository } from '../repositories/product-repository.js';
import { DrizzlePurchaseCorrectionRepository } from '../repositories/purchase-correction-repository.js';
import { DrizzlePurchaseRepository } from '../repositories/purchase-repository.js';
import { DrizzleSessionRepository } from '../repositories/session-repository.js';
import { DrizzleStockMovementRepository } from '../repositories/stock-movement-repository.js';
import { DrizzleSupplierRepository } from '../repositories/supplier-repository.js';
import { DrizzleUserRepository } from '../repositories/user-repository.js';

export function repositoriesFor(db: InventoryDatabase): Repositories {
  return {
    organizations: new DrizzleOrganizationRepository(db),
    branches: new DrizzleBranchRepository(db),
    employees: new DrizzleEmployeeRepository(db),
    suppliers: new DrizzleSupplierRepository(db),
    measurementUnits: new DrizzleMeasurementUnitRepository(db),
    productCategories: new DrizzleProductCategoryRepository(db),
    products: new DrizzleProductRepository(db),
    productPresentations: new DrizzleProductPresentationRepository(db),
    productPriceHistory: new DrizzleProductPriceHistoryRepository(db),
    purchases: new DrizzlePurchaseRepository(db),
    purchaseCorrections: new DrizzlePurchaseCorrectionRepository(db),
    stockMovements: new DrizzleStockMovementRepository(db),
    users: new DrizzleUserRepository(db),
    sessions: new DrizzleSessionRepository(db),
  };
}

/**
 * A `UnitOfWork` whose transactions are PostgreSQL transactions.
 *
 * The repositories are built per transaction so none of them can escape it.
 */
export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private readonly db: InventoryDatabase) {}

  async transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => work(repositoriesFor(tx as InventoryDatabase)));
  }
}
