/**
 * Organization roles and the permissions they grant.
 *
 * Authorization lives in the domain and is enforced by the API — never by a UI
 * component. The UI may hide an affordance a user cannot use; that is a
 * convenience, not the control.
 */

export const ORGANIZATION_ROLES = ['ADMINISTRATOR', 'MANAGER', 'STAFF'] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const ORGANIZATION_PERMISSIONS = [
  'organization:read',
  'organization:manage',
  'users:read',
  'users:manage',
  'inventory:read',
  'inventory:write',
  'reports:read',
] as const;

export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Readonly<Record<OrganizationRole, readonly OrganizationPermission[]>> = {
  ADMINISTRATOR: ORGANIZATION_PERMISSIONS,
  MANAGER: ['organization:read', 'users:read', 'inventory:read', 'inventory:write', 'reports:read'],
  STAFF: ['organization:read', 'inventory:read', 'inventory:write'],
};

export function permissionsForRole(role: OrganizationRole): readonly OrganizationPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: OrganizationRole, permission: OrganizationPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasEveryPermission(
  role: OrganizationRole,
  permissions: readonly OrganizationPermission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}
