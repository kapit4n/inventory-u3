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
export type MeasurementUnitId = Brand<string, 'MeasurementUnitId'>;
export type ProductCategoryId = Brand<string, 'ProductCategoryId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type ProductPresentationId = Brand<string, 'ProductPresentationId'>;

export type OrganizationIdentifier =
  | OrganizationId
  | UserId
  | SessionId
  | BranchId
  | MeasurementUnitId
  | ProductCategoryId
  | ProductId
  | ProductPresentationId;

export const asOrganizationId = (value: string): OrganizationId => value as OrganizationId;
export const asUserId = (value: string): UserId => value as UserId;
export const asSessionId = (value: string): SessionId => value as SessionId;
export const asBranchId = (value: string): BranchId => value as BranchId;
export const asMeasurementUnitId = (value: string): MeasurementUnitId => value as MeasurementUnitId;
export const asProductCategoryId = (value: string): ProductCategoryId => value as ProductCategoryId;
export const asProductId = (value: string): ProductId => value as ProductId;
export const asProductPresentationId = (value: string): ProductPresentationId =>
  value as ProductPresentationId;
