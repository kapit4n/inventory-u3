import { PackageSearch } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@inventory-u3/ui';

import { useTranslation } from '../../../i18n/index.js';

export function InventoryPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('inventory.title')}</h1>
        <p className="text-muted-foreground">{t('inventory.description')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageSearch aria-hidden className="size-5" />
            {t('inventory.emptyTitle')}
          </CardTitle>
          <CardDescription>{t('inventory.emptyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('inventory.foundationNote')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
