import type { ProductResponse, StockMovementResponse } from '@inventory-u3/validation';
import { AlertCircle, History, Loader2 } from 'lucide-react';
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

import { useTranslation, type TranslationKey } from '../../../i18n/index.js';
import { formatIsoDateTime } from '../../products/price-format.js';
import { useStockMovements } from '../queries/stock-movements-query.js';
import { formatStockQuantity } from '../stock-quantity.js';

export interface StockHistoryDialogProps {
  readonly product?: ProductResponse;
  readonly branchId: string;
  readonly unitCode: string;
  readonly onOpenChange: (open: boolean) => void;
}

export function StockHistoryDialog({
  product,
  branchId,
  unitCode,
  onOpenChange,
}: StockHistoryDialogProps) {
  const { t, locale } = useTranslation();
  const movementsQuery = useStockMovements(branchId, product?.id ?? '');

  return (
    <Dialog open={product !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t('inventory.history.title', { product: product?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>{t('inventory.history.description')}</DialogDescription>
        </DialogHeader>

        {movementsQuery.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t('inventory.loading')}
          </p>
        ) : null}

        {movementsQuery.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>{t('inventory.loadFailure')}</p>
              <Button type="button" variant="outline" onClick={() => void movementsQuery.refetch()}>
                {t('inventory.retry')}
              </Button>
            </div>
          </div>
        ) : null}

        {movementsQuery.isSuccess && movementsQuery.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <History aria-hidden className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="font-medium">{t('inventory.history.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('inventory.history.emptyDescription')}
            </p>
          </div>
        ) : null}

        {movementsQuery.isSuccess && movementsQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('inventory.history.column.date')}</TableHead>
                <TableHead>{t('inventory.history.column.reason')}</TableHead>
                <TableHead className="text-right">
                  {t('inventory.history.column.quantity')}
                </TableHead>
                <TableHead>{t('inventory.history.column.source')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsQuery.data.map((movement) => (
                <TableRow key={movement.id} data-testid="stock-history-row">
                  <TableCell className="whitespace-nowrap">
                    {formatIsoDateTime(movement.occurredAt, locale)}
                  </TableCell>
                  <TableCell>
                    <div>{t(reasonKey(movement.reason))}</div>
                    {movement.note ? (
                      <div className="max-w-64 truncate text-xs text-muted-foreground">
                        {movement.note}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-medium tabular-nums',
                      movement.quantityDeltaMilli < 0 ? 'text-destructive' : 'text-emerald-700',
                    )}
                  >
                    {movement.quantityDeltaMilli > 0 ? '+' : ''}
                    {formatStockQuantity(movement.quantityDeltaMilli, locale)} {unitCode}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {movement.source ? t(sourceKey(movement.source.type)) : t('common.notProvided')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function reasonKey(reason: StockMovementResponse['reason']): TranslationKey {
  switch (reason) {
    case 'RECEIVING':
      return 'inventory.reason.receiving';
    case 'PRODUCTION_INPUT':
      return 'inventory.reason.productionInput';
    case 'PRODUCTION_OUTPUT':
      return 'inventory.reason.productionOutput';
    case 'SALES_CHECKPOINT':
      return 'inventory.reason.salesCheckpoint';
    case 'ADJUSTMENT':
      return 'inventory.reason.adjustment';
    case 'WASTE':
      return 'inventory.reason.waste';
    case 'CORRECTION':
      return 'inventory.reason.correction';
  }
}

function sourceKey(source: NonNullable<StockMovementResponse['source']>['type']): TranslationKey {
  switch (source) {
    case 'PURCHASE_RECEIPT':
      return 'inventory.source.purchaseReceipt';
    case 'PURCHASE_CORRECTION':
      return 'inventory.source.purchaseCorrection';
    case 'PRODUCTION_BATCH':
      return 'inventory.source.productionBatch';
    case 'SALES_CHECKPOINT':
      return 'inventory.source.salesCheckpoint';
    case 'ADJUSTMENT':
      return 'inventory.source.adjustment';
    case 'WASTE_REPORT':
      return 'inventory.source.wasteReport';
  }
}
