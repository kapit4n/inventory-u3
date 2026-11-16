import type { SalesCheckpointResponse } from '@inventory-u3/validation';
import { ShoppingBasket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useMeasurementUnits } from '../../measurement-units/queries/measurement-units-query.js';
import { useProducts } from '../../products/queries/products-query.js';
import { useProductPresentations } from '../../products/queries/product-presentations-query.js';
import { formatIsoDate, formatIsoDateTime } from '../../products/price-format.js';
import {
  formatMoneyMinor,
  formatQuantityMilli,
  formatTrays,
  formatWeightGrams,
  totalEstimatedSalesMinor,
} from '../sales-checkpoint-format.js';

const TONE_BY_STATUS: Readonly<Record<SalesCheckpointResponse['status'], StatusTone>> = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  CORRECTED: 'info',
};

export interface SalesCheckpointDetailDialogProps {
  readonly checkpoint?: SalesCheckpointResponse;
  readonly onOpenChange: (open: boolean) => void;
}

export function SalesCheckpointDetailDialog({
  checkpoint,
  onOpenChange,
}: SalesCheckpointDetailDialogProps) {
  const { t, locale } = useTranslation();
  const branchesQuery = useBranches();
  const productsQuery = useProducts();
  const unitsQuery = useMeasurementUnits();
  const branch = (branchesQuery.data ?? []).find((option) => option.id === checkpoint?.branchId);
  const productById = new Map((productsQuery.data ?? []).map((product) => [product.id, product]));
  const unitById = new Map((unitsQuery.data ?? []).map((unit) => [unit.id, unit]));
  const currency = checkpoint?.items[0]?.sellingPriceCurrency;

  return (
    <Dialog open={checkpoint !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('salesCheckpoint.detail.title')}</DialogTitle>
          <DialogDescription>{t('salesCheckpoint.detail.description')}</DialogDescription>
        </DialogHeader>

        {checkpoint ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                  STATUS_TONE_CLASS[TONE_BY_STATUS[checkpoint.status]],
                )}
              >
                {t(statusKey(checkpoint.status))}
              </span>
              <span className="text-sm font-medium">
                {formatIsoDate(checkpoint.businessDate, locale)} · {t(periodKey(checkpoint.period))}
              </span>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailItem label={t('salesCheckpoint.column.branch')}>
                {branch?.name ?? t('common.unavailable')}
              </DetailItem>
              {checkpoint.note ? (
                <DetailItem label={t('salesCheckpoint.detail.note')}>{checkpoint.note}</DetailItem>
              ) : null}
              {checkpoint.confirmedAt ? (
                <DetailItem label={t('salesCheckpoint.detail.confirmedAt')}>
                  {formatIsoDateTime(checkpoint.confirmedAt, locale)}
                </DetailItem>
              ) : null}
              {checkpoint.correctionReason ? (
                <DetailItem label={t('salesCheckpoint.detail.correction')}>
                  {checkpoint.correctionReason}
                </DetailItem>
              ) : null}
              {currency ? (
                <DetailItem label={t('salesCheckpoint.detail.estimatedSales')}>
                  {formatMoneyMinor(totalEstimatedSalesMinor(checkpoint.items), currency, locale)}
                </DetailItem>
              ) : null}
            </dl>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t('salesCheckpoint.detail.items')}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('salesCheckpoint.form.product')}</TableHead>
                    <TableHead>{t('salesCheckpoint.detail.kind')}</TableHead>
                    <TableHead className="text-right">
                      {t('salesCheckpoint.form.quantity')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('salesCheckpoint.detail.sellingPrice')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('salesCheckpoint.detail.estimatedSales')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkpoint.items.map((item) => (
                    <SalesItemDetailRow
                      key={item.id}
                      item={item}
                      productName={productById.get(item.productId)?.name ?? t('common.unavailable')}
                      unitCode={unitById.get(item.unitId)?.code ?? ''}
                      locale={locale}
                    />
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>
        ) : (
          <ShoppingBasket aria-hidden className="size-6 text-muted-foreground" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SalesItemDetailRow({
  item,
  productName,
  unitCode,
  locale,
}: {
  readonly item: SalesCheckpointResponse['items'][number];
  readonly productName: string;
  readonly unitCode: string;
  readonly locale: 'en' | 'es';
}) {
  const { t } = useTranslation();
  const presentationsQuery = useProductPresentations(
    item.productId,
    item.presentationId !== undefined,
  );
  const presentation = (presentationsQuery.data ?? []).find(
    (option) => option.id === item.presentationId,
  );

  return (
    <TableRow>
      <TableCell>
        <div>{productName}</div>
        {item.productKind === 'PROCESSED' ? (
          <div className="text-xs text-muted-foreground">
            {presentation?.name ?? t('common.unavailable')} ·{' '}
            {formatTrays(item.trayCount ?? 0, locale)} {t('salesCheckpoint.detail.trays')} ·{' '}
            {item.measuredWeightGrams === undefined
              ? t('salesCheckpoint.detail.weightBasis.estimated')
              : t('salesCheckpoint.detail.weightBasis.measured')}
          </div>
        ) : null}
      </TableCell>
      <TableCell>{t(kindKey(item.productKind))}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatQuantityMilli(item.quantityMilli, locale)} {unitCode}
        {item.productKind === 'PROCESSED' && item.estimatedWeightGrams !== undefined ? (
          <div className="text-xs text-muted-foreground">
            {t('salesCheckpoint.detail.estimatedWeight')}:{' '}
            {formatWeightGrams(item.estimatedWeightGrams, locale)} kg
          </div>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoneyMinor(item.sellingPriceAmountMinor, item.sellingPriceCurrency, locale)} /{' '}
        {t(
          item.sellingPriceBasis === 'PER_KILOGRAM'
            ? 'salesCheckpoint.detail.perKilogram'
            : 'salesCheckpoint.detail.perUnit',
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMoneyMinor(item.estimatedSalesValueMinor, item.sellingPriceCurrency, locale)}
      </TableCell>
    </TableRow>
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
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function statusKey(status: SalesCheckpointResponse['status']): TranslationKey {
  switch (status) {
    case 'DRAFT':
      return 'salesCheckpoint.status.draft';
    case 'CONFIRMED':
      return 'salesCheckpoint.status.confirmed';
    case 'CORRECTED':
      return 'salesCheckpoint.status.corrected';
  }
}

function periodKey(period: SalesCheckpointResponse['period']): TranslationKey {
  return period === 'MORNING' ? 'salesCheckpoint.period.morning' : 'salesCheckpoint.period.evening';
}

function kindKey(kind: SalesCheckpointResponse['items'][number]['productKind']): TranslationKey {
  return kind === 'PROCESSED'
    ? 'salesCheckpoint.detail.kind.processed'
    : 'salesCheckpoint.detail.kind.raw';
}
