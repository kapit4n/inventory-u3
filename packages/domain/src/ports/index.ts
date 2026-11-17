/**
 * Domain ports — the interfaces the outside world must satisfy.
 *
 * The domain declares these; infrastructure implements them. That inversion keeps
 * `packages/domain` free of Drizzle, PostgreSQL, HTTP and React: the domain says
 * what it needs, never how it is stored or transported.
 */

import type {
  BranchId,
  DailyClosingId,
  EmployeeId,
  InventoryWasteId,
  IsoDate,
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductCategoryId,
  ProductId,
  ProductPresentationId,
  ProductionBatchId,
  PurchaseId,
  SalesCheckpointId,
  StockAdjustmentId,
  SessionId,
  SupplierId,
  UserId,
} from '@inventory-u3/types';

import type { Branch } from '../branch/branch.js';
import type {
  DailyClosing,
  DailyClosingConfirmation,
  DailyClosingReopening,
  DailyClosingReview,
  DailyClosingSources,
} from '../daily-closing/daily-closing.js';
import type { Employee } from '../employee/employee.js';
import type { Supplier } from '../supplier/supplier.js';
import type { AuthenticatedUser, Session, UserWithCredentials } from '../organization/auth.js';
import type { Organization, OrganizationSettingsUpdate } from '../organization/organization.js';
import type { MeasurementUnit } from '../product/measurement-unit.js';
import type { ProductCategory } from '../product/product-category.js';
import type { ProductPresentation } from '../product/product-presentation.js';
import type { ProductPriceHistory } from '../product/product-price-history.js';
import type { Product } from '../product/product.js';
import type {
  ProductionBatch,
  ProductionConfirmation,
  ProductionCorrection,
} from '../production/production-batch.js';
import type { PurchaseCorrection } from '../purchase/purchase-correction.js';
import type { Purchase, PurchaseReceipt } from '../purchase/purchase.js';
import type { ReportQuery, ReportSource } from '../reporting/report.js';
import type {
  SalesCheckpoint,
  SalesCheckpointConfirmation,
  SalesCheckpointCorrection,
  SalesCheckpointPeriod,
} from '../sales-checkpoint/sales-checkpoint.js';
import type { InventoryWaste } from '../stock/inventory-waste.js';
import type { StockAdjustment } from '../stock/stock-adjustment.js';
import type { StockBalance } from '../stock/stock-balance.js';
import type { StockMovement } from '../stock/stock-movement.js';
import type { StockMovementSource } from '../stock/stock-movement-source.js';

