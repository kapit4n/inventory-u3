/** Fixed development data shared by the seed and the integration tests. */

import type {
  ProductionStatus,
  ProductionWeightBasis,
  SalesCheckpointPeriod,
  SalesCheckpointStatus,
  SalesCheckpointWeightBasis,
  StockMovementReason,
  StockMovementSourceType,
} from '@inventory-u3/domain';

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

/**
 * Sample master data for a fruit-and-vegetable store.
 *
 * These rows are illustrative development data, not confirmed business master
 * data. They use fixed ids so the seed stays idempotent, and they are restored
 * (not duplicated) on every run.
 */

export const DEVELOPMENT_BRANCHES = [
  { id: '22222222-2222-4222-8222-000000000001', name: 'Mercado Central' },
  { id: '22222222-2222-4222-8222-000000000002', name: 'Sucursal Palermo' },
  { id: '22222222-2222-4222-8222-000000000003', name: 'Sucursal Belgrano' },
] as const;

export const DEVELOPMENT_SUPPLIERS = [
  { id: '33333333-3333-4333-8333-000000000001', name: 'Mercado Central de Frutas' },
  { id: '33333333-3333-4333-8333-000000000002', name: 'Campo Verde Distribuciones' },
  { id: '33333333-3333-4333-8333-000000000003', name: 'Frutas del Valle S.A.' },
] as const;

export const DEVELOPMENT_EMPLOYEES = [
  {
    id: '44444444-4444-4444-8444-000000000001',
    branchId: '22222222-2222-4222-8222-000000000001',
    fullName: 'Lucía Fernández',
  },
  {
    id: '44444444-4444-4444-8444-000000000002',
    branchId: '22222222-2222-4222-8222-000000000001',
    fullName: 'Diego Ramírez',
  },
  {
    id: '44444444-4444-4444-8444-000000000003',
    branchId: '22222222-2222-4222-8222-000000000002',
    fullName: 'Sofía Martínez',
  },
  {
    id: '44444444-4444-4444-8444-000000000004',
    branchId: '22222222-2222-4222-8222-000000000003',
    fullName: 'Martín Gómez',
  },
] as const;

export const DEVELOPMENT_MEASUREMENT_UNITS = [
  { id: '55555555-5555-4555-8555-000000000001', code: 'kg', name: 'Kilogramo' },
  { id: '55555555-5555-4555-8555-000000000002', code: 'unit', name: 'Unidad' },
  { id: '55555555-5555-4555-8555-000000000003', code: 'tray', name: 'Bandeja' },
  { id: '55555555-5555-4555-8555-000000000004', code: 'box', name: 'Caja' },
  { id: '55555555-5555-4555-8555-000000000005', code: 'bunch', name: 'Atado' },
  { id: '55555555-5555-4555-8555-000000000006', code: 'bag', name: 'Bolsa' },
] as const;

const KG = '55555555-5555-4555-8555-000000000001';
const UNIT = '55555555-5555-4555-8555-000000000002';
const TRAY = '55555555-5555-4555-8555-000000000003';
const BOX = '55555555-5555-4555-8555-000000000004';
const BUNCH = '55555555-5555-4555-8555-000000000005';
const BAG = '55555555-5555-4555-8555-000000000006';

export const DEVELOPMENT_PRODUCT_CATEGORIES = [
  { id: '66666666-6666-4666-8666-000000000001', name: 'Frutas' },
  { id: '66666666-6666-4666-8666-000000000002', name: 'Verduras' },
  { id: '66666666-6666-4666-8666-000000000003', name: 'Frutas y verduras preparadas' },
  { id: '66666666-6666-4666-8666-000000000004', name: 'Hierbas aromáticas' },
] as const;

const FRUITS = '66666666-6666-4666-8666-000000000001';
const VEGETABLES = '66666666-6666-4666-8666-000000000002';
const PREPARED = '66666666-6666-4666-8666-000000000003';
const HERBS = '66666666-6666-4666-8666-000000000004';

export interface DevelopmentProduct {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly kind: 'RAW' | 'PROCESSED';
  readonly inventoryUnitId: string;
  readonly salesUnitId: string;
  readonly purchaseUnitId?: string;
  readonly productionUnitId?: string;
}

