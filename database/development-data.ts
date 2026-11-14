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
