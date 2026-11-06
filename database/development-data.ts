/** Fixed development data shared by the seed and the integration tests. */

/** Must match `ORGANIZATION_ID` in `.env.example`. */
export const DEVELOPMENT_ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

/** The organization name every seed run restores. */
export const DEVELOPMENT_ORGANIZATION_NAME = 'Inventory U3 Development';

export const DEVELOPMENT_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const DEVELOPMENT_CURRENCY = 'USD';

export const DEVELOPMENT_USERS = [
  {
    id: '11111111-3333-4444-8555-000000000001',
    email: 'admin@inventory.test',
    fullName: 'Ada Administrator',
    role: 'ADMINISTRATOR',
  },
  {
    id: '11111111-3333-4444-8555-000000000002',
    email: 'manager@inventory.test',
    fullName: 'Mia Manager',
    role: 'MANAGER',
  },
  {
    id: '11111111-3333-4444-8555-000000000003',
    email: 'staff@inventory.test',
    fullName: 'Sam Staff',
    role: 'STAFF',
  },
] as const;

/** The password every seeded development user shares. Printed by the seed. */
export const DEVELOPMENT_PASSWORD = 'inventory-dev';