export interface UnitOfWork {
  transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

/**
 * What one transaction is handed.
 *
 * This set grows only when an implementation exists in both engines. Keeping a
 * name here that no engine can build is a promise the code cannot keep.
 */
export interface Repositories {
  readonly organizations: OrganizationRepository;
  readonly branches: BranchRepository;
  readonly employees: EmployeeRepository;
  readonly suppliers: SupplierRepository;
  readonly measurementUnits: MeasurementUnitRepository;
  readonly productCategories: ProductCategoryRepository;
  readonly products: ProductRepository;
  readonly productPresentations: ProductPresentationRepository;
  readonly productPriceHistory: ProductPriceHistoryRepository;
  readonly purchases: PurchaseRepository;
  readonly purchaseCorrections: PurchaseCorrectionRepository;
  readonly productionBatches: ProductionBatchRepository;
  readonly salesCheckpoints: SalesCheckpointRepository;
  readonly dailyClosings: DailyClosingRepository;
  readonly reports: ReportRepository;
  readonly stockMovements: StockMovementRepository;
  readonly stockAdjustments: StockAdjustmentRepository;
  readonly inventoryWaste: InventoryWasteRepository;
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
}

export interface OrganizationRepository {
  findById(organizationId: OrganizationId): Promise<Organization | undefined>;
  updateSettings(
    organizationId: OrganizationId,
    settings: OrganizationSettingsUpdate,
  ): Promise<Organization | undefined>;
  getDefault(): Promise<Organization | undefined>;
}

export interface BranchRepository {
  findById(organizationId: OrganizationId, branchId: BranchId): Promise<Branch | undefined>;
  findByName(organizationId: OrganizationId, name: string): Promise<Branch | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly Branch[]>;
  create(branch: Branch): Promise<Branch>;
  /** Returns `undefined` when the branch does not belong to the organization. */
  update(branch: Branch): Promise<Branch | undefined>;
}

export interface EmployeeRepository {
  findById(organizationId: OrganizationId, employeeId: EmployeeId): Promise<Employee | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly Employee[]>;
  create(employee: Employee): Promise<Employee>;
  /** Returns `undefined` when the employee does not belong to the organization. */
  update(employee: Employee): Promise<Employee | undefined>;
}

export interface SupplierRepository {
  findById(organizationId: OrganizationId, supplierId: SupplierId): Promise<Supplier | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly Supplier[]>;
  create(supplier: Supplier): Promise<Supplier>;
  /** Returns `undefined` when the supplier does not belong to the organization. */
  update(supplier: Supplier): Promise<Supplier | undefined>;
}

export interface MeasurementUnitRepository {
  findById(
    organizationId: OrganizationId,
    measurementUnitId: MeasurementUnitId,
  ): Promise<MeasurementUnit | undefined>;
  findByCode(organizationId: OrganizationId, code: string): Promise<MeasurementUnit | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly MeasurementUnit[]>;
  create(measurementUnit: MeasurementUnit): Promise<MeasurementUnit>;
  /** Returns `undefined` when the unit does not belong to the organization. */
  update(measurementUnit: MeasurementUnit): Promise<MeasurementUnit | undefined>;
}

export interface ProductCategoryRepository {
  findById(
    organizationId: OrganizationId,
    productCategoryId: ProductCategoryId,
  ): Promise<ProductCategory | undefined>;
  findByName(organizationId: OrganizationId, name: string): Promise<ProductCategory | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly ProductCategory[]>;
  create(productCategory: ProductCategory): Promise<ProductCategory>;
  /** Returns `undefined` when the category does not belong to the organization. */
  update(productCategory: ProductCategory): Promise<ProductCategory | undefined>;
}

export interface ProductRepository {
  findById(organizationId: OrganizationId, productId: ProductId): Promise<Product | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly Product[]>;
  create(product: Product): Promise<Product>;
  /** Returns `undefined` when the product does not belong to the organization. */
  update(product: Product): Promise<Product | undefined>;
}

export interface ProductPresentationRepository {
  findById(
    organizationId: OrganizationId,
    productPresentationId: ProductPresentationId,
  ): Promise<ProductPresentation | undefined>;
  findByProductAndName(
    organizationId: OrganizationId,
    productId: ProductId,
    name: string,
  ): Promise<ProductPresentation | undefined>;
  listByProduct(
    organizationId: OrganizationId,
    productId: ProductId,
  ): Promise<readonly ProductPresentation[]>;
  create(productPresentation: ProductPresentation): Promise<ProductPresentation>;
  /** Returns `undefined` when the presentation does not belong to the organization. */
  update(productPresentation: ProductPresentation): Promise<ProductPresentation | undefined>;
}

export interface ProductPriceHistoryRepository {
  findByProductAndEffectiveFrom(
    organizationId: OrganizationId,
    productId: ProductId,
    effectiveFrom: IsoDate,
  ): Promise<ProductPriceHistory | undefined>;
  /** Newest effective date first. */
  listByProduct(
    organizationId: OrganizationId,
    productId: ProductId,
  ): Promise<readonly ProductPriceHistory[]>;
  create(productPriceHistory: ProductPriceHistory): Promise<ProductPriceHistory>;
}

export interface PurchaseRepository {
  findById(organizationId: OrganizationId, purchaseId: PurchaseId): Promise<Purchase | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly Purchase[]>;
  listByBranch(organizationId: OrganizationId, branchId: BranchId): Promise<readonly Purchase[]>;
  create(purchase: Purchase): Promise<Purchase>;
  /** Returns `undefined` when the purchase is not a draft in this organization. */
  markReceived(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
    receipt: PurchaseReceipt,
  ): Promise<Purchase | undefined>;
  /** Returns `undefined` when the purchase is not a draft in this organization. */
  markCancelled(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
    at: IsoDateTime,
  ): Promise<Purchase | undefined>;
  /** Returns `undefined` when the purchase is not received in this organization. */
  markCorrected(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
    correction: { readonly correctedByUserId: UserId; readonly correctedAt: IsoDateTime },
  ): Promise<Purchase | undefined>;
}

export interface ProductionBatchRepository {
  findById(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
  ): Promise<ProductionBatch | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly ProductionBatch[]>;
  listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly ProductionBatch[]>;
  create(productionBatch: ProductionBatch): Promise<ProductionBatch>;
  /** Returns `undefined` when the batch is not a draft in this organization. */
  markConfirmed(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
    confirmation: ProductionConfirmation,
  ): Promise<ProductionBatch | undefined>;
  /** Returns `undefined` when the batch is not confirmed in this organization. */
  markCorrected(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
    correction: ProductionCorrection,
  ): Promise<ProductionBatch | undefined>;
  /** Removes a draft and its lines. Returns `false` when it is not a draft. */
  deleteDraft(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
  ): Promise<boolean>;
}

export interface SalesCheckpointRepository {
  findById(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
  ): Promise<SalesCheckpoint | undefined>;
  findByPeriod(
    organizationId: OrganizationId,
    branchId: BranchId,
    businessDate: IsoDate,
    period: SalesCheckpointPeriod,
  ): Promise<SalesCheckpoint | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly SalesCheckpoint[]>;
  listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly SalesCheckpoint[]>;
  create(salesCheckpoint: SalesCheckpoint): Promise<SalesCheckpoint>;
  /** Returns `undefined` when the checkpoint is not a draft in this organization. */
  markConfirmed(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
    confirmation: SalesCheckpointConfirmation,
  ): Promise<SalesCheckpoint | undefined>;
  /** Returns `undefined` when the checkpoint is not confirmed in this organization. */
  markCorrected(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
    correction: SalesCheckpointCorrection,
  ): Promise<SalesCheckpoint | undefined>;
  /** Removes a draft and its lines. Returns `false` when it is not a draft. */
  deleteDraft(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
  ): Promise<boolean>;
}

export interface DailyClosingRepository {
  findById(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
  ): Promise<DailyClosing | undefined>;
  /** Highest version for the branch and business date, including a reopened version. */
  findCurrent(
    organizationId: OrganizationId,
    branchId: BranchId,
    businessDate: IsoDate,
  ): Promise<DailyClosing | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly DailyClosing[]>;
  listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly DailyClosing[]>;
  /**
   * Aggregates the evidence a closing snapshot needs. The interval is
   * `[startsAt, endsAt)`, resolved in the organization timezone by the caller.
   */
  readSources(
    organizationId: OrganizationId,
    branchId: BranchId,
    businessDate: IsoDate,
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
  ): Promise<DailyClosingSources>;
  create(dailyClosing: DailyClosing): Promise<DailyClosing>;
  /** Returns `undefined` when the closing is not a draft in this organization. */
  markReviewed(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
    review: DailyClosingReview,
  ): Promise<DailyClosing | undefined>;
  /** Returns `undefined` when the closing is not draft or reviewed in this organization. */
  markConfirmed(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
    confirmation: DailyClosingConfirmation,
  ): Promise<DailyClosing | undefined>;
  /** Returns `undefined` when the closing is not confirmed in this organization. */
  markReopened(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
    reopening: DailyClosingReopening,
  ): Promise<DailyClosing | undefined>;
}

export interface ReportRepository {
  readSources(
    organizationId: OrganizationId,
    query: ReportQuery,
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
  ): Promise<ReportSource>;
}

export interface PurchaseCorrectionRepository {
  findByPurchaseId(
    organizationId: OrganizationId,
    purchaseId: PurchaseId,
  ): Promise<PurchaseCorrection | undefined>;
  create(purchaseCorrection: PurchaseCorrection): Promise<PurchaseCorrection>;
}

export interface StockMovementRepository {
  create(stockMovement: StockMovement): Promise<StockMovement>;
  listBySource(
    organizationId: OrganizationId,
    source: StockMovementSource,
  ): Promise<readonly StockMovement[]>;
  /** Newest movement first. */
  listByBranchAndProduct(
    organizationId: OrganizationId,
    branchId: BranchId,
    productId: ProductId,
  ): Promise<readonly StockMovement[]>;
  /** Derived sum of every movement for one branch/product; zero when none exist. */
  getBalanceMilli(
    organizationId: OrganizationId,
    branchId: BranchId,
    productId: ProductId,
  ): Promise<number>;
  /** One row per product that has at least one movement in the branch. */
  listBalancesByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly StockBalance[]>;
}

export interface StockAdjustmentRepository {
  findById(
    organizationId: OrganizationId,
    stockAdjustmentId: StockAdjustmentId,
  ): Promise<StockAdjustment | undefined>;
  listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly StockAdjustment[]>;
  create(stockAdjustment: StockAdjustment): Promise<StockAdjustment>;
}

export interface InventoryWasteRepository {
  findById(
    organizationId: OrganizationId,
    inventoryWasteId: InventoryWasteId,
  ): Promise<InventoryWaste | undefined>;
  listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly InventoryWaste[]>;
  create(inventoryWaste: InventoryWaste): Promise<InventoryWaste>;
}

export interface UserRepository {
  findById(organizationId: OrganizationId, userId: UserId): Promise<AuthenticatedUser | undefined>;
  findByEmailForLogin(
    organizationId: OrganizationId,
    email: string,
  ): Promise<UserWithCredentials | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly AuthenticatedUser[]>;
  recordLogin(organizationId: OrganizationId, userId: UserId, at: IsoDateTime): Promise<void>;
}

export interface SessionRepository {
  findById(sessionId: SessionId): Promise<Session | undefined>;
  findByTokenHash(tokenHash: string): Promise<Session | undefined>;
  save(session: Session): Promise<void>;
  revoke(tokenHash: string, at: IsoDateTime): Promise<void>;
}
