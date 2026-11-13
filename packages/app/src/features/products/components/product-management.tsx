import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { ProductResponse } from '@inventory-u3/validation';
import { AlertCircle, Layers, Loader2, Pencil, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@inventory-u3/ui';

import { useTranslation } from '../../../i18n/index.js';
import { useSession } from '../../auth/session-provider.js';
import { useMeasurementUnits } from '../../measurement-units/queries/measurement-units-query.js';
import { useProductCategories } from '../../product-categories/queries/product-categories-query.js';
import { useProducts } from '../queries/products-query.js';
import { ProductFormDialog } from './product-form-dialog.js';
import { ProductPresentationDialog } from './product-presentation-dialog.js';

export function ProductManagement() {
  const { t } = useTranslation();
  const { user } = useSession();
  const productsQuery = useProducts();
  const categoriesQuery = useProductCategories();
  const unitsQuery = useMeasurementUnits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | undefined>();
  const [presentationProduct, setPresentationProduct] = useState<ProductResponse | undefined>();
  const canManage = user ? hasPermission(user.role, 'organization:manage') : false;

  const categories = categoriesQuery.data ?? [];
  const units = unitsQuery.data ?? [];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const hasActiveCategory = categories.some((category) => category.isActive);
  const hasActiveUnit = units.some((unit) => unit.isActive);
  const masterDataReady = hasActiveCategory && hasActiveUnit;
  const loading = productsQuery.isPending || categoriesQuery.isPending || unitsQuery.isPending;
  const failed = productsQuery.isError || categoriesQuery.isError || unitsQuery.isError;

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(product: ProductResponse) {
    setEditing(product);
    setDialogOpen(true);
  }

  function retry() {
    if (productsQuery.isError) {
      void productsQuery.refetch();
    }
    if (categoriesQuery.isError) {
      void categoriesQuery.refetch();
    }
    if (unitsQuery.isError) {
      void unitsQuery.refetch();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('products.list.title')}</CardTitle>
            <CardDescription>{t('products.list.description')}</CardDescription>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              disabled={!masterDataReady}
              title={masterDataReady ? undefined : t('products.list.masterDataRequired')}
              data-testid="product-new"
            >
              <Plus aria-hidden className="size-4" />
              {t('products.new')}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {canManage && !masterDataReady && !loading ? (
          <p className="mb-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {t('products.list.masterDataRequired')}
          </p>
        ) : null}

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t('products.loading')}
          </p>
        ) : null}

        {!loading && failed ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>{t('products.loadFailure')}</p>
              <Button type="button" variant="outline" onClick={retry}>
                {t('products.retry')}
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && !failed && productsQuery.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">{t('products.list.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('products.list.emptyDescription')}
            </p>
          </div>
        ) : null}

        {!loading && !failed && productsQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('products.column.name')}</TableHead>
                <TableHead>{t('products.column.kind')}</TableHead>
                <TableHead>{t('products.column.category')}</TableHead>
                <TableHead>{t('products.column.inventoryUnit')}</TableHead>
                <TableHead>{t('products.column.salesUnit')}</TableHead>
                <TableHead>{t('products.column.status')}</TableHead>
                {canManage ? (
                  <TableHead className="text-right">{t('products.column.actions')}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsQuery.data.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.kind === 'RAW' ? t('products.kind.raw') : t('products.kind.processed')}
                  </TableCell>
                  <TableCell>
                    {categoryById.get(product.categoryId)?.name ?? t('common.unavailable')}
                  </TableCell>
                  <TableCell>
                    {describeUnit(unitById.get(product.inventoryUnitId), t('common.unavailable'))}
                  </TableCell>
                  <TableCell>
                    {describeUnit(unitById.get(product.salesUnitId), t('common.unavailable'))}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        product.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {product.isActive
                        ? t('products.status.active')
                        : t('products.status.inactive')}
                    </span>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {product.kind === 'PROCESSED' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPresentationProduct(product)}
                            aria-label={`${t('products.actions.presentations')} ${product.name}`}
                          >
                            <Layers aria-hidden className="size-4" />
                            {t('products.actions.presentations')}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(product)}
                          aria-label={`${t('products.edit')} ${product.name}`}
                        >
                          <Pencil aria-hidden className="size-4" />
                          {t('products.edit')}
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {!canManage ? (
          <p className="mt-4 text-xs text-muted-foreground">{t('products.readOnly')}</p>
        ) : null}
      </CardContent>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories}
        units={units}
      />

      {presentationProduct ? (
        <ProductPresentationDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPresentationProduct(undefined);
            }
          }}
          product={presentationProduct}
        />
      ) : null}
    </Card>
  );
}

function describeUnit(
  unit: { readonly name: string; readonly code: string } | undefined,
  fallback: string,
): string {
  return unit ? `${unit.name} (${unit.code})` : fallback;
}
