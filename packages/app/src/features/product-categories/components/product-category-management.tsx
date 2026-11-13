import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { ProductCategoryResponse } from '@inventory-u3/validation';
import { AlertCircle, Loader2, Pencil, Plus } from 'lucide-react';
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
import { useProductCategories } from '../queries/product-categories-query.js';
import { ProductCategoryFormDialog } from './product-category-form-dialog.js';

export function ProductCategoryManagement() {
  const { t } = useTranslation();
  const { user } = useSession();
  const categoriesQuery = useProductCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategoryResponse | undefined>();
  const canManage = user ? hasPermission(user.role, 'organization:manage') : false;

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(category: ProductCategoryResponse) {
    setEditing(category);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('productCategories.list.title')}</CardTitle>
            <CardDescription>{t('productCategories.list.description')}</CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreate} data-testid="product-category-new">
              <Plus aria-hidden className="size-4" />
              {t('productCategories.new')}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {categoriesQuery.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t('productCategories.loading')}
          </p>
        ) : null}

        {categoriesQuery.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>{t('productCategories.loadFailure')}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void categoriesQuery.refetch()}
              >
                {t('productCategories.retry')}
              </Button>
            </div>
          </div>
        ) : null}

        {categoriesQuery.isSuccess && categoriesQuery.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">{t('productCategories.list.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('productCategories.list.emptyDescription')}
            </p>
          </div>
        ) : null}

        {categoriesQuery.isSuccess && categoriesQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('productCategories.column.name')}</TableHead>
                <TableHead>{t('productCategories.column.status')}</TableHead>
                {canManage ? (
                  <TableHead className="text-right">
                    {t('productCategories.column.actions')}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesQuery.data.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        category.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {category.isActive
                        ? t('productCategories.status.active')
                        : t('productCategories.status.inactive')}
                    </span>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(category)}
                        aria-label={`${t('productCategories.edit')} ${category.name}`}
                      >
                        <Pencil aria-hidden className="size-4" />
                        {t('productCategories.edit')}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {!canManage ? (
          <p className="mt-4 text-xs text-muted-foreground">{t('productCategories.readOnly')}</p>
        ) : null}
      </CardContent>

      <ProductCategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
      />
    </Card>
  );
}
