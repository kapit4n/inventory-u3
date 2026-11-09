import { auth } from './auth.js';
import { branches } from './branches.js';
import { common } from './common.js';
import { dashboard } from './dashboard.js';
import { employees } from './employees.js';
import { inventory } from './inventory.js';
import { settings } from './settings.js';

export const es = {
  ...common,
  ...auth,
  ...branches,
  ...dashboard,
  ...employees,
  ...inventory,
  ...settings,
} as const;