export const DEVELOPMENT_PRODUCTS: readonly DevelopmentProduct[] = [
  {
    id: '77777777-7777-4777-8777-000000000001',
    categoryId: FRUITS,
    name: 'Manzana Red Delicious',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000002',
    categoryId: FRUITS,
    name: 'Banana Ecuador',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000003',
    categoryId: FRUITS,
    name: 'Naranja Valencia',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BAG,
  },
  {
    id: '77777777-7777-4777-8777-000000000004',
    categoryId: FRUITS,
    name: 'Palta Hass',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000005',
    categoryId: FRUITS,
    name: 'Frutilla',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000006',
    categoryId: FRUITS,
    name: 'Uva Red Globe',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000007',
    categoryId: FRUITS,
    name: 'Pera Williams',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000008',
    categoryId: FRUITS,
    name: 'Limón',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BAG,
  },
  {
    id: '77777777-7777-4777-8777-000000000009',
    categoryId: VEGETABLES,
    name: 'Papa',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BAG,
  },
  {
    id: '77777777-7777-4777-8777-000000000010',
    categoryId: VEGETABLES,
    name: 'Cebolla',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BAG,
  },
  {
    id: '77777777-7777-4777-8777-000000000011',
    categoryId: VEGETABLES,
    name: 'Tomate',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000012',
    categoryId: VEGETABLES,
    name: 'Zanahoria',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BAG,
  },
  {
    id: '77777777-7777-4777-8777-000000000013',
    categoryId: VEGETABLES,
    name: 'Lechuga',
    kind: 'RAW',
    inventoryUnitId: UNIT,
    salesUnitId: UNIT,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000014',
    categoryId: VEGETABLES,
    name: 'Morrón',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000015',
    categoryId: VEGETABLES,
    name: 'Zapallo',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000016',
    categoryId: VEGETABLES,
    name: 'Brócoli',
    kind: 'RAW',
    inventoryUnitId: KG,
    salesUnitId: KG,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000017',
    categoryId: HERBS,
    name: 'Perejil',
    kind: 'RAW',
    inventoryUnitId: BUNCH,
    salesUnitId: BUNCH,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000018',
    categoryId: HERBS,
    name: 'Albahaca',
    kind: 'RAW',
    inventoryUnitId: BUNCH,
    salesUnitId: BUNCH,
    purchaseUnitId: BOX,
  },
  {
    id: '77777777-7777-4777-8777-000000000019',
    categoryId: PREPARED,
    name: 'Ensalada de frutas',
    kind: 'PROCESSED',
    inventoryUnitId: KG,
    salesUnitId: KG,
    productionUnitId: TRAY,
  },
  {
    id: '77777777-7777-4777-8777-000000000020',
    categoryId: PREPARED,
    name: 'Mix de verduras para wok',
    kind: 'PROCESSED',
    inventoryUnitId: KG,
    salesUnitId: KG,
    productionUnitId: TRAY,
  },
  {
    id: '77777777-7777-4777-8777-000000000021',
    categoryId: PREPARED,
    name: 'Frutillas lavadas',
    kind: 'PROCESSED',
    inventoryUnitId: KG,
    salesUnitId: KG,
    productionUnitId: TRAY,
  },
] as const;

export const DEVELOPMENT_PRODUCT_PRESENTATIONS = [
  {
    id: '88888888-8888-4888-8888-000000000001',
    productId: '77777777-7777-4777-8777-000000000019',
    name: 'Bandeja 500 g',
    averageWeightGrams: 500,
  },
  {
    id: '88888888-8888-4888-8888-000000000002',
    productId: '77777777-7777-4777-8777-000000000019',
    name: 'Bandeja 1 kg',
    averageWeightGrams: 1000,
  },
  {
    id: '88888888-8888-4888-8888-000000000003',
    productId: '77777777-7777-4777-8777-000000000020',
    name: 'Bandeja 500 g',
    averageWeightGrams: 500,
  },
  {
    id: '88888888-8888-4888-8888-000000000004',
    productId: '77777777-7777-4777-8777-000000000020',
    name: 'Bandeja 1 kg',
    averageWeightGrams: 1000,
  },
  {
    id: '88888888-8888-4888-8888-000000000005',
    productId: '77777777-7777-4777-8777-000000000021',
    name: 'Bandeja 250 g',
    averageWeightGrams: 250,
  },
  {
    id: '88888888-8888-4888-8888-000000000006',
    productId: '77777777-7777-4777-8777-000000000021',
    name: 'Bandeja 500 g',
    averageWeightGrams: 500,
  },
] as const;

export interface DevelopmentProductPrice {
  readonly id: string;
  readonly productId: string;
  readonly amountMinor: number;
  readonly priceBasis: 'PER_KILOGRAM' | 'PER_SALES_UNIT';
  readonly effectiveFrom: string;
}

