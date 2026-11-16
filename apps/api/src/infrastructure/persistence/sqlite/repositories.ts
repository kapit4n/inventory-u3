import type { Repositories } from '@inventory-u3/domain';

import type { SqliteDatabase } from './connection.js';
import { SQLiteBranchRepository } from './repositories/branch-repository.js';
import { SQLiteEmployeeRepository } from './repositories/employee-repository.js';
import { SQLiteInventoryWasteRepository } from './repositories/inventory-waste-repository.js';
import { SQLiteMeasurementUnitRepository } from './repositories/measurement-unit-repository.js';
import { SQLiteOrganizationRepository } from './repositories/organization-repository.js';
import { SQLiteProductCategoryRepository } from './repositories/product-category-repository.js';
import { SQLiteProductPresentationRepository } from './repositories/product-presentation-repository.js';
import { SQLiteProductPriceHistoryRepository } from './repositories/product-price-history-repository.js';
import { SQLiteProductionBatchRepository } from './repositories/production-repository.js';
import { SQLiteProductRepository } from './repositories/product-repository.js';
import { SQLitePurchaseCorrectionRepository } from './repositories/purchase-correction-repository.js';
import { SQLitePurchaseRepository } from './repositories/purchase-repository.js';
import { SQLiteSessionRepository } from './repositories/session-repository.js';
import { SQLiteStockAdjustmentRepository } from './repositories/stock-adjustment-repository.js';
import { SQLiteStockMovementRepository } from './repositories/stock-movement-repository.js';
import { SQLiteSupplierRepository } from './repositories/supplier-repository.js';
import { SQLiteUserRepository } from './repositories/user-repository.js';

export function sqliteRepositoriesFor(db: SqliteDatabase): Repositories {
  return {
    organizations: new SQLiteOrganizationRepository(db),
    branches: new SQLiteBranchRepository(db),
    employees: new SQLiteEmployeeRepository(db),
    suppliers: new SQLiteSupplierRepository(db),
    measurementUnits: new SQLiteMeasurementUnitRepository(db),
    productCategories: new SQLiteProductCategoryRepository(db),
    products: new SQLiteProductRepository(db),
    productPresentations: new SQLiteProductPresentationRepository(db),
    productPriceHistory: new SQLiteProductPriceHistoryRepository(db),
    productionBatches: new SQLiteProductionBatchRepository(db),
    purchases: new SQLitePurchaseRepository(db),
    purchaseCorrections: new SQLitePurchaseCorrectionRepository(db),
    stockMovements: new SQLiteStockMovementRepository(db),
    stockAdjustments: new SQLiteStockAdjustmentRepository(db),
    inventoryWaste: new SQLiteInventoryWasteRepository(db),
    users: new SQLiteUserRepository(db),
    sessions: new SQLiteSessionRepository(db),
  };
}
