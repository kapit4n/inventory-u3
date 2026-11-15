import { ApiClientError } from '@inventory-u3/api-client';

import type { Translate } from '../../i18n/index.js';

export function describeInventoryFailure(error: unknown, t: Translate): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('inventory.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('inventory.failure.forbidden');
    }
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('inventory.failure.stock');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('inventory.failure.network');
    }
  }
  return t('inventory.failure.generic');
}