export const DEVELOPMENT_PRODUCT_PRICES: readonly DevelopmentProductPrice[] = [
  {
    id: '99999999-9999-4999-8999-000000000001',
    productId: '77777777-7777-4777-8777-000000000001',
    amountMinor: 249,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000002',
    productId: '77777777-7777-4777-8777-000000000002',
    amountMinor: 179,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000003',
    productId: '77777777-7777-4777-8777-000000000003',
    amountMinor: 149,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000004',
    productId: '77777777-7777-4777-8777-000000000004',
    amountMinor: 399,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000005',
    productId: '77777777-7777-4777-8777-000000000005',
    amountMinor: 499,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000006',
    productId: '77777777-7777-4777-8777-000000000006',
    amountMinor: 399,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000007',
    productId: '77777777-7777-4777-8777-000000000007',
    amountMinor: 219,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000008',
    productId: '77777777-7777-4777-8777-000000000008',
    amountMinor: 199,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000009',
    productId: '77777777-7777-4777-8777-000000000009',
    amountMinor: 129,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000010',
    productId: '77777777-7777-4777-8777-000000000010',
    amountMinor: 119,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000011',
    productId: '77777777-7777-4777-8777-000000000011',
    amountMinor: 189,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000012',
    productId: '77777777-7777-4777-8777-000000000012',
    amountMinor: 109,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000013',
    productId: '77777777-7777-4777-8777-000000000013',
    amountMinor: 129,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000014',
    productId: '77777777-7777-4777-8777-000000000014',
    amountMinor: 299,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000015',
    productId: '77777777-7777-4777-8777-000000000015',
    amountMinor: 139,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000016',
    productId: '77777777-7777-4777-8777-000000000016',
    amountMinor: 249,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000017',
    productId: '77777777-7777-4777-8777-000000000017',
    amountMinor: 89,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000018',
    productId: '77777777-7777-4777-8777-000000000018',
    amountMinor: 99,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000019',
    productId: '77777777-7777-4777-8777-000000000019',
    amountMinor: 899,
    priceBasis: 'PER_KILOGRAM',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000020',
    productId: '77777777-7777-4777-8777-000000000020',
    amountMinor: 749,
    priceBasis: 'PER_KILOGRAM',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000021',
    productId: '77777777-7777-4777-8777-000000000021',
    amountMinor: 999,
    priceBasis: 'PER_KILOGRAM',
    effectiveFrom: '2026-11-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000022',
    productId: '77777777-7777-4777-8777-000000000001',
    amountMinor: 229,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-06-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000023',
    productId: '77777777-7777-4777-8777-000000000002',
    amountMinor: 169,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-06-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000024',
    productId: '77777777-7777-4777-8777-000000000005',
    amountMinor: 459,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-06-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000025',
    productId: '77777777-7777-4777-8777-000000000009',
    amountMinor: 119,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-06-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000026',
    productId: '77777777-7777-4777-8777-000000000011',
    amountMinor: 179,
    priceBasis: 'PER_SALES_UNIT',
    effectiveFrom: '2026-06-01',
  },
  {
    id: '99999999-9999-4999-8999-000000000027',
    productId: '77777777-7777-4777-8777-000000000019',
    amountMinor: 849,
    priceBasis: 'PER_KILOGRAM',
    effectiveFrom: '2026-06-01',
  },
] as const;

/** The seeded administrator records the illustrative inventory movements. */
const DEVELOPMENT_ADMIN_USER_ID = DEVELOPMENT_USERS[0].id;

const OPENING_STOCK_AT = '2026-11-10T12:00:00.000Z';
const INVENTORY_WASTE_AT = '2026-11-13T18:30:00.000Z';
const RECONCILIATION_AT = '2026-11-14T20:00:00.000Z';

export interface DevelopmentStockAdjustment {
  readonly id: string;
  readonly branchId: string;
  readonly productId: string;
  readonly kind: 'MANUAL' | 'RECONCILIATION';
  readonly quantityDeltaMilli: number;
  readonly reason: string;
  readonly expectedQuantityMilli?: number;
  readonly countedQuantityMilli?: number;
  readonly note?: string;
  readonly occurredAt: string;
  readonly recordedByUserId: string;
}

export interface DevelopmentInventoryWaste {
  readonly id: string;
  readonly branchId: string;
  readonly productId: string;
  readonly quantityMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly occurredAt: string;
  readonly recordedByUserId: string;
}

export interface DevelopmentStockMovement {
  readonly id: string;
  readonly branchId: string;
  readonly productId: string;
  readonly quantityDeltaMilli: number;
  readonly reason: StockMovementReason;
  readonly sourceType: StockMovementSourceType;
  readonly sourceId: string;
  readonly correctsMovementId?: string;
  readonly occurredAt: string;
  readonly recordedByUserId: string;
  readonly note?: string;
}

interface OpeningStockLine {
  readonly branchId: string;
  readonly productId: string;
  readonly quantityMilli: number;
}

