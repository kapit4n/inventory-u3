/**
 * Development seed data, on both engines (ADR 0025).
 *
 * Idempotent: every insert is keyed by a fixed id, so running the seed twice
 * leaves the same records. It never runs against a production-looking URL.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import { drizzle as sqliteDrizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { isSqliteUrl, sqliteDatabasePath, ensureSqliteDatabaseDirectory } from './db-url.js';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as pgSchema from '@inventory-u3/database/schema';
import * as sqliteSchema from '@inventory-u3/database/schema/sqlite';
import {
  DEVELOPMENT_BRANCHES,
  DEVELOPMENT_CURRENCY,
  DEVELOPMENT_EMPLOYEES,
  DEVELOPMENT_INVENTORY_WASTE,
  DEVELOPMENT_MEASUREMENT_UNITS,
  DEVELOPMENT_ORGANIZATION_ID,
  DEVELOPMENT_ORGANIZATION_NAME,
  DEVELOPMENT_PASSWORD,
  DEVELOPMENT_PRODUCT_CATEGORIES,
  DEVELOPMENT_PRODUCT_PRESENTATIONS,
  DEVELOPMENT_PRODUCTION_BATCHES,
  DEVELOPMENT_PRODUCT_PRICES,
  DEVELOPMENT_SALES_CHECKPOINTS,
  DEVELOPMENT_PRODUCTS,
  DEVELOPMENT_STOCK_ADJUSTMENTS,
  DEVELOPMENT_STOCK_MOVEMENTS,
  DEVELOPMENT_SUPPLIERS,
  DEVELOPMENT_TIMEZONE,
  DEVELOPMENT_USERS,
} from './development-data.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(78);
}

if (databaseUrl.includes('prod') && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('Refusing to seed a database whose URL looks like production.');
  process.exit(78);
}

const timezone = DEVELOPMENT_TIMEZONE;
const currency = DEVELOPMENT_CURRENCY;

async function hashPassword(password: string): Promise<string> {
  const { randomBytes, scrypt } = await import('node:crypto');
  const { promisify } = await import('node:util');
  const scryptAsync = promisify(scrypt) as (
    password: string,
    salt: Buffer,
    keylen: number,
    options: { N: number; r: number; p: number; maxmem: number },
  ) => Promise<Buffer>;
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', 16384, 8, 1, salt.toString('base64'), derived.toString('base64')].join('$');
}

async function seedPostgres(db: PostgresJsDatabase<typeof pgSchema>): Promise<void> {
  const {
    branches,
    employees,
    inventoryWaste,
    measurementUnits,
    organizations,
    productCategories,
    productPresentations,
    productPriceHistory,
    productionBatches,
    salesCheckpointItems,
    salesCheckpoints,
    productionInputs,
    productionOutputs,
    productionWaste,
    products,
    stockAdjustments,
    stockMovements,
    suppliers,
    users,
  } = pgSchema;
  const passwordHash = await hashPassword(DEVELOPMENT_PASSWORD);
  const now = new Date();

  await db
    .insert(organizations)
    .values({
      id: DEVELOPMENT_ORGANIZATION_ID,
      name: DEVELOPMENT_ORGANIZATION_NAME,
      timezone,
      currency,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: DEVELOPMENT_ORGANIZATION_NAME,
        timezone,
        currency,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  for (const user of DEVELOPMENT_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          passwordHash,
          fullName: user.fullName,
          role: user.role,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  for (const unit of DEVELOPMENT_MEASUREMENT_UNITS) {
    await db
      .insert(measurementUnits)
      .values({
        id: unit.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        code: unit.code,
        name: unit.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: measurementUnits.id,
        set: { code: unit.code, name: unit.name, isActive: true, updatedAt: now },
      });
  }

  for (const category of DEVELOPMENT_PRODUCT_CATEGORIES) {
    await db
      .insert(productCategories)
      .values({
        id: category.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        name: category.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: productCategories.id,
        set: { name: category.name, isActive: true, updatedAt: now },
      });
  }

  for (const branch of DEVELOPMENT_BRANCHES) {
    await db
      .insert(branches)
      .values({
        id: branch.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        name: branch.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: branches.id,
        set: { name: branch.name, isActive: true, updatedAt: now },
      });
  }

  for (const supplier of DEVELOPMENT_SUPPLIERS) {
    await db
      .insert(suppliers)
      .values({
        id: supplier.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        name: supplier.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: suppliers.id,
        set: { name: supplier.name, isActive: true, updatedAt: now },
      });
  }

  for (const employee of DEVELOPMENT_EMPLOYEES) {
    await db
      .insert(employees)
      .values({
        id: employee.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: employee.branchId,
        fullName: employee.fullName,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: employees.id,
        set: {
          branchId: employee.branchId,
          fullName: employee.fullName,
          isActive: true,
          updatedAt: now,
        },
      });
  }

  for (const product of DEVELOPMENT_PRODUCTS) {
    await db
      .insert(products)
      .values({
        id: product.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        categoryId: product.categoryId,
        name: product.name,
        kind: product.kind,
        inventoryUnitId: product.inventoryUnitId,
        salesUnitId: product.salesUnitId,
        purchaseUnitId: product.purchaseUnitId,
        productionUnitId: product.productionUnitId,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          categoryId: product.categoryId,
          name: product.name,
          kind: product.kind,
          inventoryUnitId: product.inventoryUnitId,
          salesUnitId: product.salesUnitId,
          purchaseUnitId: product.purchaseUnitId,
          productionUnitId: product.productionUnitId,
          isActive: true,
          updatedAt: now,
        },
      });
  }

  for (const presentation of DEVELOPMENT_PRODUCT_PRESENTATIONS) {
    await db
      .insert(productPresentations)
      .values({
        id: presentation.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        productId: presentation.productId,
        name: presentation.name,
        averageWeightGrams: presentation.averageWeightGrams,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: productPresentations.id,
        set: {
          name: presentation.name,
          averageWeightGrams: presentation.averageWeightGrams,
          isActive: true,
          updatedAt: now,
        },
      });
  }

  for (const price of DEVELOPMENT_PRODUCT_PRICES) {
    await db
      .insert(productPriceHistory)
      .values({
        id: price.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        productId: price.productId,
        amountMinor: price.amountMinor,
        currency,
        priceBasis: price.priceBasis,
        effectiveFrom: price.effectiveFrom,
      })
      .onConflictDoUpdate({
        target: productPriceHistory.id,
        set: {
          amountMinor: price.amountMinor,
          currency,
          priceBasis: price.priceBasis,
          effectiveFrom: price.effectiveFrom,
        },
      });
  }

  for (const batch of DEVELOPMENT_PRODUCTION_BATCHES) {
    const createdAt = new Date(batch.createdAt);
    const updatedAt = new Date(batch.updatedAt);
    const confirmedAt = batch.confirmedAt === undefined ? null : new Date(batch.confirmedAt);
    const correctedAt = batch.correctedAt === undefined ? null : new Date(batch.correctedAt);

    await db
      .insert(productionBatches)
      .values({
        id: batch.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: batch.branchId,
        businessDate: batch.businessDate,
        preparedByEmployeeId: batch.preparedByEmployeeId,
        registeredByUserId: batch.registeredByUserId,
        status: batch.status,
        note: batch.note ?? null,
        confirmedByUserId: batch.confirmedByUserId ?? null,
        confirmedAt,
        correctedByUserId: batch.correctedByUserId ?? null,
        correctedAt,
        correctionReason: batch.correctionReason ?? null,
        createdAt,
        updatedAt,
      })
      .onConflictDoNothing();

    for (const [index, input] of batch.inputs.entries()) {
      await db
        .insert(productionInputs)
        .values({
          id: input.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          batchId: batch.id,
          productId: input.productId,
          unitId: input.unitId,
          quantityMilli: input.quantityMilli,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }

    for (const [index, output] of batch.outputs.entries()) {
      await db
        .insert(productionOutputs)
        .values({
          id: output.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          batchId: batch.id,
          productId: output.productId,
          presentationId: output.presentationId,
          trayCount: output.trayCount,
          averageWeightPerTrayGrams: output.averageWeightPerTrayGrams,
          estimatedWeightGrams: output.estimatedWeightGrams,
          measuredWeightGrams: output.measuredWeightGrams ?? null,
          weightBasis: output.weightBasis,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }

    for (const [index, waste] of batch.waste.entries()) {
      await db
        .insert(productionWaste)
        .values({
          id: waste.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          batchId: batch.id,
          productId: waste.productId,
          quantityMilli: waste.quantityMilli,
          reason: waste.reason,
          note: waste.note ?? null,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }
  }

  for (const checkpoint of DEVELOPMENT_SALES_CHECKPOINTS) {
    const createdAt = new Date(checkpoint.createdAt);
    const updatedAt = new Date(checkpoint.updatedAt);
    const confirmedAt =
      checkpoint.confirmedAt === undefined ? null : new Date(checkpoint.confirmedAt);
    const correctedAt =
      checkpoint.correctedAt === undefined ? null : new Date(checkpoint.correctedAt);

    await db
      .insert(salesCheckpoints)
      .values({
        id: checkpoint.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: checkpoint.branchId,
        businessDate: checkpoint.businessDate,
        period: checkpoint.period,
        status: checkpoint.status,
        registeredByUserId: checkpoint.registeredByUserId,
        note: checkpoint.note ?? null,
        confirmedByUserId: checkpoint.confirmedByUserId ?? null,
        confirmedAt,
        correctedByUserId: checkpoint.correctedByUserId ?? null,
        correctedAt,
        correctionReason: checkpoint.correctionReason ?? null,
        createdAt,
        updatedAt,
      })
      .onConflictDoNothing();

    for (const [index, item] of checkpoint.items.entries()) {
      await db
        .insert(salesCheckpointItems)
        .values({
          id: item.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          checkpointId: checkpoint.id,
          productId: item.productId,
          productKind: item.productKind,
          unitId: item.unitId,
          quantityMilli: item.quantityMilli,
          presentationId: item.presentationId ?? null,
          trayCount: item.trayCount ?? null,
          averageWeightPerTrayGrams: item.averageWeightPerTrayGrams ?? null,
          estimatedWeightGrams: item.estimatedWeightGrams ?? null,
          measuredWeightGrams: item.measuredWeightGrams ?? null,
          weightBasis: item.weightBasis,
          sellingPriceAmountMinor: item.sellingPriceAmountMinor,
          sellingPriceBasis: item.sellingPriceBasis,
          sellingPriceCurrency: currency,
          estimatedSalesValueMinor: item.estimatedSalesValueMinor,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }
  }

  for (const adjustment of DEVELOPMENT_STOCK_ADJUSTMENTS) {
    const occurredAt = new Date(adjustment.occurredAt);
    await db
      .insert(stockAdjustments)
      .values({
        id: adjustment.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: adjustment.branchId,
        productId: adjustment.productId,
        kind: adjustment.kind,
        quantityDeltaMilli: adjustment.quantityDeltaMilli,
        reason: adjustment.reason,
        expectedQuantityMilli: adjustment.expectedQuantityMilli ?? null,
        countedQuantityMilli: adjustment.countedQuantityMilli ?? null,
        note: adjustment.note ?? null,
        occurredAt,
        recordedAt: occurredAt,
        recordedByUserId: adjustment.recordedByUserId,
      })
      .onConflictDoNothing();
  }

  for (const waste of DEVELOPMENT_INVENTORY_WASTE) {
    const occurredAt = new Date(waste.occurredAt);
    await db
      .insert(inventoryWaste)
      .values({
        id: waste.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: waste.branchId,
        productId: waste.productId,
        quantityMilli: waste.quantityMilli,
        reason: waste.reason,
        note: waste.note ?? null,
        occurredAt,
        recordedAt: occurredAt,
        recordedByUserId: waste.recordedByUserId,
      })
      .onConflictDoNothing();
  }

  for (const movement of DEVELOPMENT_STOCK_MOVEMENTS) {
    const occurredAt = new Date(movement.occurredAt);
    await db
      .insert(stockMovements)
      .values({
        id: movement.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: movement.branchId,
        productId: movement.productId,
        quantityDeltaMilli: movement.quantityDeltaMilli,
        reason: movement.reason,
        sourceType: movement.sourceType,
        sourceId: movement.sourceId,
        correctsMovementId: movement.correctsMovementId ?? null,
        occurredAt,
        recordedAt: occurredAt,
        recordedByUserId: movement.recordedByUserId,
        note: movement.note ?? null,
      })
      .onConflictDoNothing();
  }
}

async function seedSqlite(db: BetterSQLite3Database<typeof sqliteSchema>): Promise<void> {
  const {
    branches,
    employees,
    inventoryWaste,
    measurementUnits,
    organizations,
    productCategories,
    productPresentations,
    productPriceHistory,
    productionBatches,
    salesCheckpointItems,
    salesCheckpoints,
    productionInputs,
    productionOutputs,
    productionWaste,
    products,
    stockAdjustments,
    stockMovements,
    suppliers,
    users,
  } = sqliteSchema;
  const passwordHash = await hashPassword(DEVELOPMENT_PASSWORD);
  const now = new Date();

  await db
    .insert(organizations)
    .values({
      id: DEVELOPMENT_ORGANIZATION_ID,
      name: DEVELOPMENT_ORGANIZATION_NAME,
      timezone,
      currency,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: DEVELOPMENT_ORGANIZATION_NAME,
        timezone,
        currency,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  for (const user of DEVELOPMENT_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          passwordHash,
          fullName: user.fullName,
          role: user.role,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  for (const unit of DEVELOPMENT_MEASUREMENT_UNITS) {
    await db
      .insert(measurementUnits)
      .values({
        id: unit.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        code: unit.code,
        name: unit.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: measurementUnits.id,
        set: { code: unit.code, name: unit.name, isActive: true, updatedAt: now },
      });
  }

  for (const category of DEVELOPMENT_PRODUCT_CATEGORIES) {
    await db
      .insert(productCategories)
      .values({
        id: category.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        name: category.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: productCategories.id,
        set: { name: category.name, isActive: true, updatedAt: now },
      });
  }

  for (const branch of DEVELOPMENT_BRANCHES) {
    await db
      .insert(branches)
      .values({
        id: branch.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        name: branch.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: branches.id,
        set: { name: branch.name, isActive: true, updatedAt: now },
      });
  }

  for (const supplier of DEVELOPMENT_SUPPLIERS) {
    await db
      .insert(suppliers)
      .values({
        id: supplier.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        name: supplier.name,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: suppliers.id,
        set: { name: supplier.name, isActive: true, updatedAt: now },
      });
  }

  for (const employee of DEVELOPMENT_EMPLOYEES) {
    await db
      .insert(employees)
      .values({
        id: employee.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: employee.branchId,
        fullName: employee.fullName,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: employees.id,
        set: {
          branchId: employee.branchId,
          fullName: employee.fullName,
          isActive: true,
          updatedAt: now,
        },
      });
  }

  for (const product of DEVELOPMENT_PRODUCTS) {
    await db
      .insert(products)
      .values({
        id: product.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        categoryId: product.categoryId,
        name: product.name,
        kind: product.kind,
        inventoryUnitId: product.inventoryUnitId,
        salesUnitId: product.salesUnitId,
        purchaseUnitId: product.purchaseUnitId,
        productionUnitId: product.productionUnitId,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          categoryId: product.categoryId,
          name: product.name,
          kind: product.kind,
          inventoryUnitId: product.inventoryUnitId,
          salesUnitId: product.salesUnitId,
          purchaseUnitId: product.purchaseUnitId,
          productionUnitId: product.productionUnitId,
          isActive: true,
          updatedAt: now,
        },
      });
  }

  for (const presentation of DEVELOPMENT_PRODUCT_PRESENTATIONS) {
    await db
      .insert(productPresentations)
      .values({
        id: presentation.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        productId: presentation.productId,
        name: presentation.name,
        averageWeightGrams: presentation.averageWeightGrams,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: productPresentations.id,
        set: {
          name: presentation.name,
          averageWeightGrams: presentation.averageWeightGrams,
          isActive: true,
          updatedAt: now,
        },
      });
  }

  for (const price of DEVELOPMENT_PRODUCT_PRICES) {
    await db
      .insert(productPriceHistory)
      .values({
        id: price.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        productId: price.productId,
        amountMinor: price.amountMinor,
        currency,
        priceBasis: price.priceBasis,
        effectiveFrom: price.effectiveFrom,
      })
      .onConflictDoUpdate({
        target: productPriceHistory.id,
        set: {
          amountMinor: price.amountMinor,
          currency,
          priceBasis: price.priceBasis,
          effectiveFrom: price.effectiveFrom,
        },
      });
  }

  for (const batch of DEVELOPMENT_PRODUCTION_BATCHES) {
    const createdAt = new Date(batch.createdAt);
    const updatedAt = new Date(batch.updatedAt);
    const confirmedAt = batch.confirmedAt === undefined ? null : new Date(batch.confirmedAt);
    const correctedAt = batch.correctedAt === undefined ? null : new Date(batch.correctedAt);

    await db
      .insert(productionBatches)
      .values({
        id: batch.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: batch.branchId,
        businessDate: batch.businessDate,
        preparedByEmployeeId: batch.preparedByEmployeeId,
        registeredByUserId: batch.registeredByUserId,
        status: batch.status,
        note: batch.note ?? null,
        confirmedByUserId: batch.confirmedByUserId ?? null,
        confirmedAt,
        correctedByUserId: batch.correctedByUserId ?? null,
        correctedAt,
        correctionReason: batch.correctionReason ?? null,
        createdAt,
        updatedAt,
      })
      .onConflictDoNothing();

    for (const [index, input] of batch.inputs.entries()) {
      await db
        .insert(productionInputs)
        .values({
          id: input.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          batchId: batch.id,
          productId: input.productId,
          unitId: input.unitId,
          quantityMilli: input.quantityMilli,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }

    for (const [index, output] of batch.outputs.entries()) {
      await db
        .insert(productionOutputs)
        .values({
          id: output.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          batchId: batch.id,
          productId: output.productId,
          presentationId: output.presentationId,
          trayCount: output.trayCount,
          averageWeightPerTrayGrams: output.averageWeightPerTrayGrams,
          estimatedWeightGrams: output.estimatedWeightGrams,
          measuredWeightGrams: output.measuredWeightGrams ?? null,
          weightBasis: output.weightBasis,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }

    for (const [index, waste] of batch.waste.entries()) {
      await db
        .insert(productionWaste)
        .values({
          id: waste.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          batchId: batch.id,
          productId: waste.productId,
          quantityMilli: waste.quantityMilli,
          reason: waste.reason,
          note: waste.note ?? null,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }
  }

  for (const checkpoint of DEVELOPMENT_SALES_CHECKPOINTS) {
    const createdAt = new Date(checkpoint.createdAt);
    const updatedAt = new Date(checkpoint.updatedAt);
    const confirmedAt =
      checkpoint.confirmedAt === undefined ? null : new Date(checkpoint.confirmedAt);
    const correctedAt =
      checkpoint.correctedAt === undefined ? null : new Date(checkpoint.correctedAt);

    await db
      .insert(salesCheckpoints)
      .values({
        id: checkpoint.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: checkpoint.branchId,
        businessDate: checkpoint.businessDate,
        period: checkpoint.period,
        status: checkpoint.status,
        registeredByUserId: checkpoint.registeredByUserId,
        note: checkpoint.note ?? null,
        confirmedByUserId: checkpoint.confirmedByUserId ?? null,
        confirmedAt,
        correctedByUserId: checkpoint.correctedByUserId ?? null,
        correctedAt,
        correctionReason: checkpoint.correctionReason ?? null,
        createdAt,
        updatedAt,
      })
      .onConflictDoNothing();

    for (const [index, item] of checkpoint.items.entries()) {
      await db
        .insert(salesCheckpointItems)
        .values({
          id: item.id,
          organizationId: DEVELOPMENT_ORGANIZATION_ID,
          checkpointId: checkpoint.id,
          productId: item.productId,
          productKind: item.productKind,
          unitId: item.unitId,
          quantityMilli: item.quantityMilli,
          presentationId: item.presentationId ?? null,
          trayCount: item.trayCount ?? null,
          averageWeightPerTrayGrams: item.averageWeightPerTrayGrams ?? null,
          estimatedWeightGrams: item.estimatedWeightGrams ?? null,
          measuredWeightGrams: item.measuredWeightGrams ?? null,
          weightBasis: item.weightBasis,
          sellingPriceAmountMinor: item.sellingPriceAmountMinor,
          sellingPriceBasis: item.sellingPriceBasis,
          sellingPriceCurrency: currency,
          estimatedSalesValueMinor: item.estimatedSalesValueMinor,
          position: index + 1,
          createdAt,
        })
        .onConflictDoNothing();
    }
  }

  for (const adjustment of DEVELOPMENT_STOCK_ADJUSTMENTS) {
    const occurredAt = new Date(adjustment.occurredAt);
    await db
      .insert(stockAdjustments)
      .values({
        id: adjustment.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: adjustment.branchId,
        productId: adjustment.productId,
        kind: adjustment.kind,
        quantityDeltaMilli: adjustment.quantityDeltaMilli,
        reason: adjustment.reason,
        expectedQuantityMilli: adjustment.expectedQuantityMilli ?? null,
        countedQuantityMilli: adjustment.countedQuantityMilli ?? null,
        note: adjustment.note ?? null,
        occurredAt,
        recordedAt: occurredAt,
        recordedByUserId: adjustment.recordedByUserId,
      })
      .onConflictDoNothing();
  }

  for (const waste of DEVELOPMENT_INVENTORY_WASTE) {
    const occurredAt = new Date(waste.occurredAt);
    await db
      .insert(inventoryWaste)
      .values({
        id: waste.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: waste.branchId,
        productId: waste.productId,
        quantityMilli: waste.quantityMilli,
        reason: waste.reason,
        note: waste.note ?? null,
        occurredAt,
        recordedAt: occurredAt,
        recordedByUserId: waste.recordedByUserId,
      })
      .onConflictDoNothing();
  }

  for (const movement of DEVELOPMENT_STOCK_MOVEMENTS) {
    const occurredAt = new Date(movement.occurredAt);
    await db
      .insert(stockMovements)
      .values({
        id: movement.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        branchId: movement.branchId,
        productId: movement.productId,
        quantityDeltaMilli: movement.quantityDeltaMilli,
        reason: movement.reason,
        sourceType: movement.sourceType,
        sourceId: movement.sourceId,
        correctsMovementId: movement.correctsMovementId ?? null,
        occurredAt,
        recordedAt: occurredAt,
        recordedByUserId: movement.recordedByUserId,
        note: movement.note ?? null,
      })
      .onConflictDoNothing();
  }
}

if (isSqliteUrl(databaseUrl)) {
  ensureSqliteDatabaseDirectory(databaseUrl);
  const client = new Database(sqliteDatabasePath(databaseUrl));
  client.pragma('foreign_keys = ON');
  const db = sqliteDrizzle(client, { schema: sqliteSchema, casing: 'snake_case' });

  try {
    await seedSqlite(db);
    console.log(`Seeded SQLite organization ${DEVELOPMENT_ORGANIZATION_ID}`);
    console.log(`Development users: ${DEVELOPMENT_USERS.map((user) => user.email).join(', ')}`);
    console.log(`Password: ${DEVELOPMENT_PASSWORD}`);
  } finally {
    client.close();
  }
} else {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema: pgSchema, casing: 'snake_case' });

  try {
    await seedPostgres(db);
    console.log(`Seeded PostgreSQL organization ${DEVELOPMENT_ORGANIZATION_ID}`);
    console.log(`Development users: ${DEVELOPMENT_USERS.map((user) => user.email).join(', ')}`);
    console.log(`Password: ${DEVELOPMENT_PASSWORD}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
