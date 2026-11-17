import { useState } from 'react';
import { ApiClientError } from '@inventory-u3/api-client';
import type { DailyClosingResponse } from '@inventory-u3/validation';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Eye } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useBranches } from '../../branches/queries/branches-query.js';
import {
  formatCurrencyAmount,
  formatIsoDate,
  formatIsoDateTime,
} from '../../products/price-format.js';
import { useProducts } from '../../products/queries/products-query.js';
import { formatTrays, formatWeightGrams } from '../../production/production-format.js';
import { useConfirmDailyClosing } from '../mutations/use-confirm-daily-closing.js';
import { useReopenDailyClosing } from '../mutations/use-reopen-daily-closing.js';
import { useReviewDailyClosing } from '../mutations/use-review-daily-closing.js';

const TONE_BY_STATUS: Readonly<Record<DailyClosingResponse['status'], StatusTone>> = {
  DRAFT: 'warning',
  REVIEWED: 'info',
  CONFIRMED: 'success',
  REOPENED: 'info',
};

export interface DailyClosingDetailDialogProps {
  readonly closing?: DailyClosingResponse;
  readonly onOpenChange: (open: boolean) => void;
  readonly onUpdated: (closing: DailyClosingResponse) => void;
}

export function DailyClosingDetailDialog({
  closing,
  onOpenChange,
  onUpdated,
}: DailyClosingDetailDialogProps) {
  const { t, locale } = useTranslation();
  const branchesQuery = useBranches();
  const productsQuery = useProducts();
  const review = useReviewDailyClosing();
  const confirm = useConfirmDailyClosing();
  const reopen = useReopenDailyClosing();
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState('');
  const branch = (branchesQuery.data ?? []).find((option) => option.id === closing?.branchId);
  const productById = new Map((productsQuery.data ?? []).map((product) => [product.id, product]));
  const actionError = review.error ?? confirm.error ?? reopen.error;
  const pending = review.isPending || confirm.isPending || reopen.isPending;

  const submitReopen = () => {
    if (!closing || reason.trim().length === 0) {
      return;
    }
    reopen.mutate(
      { dailyClosingId: closing.id, reason: reason.trim() },
      {
        onSuccess: (saved) => {
          setReopenOpen(false);
          setReason('');
          onUpdated(saved);
        },
      },
    );
  };

  return (
    <Dialog open={closing !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t('dailyClosing.detail.title')}</DialogTitle>
          <DialogDescription>{t('dailyClosing.detail.description')}</DialogDescription>
        </DialogHeader>

        {closing ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                  STATUS_TONE_CLASS[TONE_BY_STATUS[closing.status]],
                )}
              >
                {t(`dailyClosing.status.${closing.status}`)}
              </span>
              <span className="text-sm font-medium">
                {formatIsoDate(closing.businessDate, locale)} ·{' '}
                {branch?.name ?? t('common.unavailable')} · {t('dailyClosing.detail.version')}{' '}
                {closing.version}
              </span>
              {closing.previousClosingId ? (
                <span className="text-xs text-muted-foreground">
                  {t('dailyClosing.detail.previous', { version: closing.version - 1 })}
                </span>
              ) : null}
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              {closing.reviewedAt ? (
                <DetailItem label={t('dailyClosing.detail.reviewedAt')}>
                  {formatIsoDateTime(closing.reviewedAt, locale)}
                </DetailItem>
              ) : null}
              {closing.confirmedAt ? (
                <DetailItem label={t('dailyClosing.detail.confirmedAt')}>
                  {formatIsoDateTime(closing.confirmedAt, locale)}
                </DetailItem>
              ) : null}
              {closing.reopenedAt ? (
                <DetailItem label={t('dailyClosing.detail.reopenedAt')}>
                  {formatIsoDateTime(closing.reopenedAt, locale)}
                </DetailItem>
              ) : null}
              {closing.reopenReason ? (
                <DetailItem label={t('dailyClosing.detail.reopenReason')}>
                  {closing.reopenReason}
                </DetailItem>
              ) : null}
            </dl>

            <section className="space-y-3">
              <h3 className="text-sm font-medium">{t('dailyClosing.summary.title')}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  label={t('dailyClosing.summary.revenue')}
                  value={formatCurrencyAmount(
                    closing.estimatedRevenueMinor,
                    closing.currency,
                    locale,
                  )}
                />
                <SummaryCard
                  label={t('dailyClosing.summary.cost')}
                  value={formatCurrencyAmount(closing.estimatedCostMinor, closing.currency, locale)}
                />
                <SummaryCard
                  label={t('dailyClosing.summary.profit')}
                  value={formatCurrencyAmount(
                    closing.estimatedGrossProfitMinor,
                    closing.currency,
                    locale,
                  )}
                  tone={closing.estimatedGrossProfitMinor < 0 ? 'destructive' : 'default'}
                />
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailItem label={t('dailyClosing.summary.purchases')}>
                  {formatCurrencyAmount(closing.purchasesTotalMinor, closing.currency, locale)} ·{' '}
                  {closing.purchaseCount}
                </DetailItem>
                <DetailItem label={t('dailyClosing.summary.sales')}>
                  {formatCurrencyAmount(closing.salesTotalMinor, closing.currency, locale)} ·{' '}
                  {closing.salesCheckpointCount}
                </DetailItem>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium">{t('dailyClosing.readiness.title')}</h3>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <ReadinessItem
                  ok={closing.purchaseCount > 0}
                  label={t('dailyClosing.readiness.purchases')}
                  detail={String(closing.purchaseCount)}
                />
                <ReadinessItem
                  ok={closing.productionBatchCount > 0}
                  label={t('dailyClosing.readiness.production')}
                  detail={t('dailyClosing.readiness.productionDetail', {
                    trays: formatTrays(closing.productionTrayCount, locale),
                    weight: formatWeightGrams(closing.productionEstimatedWeightGrams, locale),
                  })}
                />
                <ReadinessItem
                  ok={closing.salesCheckpointCount > 0}
                  label={t('dailyClosing.readiness.sales')}
                  detail={String(closing.salesCheckpointCount)}
                />
                <ReadinessItem
                  ok={closing.wasteRecordCount === 0}
                  label={t('dailyClosing.readiness.waste')}
                  detail={String(closing.wasteRecordCount)}
                />
                <ReadinessItem
                  ok={closing.inventoryDifferenceProductCount === 0}
                  label={t('dailyClosing.readiness.differences')}
                  detail={String(closing.inventoryDifferenceProductCount)}
                />
                <ReadinessItem
                  ok={closing.unreceivedPurchaseCount === 0}
                  label={t('dailyClosing.readiness.unreceivedPurchases')}
                  detail={String(closing.unreceivedPurchaseCount)}
                />
                <ReadinessItem
                  ok={closing.productionDraftCount === 0}
                  label={t('dailyClosing.readiness.draftProduction')}
                  detail={String(closing.productionDraftCount)}
                />
                <ReadinessItem
                  ok={closing.draftSalesCheckpointCount === 0}
                  label={t('dailyClosing.readiness.draftSales')}
                  detail={String(closing.draftSalesCheckpointCount)}
                />
                <ReadinessItem
                  ok={closing.missingCostProductCount === 0}
                  label={t('dailyClosing.readiness.missingCosts')}
                  detail={String(closing.missingCostProductCount)}
                />
                <ReadinessItem
                  ok={closing.negativeStockProductCount === 0}
                  label={t('dailyClosing.readiness.negativeStock')}
                  detail={String(closing.negativeStockProductCount)}
                />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t('dailyClosing.items.title')}</h3>
              {closing.items.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  {t('dailyClosing.items.empty')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dailyClosing.items.product')}</TableHead>
                        <TableHead>{t('dailyClosing.items.kind')}</TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.opening')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.purchased')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.produced')}
                        </TableHead>
                        <TableHead className="text-right">{t('dailyClosing.items.sold')}</TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.waste')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.adjustment')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.difference')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.closing')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.revenue')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dailyClosing.items.costOfSales')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closing.items.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">
                            {productById.get(item.productId)?.name ?? t('common.unavailable')}
                          </TableCell>
                          <TableCell>{t(`dailyClosing.kind.${item.productKind}`)}</TableCell>
                          <QuantityCell value={item.openingQuantityMilli} locale={locale} />
                          <QuantityCell value={item.purchasedQuantityMilli} locale={locale} />
                          <QuantityCell value={item.producedQuantityMilli} locale={locale} />
                          <QuantityCell value={item.soldQuantityMilli} locale={locale} />
                          <QuantityCell value={item.wasteQuantityMilli} locale={locale} />
                          <QuantityCell value={item.adjustmentQuantityMilli} locale={locale} />
                          <QuantityCell
                            value={item.reconciliationDifferenceQuantityMilli}
                            locale={locale}
                          />
                          <QuantityCell value={item.closingQuantityMilli} locale={locale} />
                          <TableCell className="text-right tabular-nums">
                            {formatCurrencyAmount(
                              item.estimatedRevenueMinor,
                              closing.currency,
                              locale,
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrencyAmount(
                              item.estimatedCostOfSalesMinor,
                              closing.currency,
                              locale,
                            )}
                            <span className="block text-xs text-muted-foreground">
                              {item.unitCostAmountMinor === undefined
                                ? t('dailyClosing.costBasis.UNAVAILABLE')
                                : `${formatCurrencyAmount(
                                    item.unitCostAmountMinor,
                                    closing.currency,
                                    locale,
                                  )}/${t('dailyClosing.items.unitCost')}`}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            {actionError ? (
              <div
                role="alert"
                data-testid="daily-closing-action-failure"
                className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{describeActionFailure(actionError, t)}</span>
              </div>
            ) : null}

            {reopenOpen ? (
              <div className="space-y-2 rounded-md border p-3">
                <label className="text-sm font-medium" htmlFor="daily-closing-reopen-reason">
                  {t('dailyClosing.reopen.reason')}
                </label>
                <input
                  id="daily-closing-reopen-reason"
                  data-testid="daily-closing-reopen-reason"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={reopen.isPending}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {t('dailyClosing.reopen.reasonHint')}
                </p>
                {reason.trim().length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t('dailyClosing.reopen.reasonRequired')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          {closing?.status === 'DRAFT' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => review.mutate(closing.id, { onSuccess: onUpdated })}
              disabled={pending}
              data-testid="daily-closing-review"
            >
              <Eye aria-hidden className="size-4" />
              {t('dailyClosing.action.review')}
            </Button>
          ) : null}
          {closing && (closing.status === 'DRAFT' || closing.status === 'REVIEWED') ? (
            <Button
              type="button"
              onClick={() => confirm.mutate(closing.id, { onSuccess: onUpdated })}
              disabled={pending}
              data-testid="daily-closing-confirm"
            >
              {confirm.isPending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden className="size-4" />
              )}
              {t('dailyClosing.action.confirm')}
            </Button>
          ) : null}
          {closing?.status === 'CONFIRMED' && !reopenOpen ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setReopenOpen(true)}
              data-testid="daily-closing-reopen"
            >
              <RotateCcw aria-hidden className="size-4" />
              {t('dailyClosing.action.reopen')}
            </Button>
          ) : null}
          {closing?.status === 'CONFIRMED' && reopenOpen ? (
            <Button
              type="button"
              variant="destructive"
              onClick={submitReopen}
              disabled={pending || reason.trim().length === 0}
              data-testid="daily-closing-reopen-submit"
            >
              {reopen.isPending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <RotateCcw aria-hidden className="size-4" />
              )}
              {t('dailyClosing.reopen.submit')}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'destructive';
}) {
  return (
    <div className={cn('rounded-lg border p-4', tone === 'destructive' && 'border-destructive')}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ReadinessItem({
  ok,
  label,
  detail,
}: {
  readonly ok: boolean;
  readonly label: string;
  readonly detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-2.5">
      <span className="flex items-center gap-2">
        <span aria-hidden className={cn('size-2 rounded-full', ok ? 'bg-success' : 'bg-warning')} />
        {label}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{detail}</span>
    </div>
  );
}

function QuantityCell({ value, locale }: { readonly value: number; readonly locale: string }) {
  return (
    <TableCell className="text-right tabular-nums">
      {new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value / 1000)}
    </TableCell>
  );
}

function describeActionFailure(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('dailyClosing.actionFailure.invalidState');
    }
    if (error.code === 'FORBIDDEN') {
      return t('dailyClosing.actionFailure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('dailyClosing.actionFailure.network');
    }
  }
  return t('dailyClosing.actionFailure');
}
