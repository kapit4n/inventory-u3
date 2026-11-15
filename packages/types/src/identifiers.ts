/**
 * Branded identifier types.
 *
 * A `UserId` and an `OrganizationId` are both strings at runtime; branding them
 * makes mixing them a compile-time error. `asUserId(...)` is the single,
 * explicit way to obtain one.
 */

declare const brand: unique symbol;

export type Brand<TValue, TBrand extends string> = TValue & {
  readonly [brand]: TBrand;
};

export type OrganizationId = Brand<string, 'OrganizationId'>;
export type UserId = Brand<string, 'UserId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type BranchId = Brand<string, 'BranchId'>;
export type EmployeeId = Brand<string, 'EmployeeId'>;
export type SupplierId = Brand<string, 'SupplierId'>;
export type MeasurementUnitId = Brand<string, 'MeasurementUnitId'>;
export type ProductCategoryId = Brand<string, 'ProductCategoryId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type ProductPresentationId = Brand<string, 'ProductPresentationId'>;
export type ProductPriceHistoryId = Brand<string, 'ProductPriceHistoryId'>;
export type StockMovementId = Brand<string, 'StockMovementId'>;
export type PurchaseId = Brand<string, 'PurchaseId'>;
export type PurchaseItemId = Brand<string, 'PurchaseItemId'>;
export type PurchaseCorrectionId = Brand<string, 'PurchaseCorrectionId'>;
export type StockAdjustmentId = Brand<string, 'StockAdjustmentId'>;
export type InventoryWasteId = Brand<string, 'InventoryWasteId'>;

export type OrganizationIdentifier =
  | OrganizationId
  | UserId
  | SessionId
  | BranchId
  | EmployeeId
  | SupplierId
  | MeasurementUnitId
  | ProductCategoryId
  | ProductId
  | ProductPresentationId
  | ProductPriceHistoryId
  | StockMovementId
  | PurchaseId
  | PurchaseItemId
  | PurchaseCorrectionId
  | StockAdjustmentId
  | InventoryWasteId;

export const asOrganizationId = (value: string): OrganizationId => value as OrganizationId;
export const asUserId = (value: string): UserId => value as UserId;
export const asSessionId = (value: string): SessionId => value as SessionId;
export const asBranchId = (value: string): BranchId => value as BranchId;
export const asEmployeeId = (value: string): EmployeeId => value as EmployeeId;
export const asSupplierId = (value: string): SupplierId => value as SupplierId;
export const asMeasurementUnitId = (value: string): MeasurementUnitId => value as MeasurementUnitId;
export const asProductCategoryId = (value: string): ProductCategoryId => value as ProductCategoryId;
export const asProductId = (value: string): ProductId => value as ProductId;
export const asProductPresentationId = (value: string): ProductPresentationId =>
  value as ProductPresentationId;
export const asProductPriceHistoryId = (value: string): ProductPriceHistoryId =>
  value as ProductPriceHistoryId;
export const asStockMovementId = (value: string): StockMovementId => value as StockMovementId;
export const asPurchaseId = (value: string): PurchaseId => value as PurchaseId;
export const asPurchaseItemId = (value: string): PurchaseItemId => value as PurchaseItemId;
export const asPurchaseCorrectionId = (value: string): PurchaseCorrectionId =>
  value as PurchaseCorrectionId;
export const asStockAdjustmentId = (value: string): StockAdjustmentId => value as StockAdjustmentId;
export const asInventoryWasteId = (value: string): InventoryWasteId => value as InventoryWasteId;
