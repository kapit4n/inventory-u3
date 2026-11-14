import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import { ApiClientError } from '@inventory-u3/api-client';
import type { PurchaseResponse } from '@inventory-u3/validation';
import { AlertCircle, Check, Loader2, Plus, RotateCcw, Truck, X } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  STATUS_TONE_CLASS,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
  type StatusTone,
} from '@inventory-u3/ui';

import { useTranslation, type TranslationKey } from '../../../i18n/index.js';
import { useSession } from '../../auth/session-provider.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { formatCurrencyAmount, formatIsoDate } from '../../products/price-format.js';
import { useSuppliers } from '../../suppliers/queries/suppliers-query.js';
import { useCancelPurchase } from '../mutations/use-cancel-purchase.js';
import { useReceivePurchase } from '../mutations/use-receive-purchase.js';
import { usePurchases } from '../queries/purchases-query.js';
import { PurchaseCorrectionDialog } from './purchase-correction-dialog.js';
import { PurchaseFormDialog } from './purchase-form-dialog.js';

const TONE_BY_STATUS: Readonly<Record<PurchaseResponse['status'], StatusTone>> = {
  DRAFT: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
  CORRECTED: 'info',
};

export function PurchasesPage() {
  const { t, locale } = useTranslation();
  const { user } = useSession();
  const purchasesQuery = usePurchases();
  const branchesQuery = useBranches();
  const suppliersQuery = useSuppliers();
  const receive = useReceivePurchase();
  const cancel = useCancelPurchase();
  const [formOpen, setFormOpen] = useState(false);
  const [correcting, setCorrecting] = useState<PurchaseResponse | undefined>();
  const canWrite = user ? hasPermission(user.role, 'inventory:write') : false;
  const pending = receive.isPending || cancel.isPending;

  const branchById = new Map((branchesQuery.data ?? []).map((branch) => [branch.id, branch]));
  const supplierById = new Map(
    (suppliersQuery.data ?? []).map((supplier) => [supplier.id, supplier]),
  );
  const actionError = receive.error ?? cancel.error;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('purchases.title')}</h1>
          <p className="text-muted-foreground">{t('purchases.description')}</p>
        </div>
        {canWrite ? (
          <Button type="button" onClick={() => setFormOpen(true)} data-testid="purchase-new">
            <Plus aria-hidden className="size-4" />
            {t('purchases.new')}
          </Button>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('purchases.list.title')}</CardTitle>
          <CardDescription>{t('purchases.list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {purchasesQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('purchases.loading')}
            </p>
          ) : null}

          {purchasesQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('purchases.loadFailure')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void purchasesQuery.refetch()}
                >
                  {t('purchases.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {actionError ? (
            <div
              role="alert"
              data-testid="purchases-action-failure"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeActionFailure(actionError, t)}</span>
            </div>
          ) : null}

          {purchasesQuery.isSuccess && purchasesQuery.data.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <Truck aria-hidden className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="font-medium">{t('purchases.list.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('purchases.list.emptyDescription')}
              </p>
            </div>
          ) : null}

          {purchasesQuery.isSuccess && purchasesQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('purchases.column.deliveryDate')}</TableHead>
                  <TableHead>{t('purchases.column.branch')}</TableHead>
                  <TableHead>{t('purchases.column.supplier')}</TableHead>
                  <TableHead>{t('purchases.column.status')}</TableHead>
                  <TableHead>{t('purchases.column.items')}</TableHead>
                  <TableHead className="text-right">{t('purchases.column.total')}</TableHead>
                  {canWrite ? (
                    <TableHead className="text-right">{t('purchases.column.actions')}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchasesQuery.data.map((purchase) => (
                  <TableRow key={purchase.id} data-testid={`purchase-row-${purchase.id}`}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatIsoDate(purchase.deliveryDate, locale)}
                    </TableCell>
                    <TableCell>
                      {branchById.get(purchase.branchId)?.name ?? t('common.unavailable')}
                    </TableCell>
                    <TableCell>
                      <div>
                        {supplierById.get(purchase.supplierId)?.name ?? t('common.unavailable')}
                      </div>
                      {purchase.note ? (
                        <div className="max-w-48 truncate text-xs text-muted-foreground">
                          {purchase.note}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_TONE_CLASS[TONE_BY_STATUS[purchase.status]],
                        )}
                      >
                        {t(statusKey(purchase.status))}
                      </span>
                    </TableCell>
                    <TableCell>{purchase.items.length}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrencyAmount(purchase.totalMinor, purchase.currency, locale)}
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {purchase.status === 'DRAFT' ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => receive.mutate(purchase.id)}
                                disabled={pending}
                                data-testid={`purchase-receive-${purchase.id}`}
                              >
                                <Check aria-hidden className="size-4" />
                                {t('purchases.action.receive')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => cancel.mutate(purchase.id)}
                                disabled={pending}
                                data-testid={`purchase-cancel-${purchase.id}`}
                              >
                                <X aria-hidden className="size-4" />
                                {t('purchases.action.cancel')}
                              </Button>
                            </>
                          ) : null}
                          {purchase.status === 'RECEIVED' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCorrecting(purchase)}
                              disabled={pending}
                              data-testid={`purchase-correct-${purchase.id}`}
                            >
                              <RotateCcw aria-hidden className="size-4" />
                              {t('purchases.action.correct')}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          {!canWrite ? (
            <p className="mt-4 text-xs text-muted-foreground">{t('purchases.readOnly')}</p>
          ) : null}
        </CardContent>
      </Card>

      <PurchaseFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <PurchaseCorrectionDialog
        purchase={correcting}
        onOpenChange={(open) => {
          if (!open) {
            setCorrecting(undefined);
          }
        }}
      />
    </div>
  );
}

function describeActionFailure(
  error: unknown,
  t: (
    key:
      | 'purchases.action.failure'
      | 'purchases.action.failure.validation'
      | 'purchases.action.failure.forbidden'
      | 'purchases.action.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('purchases.action.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('purchases.action.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('purchases.action.failure.network');
    }
  }
  return t('purchases.action.failure');
}

function statusKey(status: PurchaseResponse['status']): TranslationKey {
  switch (status) {
    case 'DRAFT':
      return 'purchases.status.draft';
    case 'RECEIVED':
      return 'purchases.status.received';
    case 'CANCELLED':
      return 'purchases.status.cancelled';
    case 'CORRECTED':
      return 'purchases.status.corrected';
  }
}
