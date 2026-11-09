/**
 * Domain ports — the interfaces the outside world must satisfy.
 *
 * The domain declares these; infrastructure implements them. That inversion keeps
 * `packages/domain` free of Drizzle, PostgreSQL, HTTP and React: the domain says
 * what it needs, never how it is stored or transported.
 */

import type {
  BranchId,
  EmployeeId,
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductCategoryId,
  ProductId,
  ProductPresentationId,
  SessionId,
  UserId,
} from '@inventory-u3/types';

import type { Branch } from '../branch/branch.js';
import type { Employee } from '../employee/employee.js';
import type { AuthenticatedUser, Session, UserWithCredentials } from '../organization/auth.js';
import type { Organization, OrganizationSettingsUpdate } from '../organization/organization.js';
import type { MeasurementUnit } from '../product/measurement-unit.js';
import type { ProductCategory } from '../product/product-category.js';
import type { ProductPresentation } from '../product/product-presentation.js';
import type { Product } from '../product/product.js';

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
  readonly measurementUnits: MeasurementUnitRepository;
  readonly productCategories: ProductCategoryRepository;
  readonly products: ProductRepository;
  readonly productPresentations: ProductPresentationRepository;
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

export interface MeasurementUnitRepository {
  findById(
    organizationId: OrganizationId,
    measurementUnitId: MeasurementUnitId,
  ): Promise<MeasurementUnit | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly MeasurementUnit[]>;
  create(measurementUnit: MeasurementUnit): Promise<MeasurementUnit>;
}

export interface ProductCategoryRepository {
  findById(
    organizationId: OrganizationId,
    productCategoryId: ProductCategoryId,
  ): Promise<ProductCategory | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly ProductCategory[]>;
  create(productCategory: ProductCategory): Promise<ProductCategory>;
}

export interface ProductRepository {
  findById(organizationId: OrganizationId, productId: ProductId): Promise<Product | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly Product[]>;
  create(product: Product): Promise<Product>;
}

export interface ProductPresentationRepository {
  findById(
    organizationId: OrganizationId,
    productPresentationId: ProductPresentationId,
  ): Promise<ProductPresentation | undefined>;
  listByProduct(
    organizationId: OrganizationId,
    productId: ProductId,
  ): Promise<readonly ProductPresentation[]>;
  create(productPresentation: ProductPresentation): Promise<ProductPresentation>;
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
