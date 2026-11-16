import type { ProductionBatchResponse } from '@inventory-u3/validation';
import { ChefHat } from 'lucide-react';
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
import { useEmployees } from '../../employees/queries/employees-query.js';
import { useMeasurementUnits } from '../../measurement-units/queries/measurement-units-query.js';
import { useProducts } from '../../products/queries/products-query.js';
import { useProductPresentations } from '../../products/queries/product-presentations-query.js';
import { formatIsoDate, formatIsoDateTime } from '../../products/price-format.js';
import { formatQuantityMilli, formatTrays, formatWeightGrams } from '../production-format.js';

const TONE_BY_STATUS: Readonly<Record<ProductionBatchResponse['status'], StatusTone>> = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  CORRECTED: 'info',
};

export interface ProductionBatchDetailDialogProps {
  readonly batch?: ProductionBatchResponse;
  readonly onOpenChange: (open: boolean) => void;
}

export function ProductionBatchDetailDialog({
  batch,
  onOpenChange,
}: ProductionBatchDetailDialogProps) {
  const { t, locale } = useTranslation();
  const branchesQuery = useBranches();
  const employeesQuery = useEmployees();
  const productsQuery = useProducts();
  const unitsQuery = useMeasurementUnits();

  const branch = (branchesQuery.data ?? []).find((option) => option.id === batch?.branchId);
  const employee = (employeesQuery.data ?? []).find(
    (option) => option.id === batch?.preparedByEmployeeId,
  );
  const productById = new Map((productsQuery.data ?? []).map((product) => [product.id, product]));
  const unitById = new Map((unitsQuery.data ?? []).map((unit) => [unit.id, unit]));

  return (
    <Dialog open={batch !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('production.detail.title')}</DialogTitle>
          <DialogDescription>{t('production.detail.description')}</DialogDescription>
        </DialogHeader>

        {batch ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                  STATUS_TONE_CLASS[TONE_BY_STATUS[batch.status]],
                )}
              >
                {t(statusKey(batch.status))}
              </span>
              <span className="text-sm font-medium">
                {formatIsoDate(batch.businessDate, locale)}
              </span>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailItem label={t('production.column.branch')}>
                {branch?.name ?? t('common.unavailable')}
              </DetailItem>
              <DetailItem label={t('production.column.preparer')}>
                {employee?.fullName ?? t('common.unavailable')}
              </DetailItem>
              {batch.note ? (
                <DetailItem label={t('production.detail.note')} className="sm:col-span-2">
                  {batch.note}
                </DetailItem>
              ) : null}
              {batch.confirmedAt ? (
                <DetailItem label={t('production.detail.confirmedAt')}>
                  {formatIsoDateTime(batch.confirmedAt, locale)}
                </DetailItem>
              ) : null}
              {batch.correctionReason ? (
                <DetailItem label={t('production.detail.correction')} className="sm:col-span-2">
                  {batch.correctionReason}
                </DetailItem>
              ) : null}
            </dl>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t('production.detail.outputs')}</h3>
              {batch.outputs.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  {t('production.detail.noLines')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('production.form.product')}</TableHead>
                      <TableHead>{t('production.form.presentation')}</TableHead>
                      <TableHead className="text-right">{t('production.detail.trays')}</TableHead>
                      <TableHead className="text-right">
                        {t('production.detail.averageWeight')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('production.detail.estimatedWeight')}
                      </TableHead>
                      <TableHead className="text-right">
                        {t('production.detail.measuredWeight')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.outputs.map((output) => (
                      <OutputDetailRow
                        key={output.id}
                        output={output}
                        productName={
                          productById.get(output.productId)?.name ?? t('common.unavailable')
                        }
                        locale={locale}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t('production.detail.inputs')}</h3>
              {batch.inputs.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  {t('production.detail.noLines')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('production.form.product')}</TableHead>
                      <TableHead className="text-right">{t('production.form.quantity')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.inputs.map((input) => (
                      <TableRow key={input.id}>
                        <TableCell>
                          {productById.get(input.productId)?.name ?? t('common.unavailable')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQuantityMilli(input.quantityMilli, locale)}{' '}
                          {unitById.get(input.unitId)?.code ?? ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t('production.detail.waste')}</h3>
              {batch.waste.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  {t('production.detail.noLines')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('production.form.product')}</TableHead>
                      <TableHead className="text-right">{t('production.form.quantity')}</TableHead>
                      <TableHead>{t('production.form.wasteReason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.waste.map((line) => {
                      const product = productById.get(line.productId);
                      const unit = product ? unitById.get(product.inventoryUnitId) : undefined;
                      return (
                        <TableRow key={line.id}>
                          <TableCell>{product?.name ?? t('common.unavailable')}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQuantityMilli(line.quantityMilli, locale)} {unit?.code ?? ''}
                          </TableCell>
                          <TableCell>
                            {line.reason}
                            {line.note ? (
                              <div className="text-xs text-muted-foreground">{line.note}</div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
        ) : (
          <ChefHat aria-hidden className="size-6 text-muted-foreground" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OutputDetailRow({
  output,
  productName,
  locale,
}: {
  readonly output: ProductionBatchResponse['outputs'][number];
  readonly productName: string;
  readonly locale: 'en' | 'es';
}) {
  const { t } = useTranslation();
  const presentationsQuery = useProductPresentations(output.productId);
  const presentation = (presentationsQuery.data ?? []).find(
    (option) => option.id === output.presentationId,
  );

  return (
    <TableRow>
      <TableCell>{productName}</TableCell>
      <TableCell>{presentation?.name ?? t('common.unavailable')}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatTrays(output.trayCount, locale)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatWeightGrams(output.averageWeightPerTrayGrams, locale)} kg
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatWeightGrams(output.estimatedWeightGrams, locale)} kg
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {output.measuredWeightGrams === undefined
          ? t('common.notProvided')
          : `${formatWeightGrams(output.measuredWeightGrams, locale)} kg · ${t(
              output.weightBasis === 'MEASURED'
                ? 'production.detail.weightBasis.measured'
                : 'production.detail.weightBasis.estimated',
            )}`}
      </TableCell>
    </TableRow>
  );
}

function DetailItem({
  label,
  children,
  className,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function statusKey(status: ProductionBatchResponse['status']): TranslationKey {
  switch (status) {
    case 'DRAFT':
      return 'production.status.draft';
    case 'CONFIRMED':
      return 'production.status.confirmed';
    case 'CORRECTED':
      return 'production.status.corrected';
  }
}
