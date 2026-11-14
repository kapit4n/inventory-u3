import { useState } from 'react';
import type { ProductPriceHistoryResponse, ProductResponse } from '@inventory-u3/validation';
import { AlertCircle, Loader2, Plus } from 'lucide-react';
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
import {
  formatCurrencyAmount,
  formatIsoDate,
  formatIsoDateTime,
  todayIsoDate,
} from '../price-format.js';
import { useProductPrices } from '../queries/product-prices-query.js';
import { ProductPriceFormDialog } from './product-price-form-dialog.js';

export interface ProductPriceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly product: ProductResponse;
  readonly canManage: boolean;
}

export function ProductPriceDialog({
  open,
  onOpenChange,
  product,
  canManage,
}: ProductPriceDialogProps) {
  const { t, locale } = useTranslation();
  const pricesQuery = useProductPrices(product.id, open);
  const [formOpen, setFormOpen] = useState(false);
  const prices = pricesQuery.data?.items ?? [];
  const currency = pricesQuery.data?.currency;
  const today = todayIsoDate();
  const currentPriceId = prices.find((price) => price.effectiveFrom <= today)?.id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('products.prices.title', { product: product.name })}</DialogTitle>
            <DialogDescription>{t('products.prices.description')}</DialogDescription>
          </DialogHeader>

          {canManage ? (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setFormOpen(true)}
                disabled={!currency}
                data-testid="product-price-new"
              >
                <Plus aria-hidden className="size-4" />
                {t('products.prices.new')}
              </Button>
            </div>
          ) : null}

          {pricesQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('products.prices.loading')}
            </p>
          ) : null}

          {pricesQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('products.prices.loadFailure')}</p>
                <Button type="button" variant="outline" onClick={() => void pricesQuery.refetch()}>
                  {t('products.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {pricesQuery.isSuccess && prices.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="font-medium">{t('products.prices.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('products.prices.emptyDescription')}
              </p>
            </div>
          ) : null}

          {pricesQuery.isSuccess && prices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.prices.column.price')}</TableHead>
                  <TableHead>{t('products.prices.column.basis')}</TableHead>
                  <TableHead>{t('products.prices.column.effectiveFrom')}</TableHead>
                  <TableHead>{t('products.prices.column.status')}</TableHead>
                  <TableHead>{t('products.prices.column.recordedAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell className="font-medium">
                      {formatCurrencyAmount(price.amountMinor, price.currency, locale)}
                    </TableCell>
                    <TableCell>{describeBasis(price, t)}</TableCell>
                    <TableCell>{formatIsoDate(price.effectiveFrom, locale)}</TableCell>
                    <TableCell>
                      <PriceStatusBadge
                        price={price}
                        currentPriceId={currentPriceId}
                        today={today}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatIsoDateTime(price.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </DialogContent>
      </Dialog>

      {currency && canManage ? (
        <ProductPriceFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          product={product}
          currency={currency}
        />
      ) : null}
    </>
  );
}

function describeBasis(
  price: ProductPriceHistoryResponse,
  t: (key: 'products.prices.basis.perKilogram' | 'products.prices.basis.perSalesUnit') => string,
): string {
  return price.priceBasis === 'PER_KILOGRAM'
    ? t('products.prices.basis.perKilogram')
    : t('products.prices.basis.perSalesUnit');
}

function PriceStatusBadge({
  price,
  currentPriceId,
  today,
}: {
  readonly price: ProductPriceHistoryResponse;
  readonly currentPriceId: string | undefined;
  readonly today: string;
}) {
  const { t } = useTranslation();
  const isScheduled = price.effectiveFrom > today;
  const isCurrent = price.id === currentPriceId;
  const label = isScheduled
    ? t('products.prices.status.scheduled')
    : isCurrent
      ? t('products.prices.status.current')
      : t('products.prices.status.past');

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}
