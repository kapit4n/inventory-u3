import { auth } from './auth.js';
import { branches } from './branches.js';
import { common } from './common.js';
import { dashboard } from './dashboard.js';
import { employees } from './employees.js';
import { inventory } from './inventory.js';
import { measurementUnits } from './measurement-units.js';
import { productCategories } from './product-categories.js';
import { production } from './production.js';
import { products } from './products.js';
import { purchases } from './purchases.js';
import { settings } from './settings.js';
import { suppliers } from './suppliers.js';

export const en = {
  ...common,
  ...auth,
  ...branches,
  ...dashboard,
  ...employees,
  ...inventory,
  ...measurementUnits,
  ...productCategories,
  ...production,
  ...products,
  ...purchases,
  ...settings,
  ...suppliers,
} as const;
