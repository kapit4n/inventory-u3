import { auth } from './auth.js';
import { branches } from './branches.js';
import { common } from './common.js';
import { dashboard } from './dashboard.js';
import { inventory } from './inventory.js';
import { settings } from './settings.js';

export const es = {
  ...common,
  ...auth,
  ...branches,
  ...dashboard,
  ...inventory,
  ...settings,
} as const;
