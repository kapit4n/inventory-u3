import type { Repositories } from '@inventory-u3/domain';

import type { SqliteDatabase } from './connection.js';
import { SQLiteBranchRepository } from './repositories/branch-repository.js';
import { SQLiteMeasurementUnitRepository } from './repositories/measurement-unit-repository.js';
import { SQLiteOrganizationRepository } from './repositories/organization-repository.js';
import { SQLiteProductCategoryRepository } from './repositories/product-category-repository.js';
import { SQLiteProductPresentationRepository } from './repositories/product-presentation-repository.js';
import { SQLiteProductRepository } from './repositories/product-repository.js';
import { SQLiteSessionRepository } from './repositories/session-repository.js';
import { SQLiteUserRepository } from './repositories/user-repository.js';

export function sqliteRepositoriesFor(db: SqliteDatabase): Repositories {
  return {
    organizations: new SQLiteOrganizationRepository(db),
    branches: new SQLiteBranchRepository(db),
    measurementUnits: new SQLiteMeasurementUnitRepository(db),
    productCategories: new SQLiteProductCategoryRepository(db),
    products: new SQLiteProductRepository(db),
    productPresentations: new SQLiteProductPresentationRepository(db),
    users: new SQLiteUserRepository(db),
    sessions: new SQLiteSessionRepository(db),
  };
}
