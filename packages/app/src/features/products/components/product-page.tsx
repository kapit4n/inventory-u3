import { ProductManagement } from './product-management.js';

import { useTranslation } from '../../../i18n/index.js';

export function ProductPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
        <p className="text-muted-foreground">{t('products.description')}</p>
      </header>

      <ProductManagement />
    </div>
  );
}
