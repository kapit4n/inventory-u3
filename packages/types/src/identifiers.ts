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

export type OrganizationIdentifier = OrganizationId | UserId | SessionId;

export const asOrganizationId = (value: string): OrganizationId => value as OrganizationId;
export const asUserId = (value: string): UserId => value as UserId;
export const asSessionId = (value: string): SessionId => value as SessionId;
