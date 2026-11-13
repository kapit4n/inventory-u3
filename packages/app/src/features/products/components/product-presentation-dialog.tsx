import { useState } from 'react';
import type { ProductPresentationResponse, ProductResponse } from '@inventory-u3/validation';
import { AlertCircle, Loader2, Pencil, Plus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@inventory-u3/ui';

import { useTranslation } from '../../../i18n/index.js';
import { useProductPresentations } from '../queries/product-presentations-query.js';
import { ProductPresentationFormDialog } from './product-presentation-form-dialog.js';

export interface ProductPresentationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly product: ProductResponse;
}

export function ProductPresentationDialog({
  open,
  onOpenChange,
  product,
}: ProductPresentationDialogProps) {
  const { t } = useTranslation();
  const presentationsQuery = useProductPresentations(product.id, open);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductPresentationResponse | undefined>();

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(presentation: ProductPresentationResponse) {
    setEditing(presentation);
    setFormOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t('products.presentations.title', { product: product.name })}
            </DialogTitle>
            <DialogDescription>{t('products.presentations.description')}</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={openCreate}
              data-testid="product-presentation-new"
            >
              <Plus aria-hidden className="size-4" />
              {t('products.presentations.new')}
            </Button>
          </div>

          {presentationsQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('products.presentations.loading')}
            </p>
          ) : null}

          {presentationsQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('products.presentations.loadFailure')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void presentationsQuery.refetch()}
                >
                  {t('products.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {presentationsQuery.isSuccess && presentationsQuery.data.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="font-medium">{t('products.presentations.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('products.presentations.emptyDescription')}
              </p>
            </div>
          ) : null}

          {presentationsQuery.isSuccess && presentationsQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.presentations.column.name')}</TableHead>
                  <TableHead>{t('products.presentations.column.weight')}</TableHead>
                  <TableHead>{t('products.presentations.column.status')}</TableHead>
                  <TableHead className="text-right">
                    {t('products.presentations.column.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presentationsQuery.data.map((presentation) => (
                  <TableRow key={presentation.id}>
                    <TableCell className="font-medium">{presentation.name}</TableCell>
                    <TableCell>
                      {t('products.presentations.weightValue', {
                        grams: presentation.averageWeightGrams,
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          presentation.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {presentation.isActive
                          ? t('products.status.active')
                          : t('products.status.inactive')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(presentation)}
                        aria-label={`${t('products.presentations.edit')} ${presentation.name}`}
                      >
                        <Pencil aria-hidden className="size-4" />
                        {t('products.presentations.edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </DialogContent>
      </Dialog>

      <ProductPresentationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        productId={product.id}
        presentation={editing}
      />
    </>
  );
}
