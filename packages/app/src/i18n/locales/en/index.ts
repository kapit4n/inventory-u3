import { auth } from './auth.js';
import { branches } from './branches.js';
import { common } from './common.js';
import { dashboard } from './dashboard.js';
import { employees } from './employees.js';
import { inventory } from './inventory.js';
import { measurementUnits } from './measurement-units.js';
import { productCategories } from './product-categories.js';
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
  ...settings,
  ...suppliers,
} as const;