const DEVELOPMENT_OPENING_STOCK: readonly OpeningStockLine[] = [
  {
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000001',
    quantityMilli: 45_500,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000002',
    quantityMilli: 32_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000003',
    quantityMilli: 28_750,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000009',
    quantityMilli: 60_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000011',
    quantityMilli: 24_500,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000013',
    quantityMilli: 40_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000019',
    quantityMilli: 12_500,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000001',
    quantityMilli: 18_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000004',
    quantityMilli: 9_500,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000005',
    quantityMilli: 6_250,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000011',
    quantityMilli: 14_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000012',
    quantityMilli: 19_750,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000020',
    quantityMilli: 7_500,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000007',
    quantityMilli: 16_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000006',
    quantityMilli: 11_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000010',
    quantityMilli: 22_500,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000014',
    quantityMilli: 8_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000017',
    quantityMilli: 30_000,
  },
  {
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000021',
    quantityMilli: 5_500,
  },
];

const DEVELOPMENT_STOCK_RECONCILIATIONS: readonly DevelopmentStockAdjustment[] = [
  {
    id: 'a2000000-0000-4000-8000-000000000001',
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000009',
    kind: 'RECONCILIATION',
    quantityDeltaMilli: -1_250,
    reason: 'Weekly physical count',
    expectedQuantityMilli: 60_000,
    countedQuantityMilli: 58_750,
    note: 'The count found 1.25 kg less than the ledger',
    occurredAt: RECONCILIATION_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000002',
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000012',
    kind: 'RECONCILIATION',
    quantityDeltaMilli: 500,
    reason: 'Weekly physical count',
    expectedQuantityMilli: 19_750,
    countedQuantityMilli: 20_250,
    note: 'The count found 0.5 kg more than the ledger',
    occurredAt: RECONCILIATION_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000003',
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000017',
    kind: 'RECONCILIATION',
    quantityDeltaMilli: 0,
    reason: 'Weekly physical count',
    expectedQuantityMilli: 30_000,
    countedQuantityMilli: 30_000,
    note: 'The count matched the ledger',
    occurredAt: RECONCILIATION_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
];

export const DEVELOPMENT_STOCK_ADJUSTMENTS: readonly DevelopmentStockAdjustment[] = [
  ...DEVELOPMENT_OPENING_STOCK.map((line, index) => ({
    id: `a1000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    branchId: line.branchId,
    productId: line.productId,
    kind: 'MANUAL' as const,
    quantityDeltaMilli: line.quantityMilli,
    reason: 'Opening stock',
    note: 'Illustrative development opening balance',
    occurredAt: OPENING_STOCK_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  })),
  ...DEVELOPMENT_STOCK_RECONCILIATIONS,
];

export const DEVELOPMENT_INVENTORY_WASTE: readonly DevelopmentInventoryWaste[] = [
  {
    id: 'a3000000-0000-4000-8000-000000000001',
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000002',
    quantityMilli: 2_500,
    reason: 'Damaged during handling',
    note: 'Bruised bananas discarded before opening',
    occurredAt: INVENTORY_WASTE_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
  {
    id: 'a3000000-0000-4000-8000-000000000002',
    branchId: '22222222-2222-4222-8222-000000000001',
    productId: '77777777-7777-4777-8777-000000000013',
    quantityMilli: 3_000,
    reason: 'Wilted leaves',
    note: 'Three lettuce heads discarded',
    occurredAt: INVENTORY_WASTE_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
  {
    id: 'a3000000-0000-4000-8000-000000000003',
    branchId: '22222222-2222-4222-8222-000000000002',
    productId: '77777777-7777-4777-8777-000000000005',
    quantityMilli: 750,
    reason: 'Mold detected',
    note: 'Strawberries discarded after inspection',
    occurredAt: INVENTORY_WASTE_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
  {
    id: 'a3000000-0000-4000-8000-000000000004',
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000006',
    quantityMilli: 1_000,
    reason: 'Damaged during handling',
    note: 'Grapes discarded after inspection',
    occurredAt: INVENTORY_WASTE_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
  {
    id: 'a3000000-0000-4000-8000-000000000005',
    branchId: '22222222-2222-4222-8222-000000000003',
    productId: '77777777-7777-4777-8777-000000000017',
    quantityMilli: 4_000,
    reason: 'Wilted bunches',
    note: 'Four parsley bunches discarded',
    occurredAt: INVENTORY_WASTE_AT,
    recordedByUserId: DEVELOPMENT_ADMIN_USER_ID,
  },
];

export interface DevelopmentProductionInput {
  readonly id: string;
  readonly productId: string;
  readonly unitId: string;
  readonly quantityMilli: number;
}

export interface DevelopmentProductionOutput {
  readonly id: string;
  readonly productId: string;
  readonly presentationId: string;
  readonly trayCount: number;
  readonly averageWeightPerTrayGrams: number;
  readonly estimatedWeightGrams: number;
  readonly measuredWeightGrams?: number;
  readonly weightBasis: ProductionWeightBasis;
}

export interface DevelopmentProductionWaste {
  readonly id: string;
  readonly productId: string;
  readonly quantityMilli: number;
  readonly reason: string;
  readonly note?: string;
}

export interface DevelopmentProductionBatch {
  readonly id: string;
  readonly branchId: string;
  readonly businessDate: string;
  readonly preparedByEmployeeId: string;
  readonly registeredByUserId: string;
  readonly status: ProductionStatus;
  readonly note?: string;
  readonly confirmedByUserId?: string;
  readonly confirmedAt?: string;
  readonly correctedByUserId?: string;
  readonly correctedAt?: string;
  readonly correctionReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly inputs: readonly DevelopmentProductionInput[];
  readonly outputs: readonly DevelopmentProductionOutput[];
  readonly waste: readonly DevelopmentProductionWaste[];
}

export const DEVELOPMENT_PRODUCTION_BATCHES: readonly DevelopmentProductionBatch[] = [
  {
    id: 'c1000000-0000-4000-8000-000000000001',
    branchId: '22222222-2222-4222-8222-000000000001',
    businessDate: '2026-11-15',
    preparedByEmployeeId: '44444444-4444-4444-8444-000000000001',
    registeredByUserId: DEVELOPMENT_ADMIN_USER_ID,
    status: 'DRAFT',
    note: 'Morning fruit salad preparation',
    createdAt: '2026-11-15T13:15:00.000Z',
    updatedAt: '2026-11-15T13:15:00.000Z',
    inputs: [
      {
        id: 'c1100000-0000-4000-8000-000000000001',
        productId: '77777777-7777-4777-8777-000000000001',
        unitId: '55555555-5555-4555-8555-000000000001',
        quantityMilli: 2_000,
      },
      {
        id: 'c1100000-0000-4000-8000-000000000002',
        productId: '77777777-7777-4777-8777-000000000002',
        unitId: '55555555-5555-4555-8555-000000000001',
        quantityMilli: 2_500,
      },
      {
        id: 'c1100000-0000-4000-8000-000000000003',
        productId: '77777777-7777-4777-8777-000000000003',
        unitId: '55555555-5555-4555-8555-000000000001',
        quantityMilli: 1_500,
      },
    ],
    outputs: [
      {
        id: 'c1200000-0000-4000-8000-000000000001',
        productId: '77777777-7777-4777-8777-000000000019',
        presentationId: '88888888-8888-4888-8888-000000000002',
        trayCount: 6,
        averageWeightPerTrayGrams: 1_000,
        estimatedWeightGrams: 6_000,
        weightBasis: 'ESTIMATED',
      },
    ],
    waste: [
      {
        id: 'c1300000-0000-4000-8000-000000000001',
        productId: '77777777-7777-4777-8777-000000000002',
        quantityMilli: 250,
        reason: 'Fruit damaged while cutting',
        note: 'Irregular pieces removed',
      },
    ],
  },
  {
    id: 'c1000000-0000-4000-8000-000000000002',
    branchId: '22222222-2222-4222-8222-000000000002',
    businessDate: '2026-11-14',
    preparedByEmployeeId: '44444444-4444-4444-8444-000000000003',
    registeredByUserId: DEVELOPMENT_ADMIN_USER_ID,
    status: 'CONFIRMED',
    note: 'Afternoon vegetable mix',
    confirmedByUserId: DEVELOPMENT_ADMIN_USER_ID,
    confirmedAt: '2026-11-14T14:35:00.000Z',
    createdAt: '2026-11-14T14:20:00.000Z',
    updatedAt: '2026-11-14T14:35:00.000Z',
    inputs: [
      {
        id: 'c1100000-0000-4000-8000-000000000004',
        productId: '77777777-7777-4777-8777-000000000011',
        unitId: '55555555-5555-4555-8555-000000000001',
        quantityMilli: 3_000,
      },
      {
        id: 'c1100000-0000-4000-8000-000000000005',
        productId: '77777777-7777-4777-8777-000000000012',
        unitId: '55555555-5555-4555-8555-000000000001',
        quantityMilli: 1_500,
      },
    ],
    outputs: [
      {
        id: 'c1200000-0000-4000-8000-000000000002',
        productId: '77777777-7777-4777-8777-000000000020',
        presentationId: '88888888-8888-4888-8888-000000000003',
        trayCount: 8,
        averageWeightPerTrayGrams: 500,
        estimatedWeightGrams: 4_000,
        measuredWeightGrams: 4_200,
        weightBasis: 'MEASURED',
      },
    ],
    waste: [
      {
        id: 'c1300000-0000-4000-8000-000000000002',
        productId: '77777777-7777-4777-8777-000000000012',
        quantityMilli: 250,
        reason: 'Peels and trimmings',
        note: 'Carrot trimmed during preparation',
      },
    ],
  },
  {
    id: 'c1000000-0000-4000-8000-000000000003',
    branchId: '22222222-2222-4222-8222-000000000003',
    businessDate: '2026-11-14',
    preparedByEmployeeId: '44444444-4444-4444-8444-000000000004',
    registeredByUserId: DEVELOPMENT_ADMIN_USER_ID,
    status: 'CORRECTED',
    note: 'Evening fruit salad preparation',
    confirmedByUserId: DEVELOPMENT_ADMIN_USER_ID,
    confirmedAt: '2026-11-14T18:10:00.000Z',
    correctedByUserId: DEVELOPMENT_ADMIN_USER_ID,
    correctedAt: '2026-11-14T19:00:00.000Z',
    correctionReason: 'One extra tray was registered',
    createdAt: '2026-11-14T18:00:00.000Z',
    updatedAt: '2026-11-14T19:00:00.000Z',
    inputs: [
      {
        id: 'c1100000-0000-4000-8000-000000000006',
        productId: '77777777-7777-4777-8777-000000000007',
        unitId: '55555555-5555-4555-8555-000000000001',
        quantityMilli: 1_500,
      },
      {
        id: 'c1100000-0000-4000-8000-000000000007',
        productId: '77777777-7777-4777-8777-000000000006',
        unitId: '55555555-5555-4555-8555-000000000001',
        quantityMilli: 1_000,
      },
    ],
    outputs: [
      {
        id: 'c1200000-0000-4000-8000-000000000003',
        productId: '77777777-7777-4777-8777-000000000019',
        presentationId: '88888888-8888-4888-8888-000000000001',
        trayCount: 4,
        averageWeightPerTrayGrams: 500,
        estimatedWeightGrams: 2_000,
        weightBasis: 'ESTIMATED',
      },
    ],
    waste: [],
  },
];

export interface DevelopmentSalesCheckpointItem {
  readonly id: string;
  readonly productId: string;
  readonly productKind: 'RAW' | 'PROCESSED';
  readonly unitId: string;
  readonly quantityMilli: number;
  readonly presentationId?: string;
  readonly trayCount?: number;
  readonly averageWeightPerTrayGrams?: number;
  readonly estimatedWeightGrams?: number;
  readonly measuredWeightGrams?: number;
  readonly weightBasis: SalesCheckpointWeightBasis;
  readonly sellingPriceAmountMinor: number;
  readonly sellingPriceBasis: 'PER_KILOGRAM' | 'PER_SALES_UNIT';
  readonly estimatedSalesValueMinor: number;
}

export interface DevelopmentSalesCheckpoint {
  readonly id: string;
  readonly branchId: string;
  readonly businessDate: string;
  readonly period: SalesCheckpointPeriod;
  readonly status: SalesCheckpointStatus;
  readonly registeredByUserId: string;
  readonly note?: string;
  readonly confirmedByUserId?: string;
  readonly confirmedAt?: string;
  readonly correctedByUserId?: string;
  readonly correctedAt?: string;
  readonly correctionReason?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items: readonly DevelopmentSalesCheckpointItem[];
}

export const DEVELOPMENT_SALES_CHECKPOINTS: readonly DevelopmentSalesCheckpoint[] = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    branchId: '22222222-2222-4222-8222-000000000001',
    businessDate: '2026-11-15',
    period: 'MORNING',
    status: 'DRAFT',
    registeredByUserId: DEVELOPMENT_ADMIN_USER_ID,
    note: 'Morning counter sales',
    createdAt: '2026-11-15T14:05:00.000Z',
    updatedAt: '2026-11-15T14:05:00.000Z',
    items: [
      {
        id: 'd1100000-0000-4000-8000-000000000001',
        productId: '77777777-7777-4777-8777-000000000001',
        productKind: 'RAW',
        unitId: KG,
        quantityMilli: 1_000,
        weightBasis: 'NOT_APPLICABLE',
        sellingPriceAmountMinor: 249,
        sellingPriceBasis: 'PER_SALES_UNIT',
        estimatedSalesValueMinor: 249,
      },
      {
        id: 'd1100000-0000-4000-8000-000000000002',
        productId: '77777777-7777-4777-8777-000000000019',
        productKind: 'PROCESSED',
        unitId: KG,
        quantityMilli: 2_000,
        presentationId: '88888888-8888-4888-8888-000000000001',
        trayCount: 4,
        averageWeightPerTrayGrams: 500,
        estimatedWeightGrams: 2_000,
        weightBasis: 'ESTIMATED',
        sellingPriceAmountMinor: 899,
        sellingPriceBasis: 'PER_KILOGRAM',
        estimatedSalesValueMinor: 1_798,
      },
    ],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    branchId: '22222222-2222-4222-8222-000000000002',
    businessDate: '2026-11-14',
    period: 'EVENING',
    status: 'CONFIRMED',
    registeredByUserId: DEVELOPMENT_ADMIN_USER_ID,
    note: 'Evening vegetable sales',
    confirmedByUserId: DEVELOPMENT_ADMIN_USER_ID,
    confirmedAt: '2026-11-14T21:10:00.000Z',
    createdAt: '2026-11-14T20:45:00.000Z',
    updatedAt: '2026-11-14T21:10:00.000Z',
    items: [
      {
        id: 'd1100000-0000-4000-8000-000000000003',
        productId: '77777777-7777-4777-8777-000000000011',
        productKind: 'RAW',
        unitId: KG,
        quantityMilli: 500,
        weightBasis: 'NOT_APPLICABLE',
        sellingPriceAmountMinor: 189,
        sellingPriceBasis: 'PER_SALES_UNIT',
        estimatedSalesValueMinor: 95,
      },
      {
        id: 'd1100000-0000-4000-8000-000000000004',
        productId: '77777777-7777-4777-8777-000000000020',
        productKind: 'PROCESSED',
        unitId: KG,
        quantityMilli: 1_000,
        presentationId: '88888888-8888-4888-8888-000000000003',
        trayCount: 2,
        averageWeightPerTrayGrams: 500,
        estimatedWeightGrams: 1_000,
        measuredWeightGrams: 1_000,
        weightBasis: 'MEASURED',
        sellingPriceAmountMinor: 749,
        sellingPriceBasis: 'PER_KILOGRAM',
        estimatedSalesValueMinor: 749,
      },
    ],
  },
  {
    id: 'd1000000-0000-4000-8000-000000000003',
    branchId: '22222222-2222-4222-8222-000000000003',
    businessDate: '2026-11-14',
    period: 'MORNING',
    status: 'CORRECTED',
    registeredByUserId: DEVELOPMENT_ADMIN_USER_ID,
    note: 'Morning fruit sales',
    confirmedByUserId: DEVELOPMENT_ADMIN_USER_ID,
    confirmedAt: '2026-11-14T13:20:00.000Z',
    correctedByUserId: DEVELOPMENT_ADMIN_USER_ID,
    correctedAt: '2026-11-14T15:00:00.000Z',
    correctionReason: 'One tray was counted twice',
    createdAt: '2026-11-14T13:00:00.000Z',
    updatedAt: '2026-11-14T15:00:00.000Z',
    items: [
      {
        id: 'd1100000-0000-4000-8000-000000000005',
        productId: '77777777-7777-4777-8777-000000000006',
        productKind: 'RAW',
        unitId: KG,
        quantityMilli: 500,
        weightBasis: 'NOT_APPLICABLE',
        sellingPriceAmountMinor: 399,
        sellingPriceBasis: 'PER_SALES_UNIT',
        estimatedSalesValueMinor: 200,
      },
      {
        id: 'd1100000-0000-4000-8000-000000000006',
        productId: '77777777-7777-4777-8777-000000000019',
        productKind: 'PROCESSED',
        unitId: KG,
        quantityMilli: 500,
        presentationId: '88888888-8888-4888-8888-000000000001',
        trayCount: 1,
        averageWeightPerTrayGrams: 500,
        estimatedWeightGrams: 500,
        weightBasis: 'ESTIMATED',
        sellingPriceAmountMinor: 899,
        sellingPriceBasis: 'PER_KILOGRAM',
        estimatedSalesValueMinor: 450,
      },
    ],
  },
];

function salesCheckpointMovementId(sequence: number): string {
  return `b4000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

function createSalesCheckpointStockMovements(): readonly DevelopmentStockMovement[] {
  const movements: DevelopmentStockMovement[] = [];
  let sequence = 1;

  for (const checkpoint of DEVELOPMENT_SALES_CHECKPOINTS) {
    if (
      checkpoint.status === 'DRAFT' ||
      checkpoint.confirmedAt === undefined ||
      checkpoint.confirmedByUserId === undefined
    ) {
      continue;
    }

    const sourceMovements: DevelopmentStockMovement[] = [];
    for (const item of checkpoint.items) {
      sourceMovements.push({
        id: salesCheckpointMovementId(sequence++),
        branchId: checkpoint.branchId,
        productId: item.productId,
        quantityDeltaMilli: -item.quantityMilli,
        reason: 'SALES_CHECKPOINT',
        sourceType: 'SALES_CHECKPOINT',
        sourceId: checkpoint.id,
        occurredAt: checkpoint.confirmedAt,
        recordedByUserId: checkpoint.confirmedByUserId,
        ...(checkpoint.note === undefined ? {} : { note: checkpoint.note }),
      });
    }

    movements.push(...sourceMovements);

    if (
      checkpoint.status === 'CORRECTED' &&
      checkpoint.correctedAt !== undefined &&
      checkpoint.correctedByUserId !== undefined &&
      checkpoint.correctionReason !== undefined
    ) {
      for (const movement of sourceMovements) {
        movements.push({
          id: salesCheckpointMovementId(sequence++),
          branchId: movement.branchId,
          productId: movement.productId,
          quantityDeltaMilli: -movement.quantityDeltaMilli,
          reason: 'CORRECTION',
          sourceType: 'SALES_CHECKPOINT',
          sourceId: checkpoint.id,
          correctsMovementId: movement.id,
          occurredAt: checkpoint.correctedAt,
          recordedByUserId: checkpoint.correctedByUserId,
          note: checkpoint.correctionReason,
        });
      }
    }
  }

  return movements;
}

function productionMovementId(sequence: number): string {
  return `b3000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

function createProductionStockMovements(): readonly DevelopmentStockMovement[] {
  const movements: DevelopmentStockMovement[] = [];
  let sequence = 1;

  for (const batch of DEVELOPMENT_PRODUCTION_BATCHES) {
    if (
      batch.status === 'DRAFT' ||
      batch.confirmedAt === undefined ||
      batch.confirmedByUserId === undefined
    ) {
      continue;
    }

    const sourceMovements: DevelopmentStockMovement[] = [];
    for (const input of batch.inputs) {
      sourceMovements.push({
        id: productionMovementId(sequence++),
        branchId: batch.branchId,
        productId: input.productId,
        quantityDeltaMilli: -input.quantityMilli,
        reason: 'PRODUCTION_INPUT',
        sourceType: 'PRODUCTION_BATCH',
        sourceId: batch.id,
        occurredAt: batch.confirmedAt,
        recordedByUserId: batch.confirmedByUserId,
        ...(batch.note === undefined ? {} : { note: batch.note }),
      });
    }
    for (const output of batch.outputs) {
      sourceMovements.push({
        id: productionMovementId(sequence++),
        branchId: batch.branchId,
        productId: output.productId,
        quantityDeltaMilli: output.measuredWeightGrams ?? output.estimatedWeightGrams,
        reason: 'PRODUCTION_OUTPUT',
        sourceType: 'PRODUCTION_BATCH',
        sourceId: batch.id,
        occurredAt: batch.confirmedAt,
        recordedByUserId: batch.confirmedByUserId,
        ...(batch.note === undefined ? {} : { note: batch.note }),
      });
    }
    for (const waste of batch.waste) {
      sourceMovements.push({
        id: productionMovementId(sequence++),
        branchId: batch.branchId,
        productId: waste.productId,
        quantityDeltaMilli: -waste.quantityMilli,
        reason: 'WASTE',
        sourceType: 'PRODUCTION_BATCH',
        sourceId: batch.id,
        occurredAt: batch.confirmedAt,
        recordedByUserId: batch.confirmedByUserId,
        note: waste.reason,
      });
    }

    movements.push(...sourceMovements);

    if (
      batch.status === 'CORRECTED' &&
      batch.correctedAt !== undefined &&
      batch.correctedByUserId !== undefined &&
      batch.correctionReason !== undefined
    ) {
      for (const movement of sourceMovements) {
        movements.push({
          id: productionMovementId(sequence++),
          branchId: movement.branchId,
          productId: movement.productId,
          quantityDeltaMilli: -movement.quantityDeltaMilli,
          reason: 'CORRECTION',
          sourceType: 'PRODUCTION_BATCH',
          sourceId: batch.id,
          correctsMovementId: movement.id,
          occurredAt: batch.correctedAt,
          recordedByUserId: batch.correctedByUserId,
          note: batch.correctionReason,
        });
      }
    }
  }

  return movements;
}

export const DEVELOPMENT_STOCK_MOVEMENTS: readonly DevelopmentStockMovement[] = [
  ...DEVELOPMENT_STOCK_ADJUSTMENTS.filter((adjustment) => adjustment.quantityDeltaMilli !== 0).map(
    (adjustment, index) => ({
      id: `b1000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      branchId: adjustment.branchId,
      productId: adjustment.productId,
      quantityDeltaMilli: adjustment.quantityDeltaMilli,
      reason: 'ADJUSTMENT' as const,
      sourceType: 'ADJUSTMENT' as const,
      sourceId: adjustment.id,
      occurredAt: adjustment.occurredAt,
      recordedByUserId: adjustment.recordedByUserId,
      ...(adjustment.note === undefined ? {} : { note: adjustment.note }),
    }),
  ),
  ...DEVELOPMENT_INVENTORY_WASTE.map((waste, index) => ({
    id: `b2000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    branchId: waste.branchId,
    productId: waste.productId,
    quantityDeltaMilli: -waste.quantityMilli,
    reason: 'WASTE' as const,
    sourceType: 'WASTE_REPORT' as const,
    sourceId: waste.id,
    occurredAt: waste.occurredAt,
    recordedByUserId: waste.recordedByUserId,
    ...(waste.note === undefined ? {} : { note: waste.note }),
  })),
  ...createProductionStockMovements(),
  ...createSalesCheckpointStockMovements(),
];
