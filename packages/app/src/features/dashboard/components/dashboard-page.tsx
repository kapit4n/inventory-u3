import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import { AlertCircle, Download, Loader2, RefreshCw } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@inventory-u3/ui';

import { useTranslation, type Translate } from '../../../i18n/index.js';
import { usePlatform } from '../../../providers.js';
import { useSession } from '../../auth/session-provider.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { formatStockQuantity } from '../../inventory/stock-quantity.js';
import { formatCurrencyAmount, formatIsoDate, todayIsoDate } from '../../products/price-format.js';
import { reportCsvFilename, reportToCsv, type ReportCsvLabels } from '../report-csv.js';
import { useReport } from '../queries/report-query.js';

const ALL_BRANCHES = 'all';

function defaultRange(): { readonly from: string; readonly to: string } {
  const to = todayIsoDate();
  const fromDate = new Date(`${to}T00:00:00.000Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - 6);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

export function DashboardPage() {
  const { t, locale } = useTranslation();
  const { user } = useSession();
  const platform = usePlatform();
  const branchesQuery = useBranches();
  const [range, setRange] = useState(defaultRange);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [branchId, setBranchId] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [exportFailure, setExportFailure] = useState(false);
  const canRead = user ? hasPermission(user.role, 'reports:read') : false;
  const validRange = range.from.length > 0 && range.to.length > 0 && range.from <= range.to;
  const filters = {
    from: range.from,
    to: range.to,
    granularity,
    ...(branchId === '' ? {} : { branchId }),
  };
  const reportQuery = useReport(filters, canRead && validRange);
  const report = reportQuery.data;
  const csvLabels = buildCsvLabels(t);

  async function exportReport() {
    if (!report) {
      return;
    }

    setExportFailure(false);
    setExportMessage('');
    try {
      const name = await platform.saveFile(
        reportCsvFilename(report),
        reportToCsv(report, csvLabels),
      );
      setExportMessage(t('dashboard.export.success', { name }));
    } catch {
      setExportFailure(true);
      setExportMessage(t('dashboard.export.failure'));
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="dashboard-page">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">{t('dashboard.description')}</p>
        </div>
        {canRead ? (
          <Button
            type="button"
            onClick={() => void exportReport()}
            disabled={report === undefined || reportQuery.isFetching}
            data-testid="dashboard-export"
          >
            <Download aria-hidden className="size-4" />
            {t('dashboard.export.action')}
          </Button>
        ) : null}
      </header>

      {!canRead ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.permission.title')}</CardTitle>
            <CardDescription>{t('dashboard.permission.description')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="dashboard-from">{t('dashboard.filters.from')}</Label>
                <Input
                  id="dashboard-from"
                  type="date"
                  value={range.from}
                  onChange={(event) =>
                    setRange((current) => ({ ...current, from: event.target.value }))
                  }
                  data-testid="dashboard-from"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dashboard-to">{t('dashboard.filters.to')}</Label>
                <Input
                  id="dashboard-to"
                  type="date"
                  value={range.to}
                  onChange={(event) =>
                    setRange((current) => ({ ...current, to: event.target.value }))
                  }
                  data-testid="dashboard-to"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dashboard-granularity">{t('dashboard.filters.granularity')}</Label>
                <Select
                  value={granularity}
                  onValueChange={(value) => setGranularity(value as 'day' | 'week' | 'month')}
                >
                  <SelectTrigger id="dashboard-granularity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">{t('dashboard.granularity.day')}</SelectItem>
                    <SelectItem value="week">{t('dashboard.granularity.week')}</SelectItem>
                    <SelectItem value="month">{t('dashboard.granularity.month')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dashboard-branch">{t('dashboard.filters.branch')}</Label>
                <Select
                  value={branchId === '' ? ALL_BRANCHES : branchId}
                  onValueChange={(value) => setBranchId(value === ALL_BRANCHES ? '' : value)}
                >
                  <SelectTrigger id="dashboard-branch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_BRANCHES}>
                      {t('dashboard.filters.allBranches')}
                    </SelectItem>
                    {(branchesQuery.data ?? []).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {!validRange ? (
            <p
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              {t('dashboard.filters.invalidRange')}
            </p>
          ) : null}

          {reportQuery.isPending && validRange ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('dashboard.loading')}
            </p>
          ) : null}

          {reportQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('dashboard.loadFailure')}</p>
                <Button type="button" variant="outline" onClick={() => void reportQuery.refetch()}>
                  <RefreshCw aria-hidden className="size-4" />
                  {t('dashboard.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {report ? (
            <>
              {report.totals.missingCostProductCount > 0 ? (
                <p
                  role="status"
                  className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
                >
                  {t('dashboard.missingCost', {
                    count: report.totals.missingCostProductCount,
                  })}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  label={t('dashboard.metrics.sales')}
                  value={formatCurrencyAmount(
                    report.totals.salesTotalMinor,
                    report.currency,
                    locale,
                  )}
                  hint={t('dashboard.metrics.salesHint', {
                    count: report.totals.salesCheckpointCount,
                  })}
                />
                <MetricCard
                  label={t('dashboard.metrics.purchases')}
                  value={formatCurrencyAmount(
                    report.totals.purchasesTotalMinor,
                    report.currency,
                    locale,
                  )}
                  hint={t('dashboard.metrics.purchasesHint', {
                    count: report.totals.purchaseCount,
                  })}
                />
                <MetricCard
                  label={t('dashboard.metrics.estimatedProfit')}
                  value={formatCurrencyAmount(
                    report.totals.estimatedGrossProfitMinor,
                    report.currency,
                    locale,
                  )}
                  hint={t('dashboard.metrics.estimatedProfitHint')}
                />
                <MetricCard
                  label={t('dashboard.metrics.estimatedCost')}
                  value={formatCurrencyAmount(
                    report.totals.estimatedCostMinor,
                    report.currency,
                    locale,
                  )}
                  hint={t('dashboard.metrics.estimatedCostHint')}
                />
                <MetricCard
                  label={t('dashboard.metrics.production')}
                  value={t('dashboard.metrics.productionValue', {
                    trays: report.totals.productionTrayCount,
                    kg: formatStockQuantity(report.totals.productionEstimatedWeightGrams, locale),
                  })}
                  hint={t('dashboard.metrics.productionHint', {
                    count: report.totals.productionBatchCount,
                  })}
                />
                <MetricCard
                  label={t('dashboard.metrics.inventory')}
                  value={t('dashboard.metrics.inventoryValue', {
                    count: report.totals.inventoryProductCount,
                  })}
                  hint={t('dashboard.metrics.inventoryHint', {
                    count: report.totals.wasteRecordCount,
                  })}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.periods.title')}</CardTitle>
                  <CardDescription>{t('dashboard.periods.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dashboard.columns.period')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.columns.sales')}</TableHead>
                        <TableHead className="text-right">
                          {t('dashboard.columns.purchases')}
                        </TableHead>
                        <TableHead className="text-right">{t('dashboard.columns.cost')}</TableHead>
                        <TableHead className="text-right">
                          {t('dashboard.columns.profit')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('dashboard.columns.checkpoints')}
                        </TableHead>
                        <TableHead className="text-right">{t('dashboard.columns.trays')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.columns.waste')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.periods.map((period) => (
                        <TableRow key={period.periodStart}>
                          <TableCell className="whitespace-nowrap">
                            {period.periodStart === period.periodEnd
                              ? formatIsoDate(period.periodStart, locale)
                              : `${formatIsoDate(period.periodStart, locale)} – ${formatIsoDate(period.periodEnd, locale)}`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrencyAmount(period.salesTotalMinor, report.currency, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrencyAmount(
                              period.purchasesTotalMinor,
                              report.currency,
                              locale,
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrencyAmount(
                              period.estimatedCostMinor,
                              report.currency,
                              locale,
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrencyAmount(
                              period.estimatedGrossProfitMinor,
                              report.currency,
                              locale,
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {period.salesCheckpointCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {period.productionTrayCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {period.wasteRecordCount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-2">
                <ReportTable
                  title={t('dashboard.salesByBranch.title')}
                  description={t('dashboard.salesByBranch.description')}
                  empty={report.salesByBranch.length === 0}
                  emptyLabel={t('dashboard.empty')}
                  headers={[
                    t('dashboard.columns.branch'),
                    t('dashboard.columns.sales'),
                    t('dashboard.columns.cost'),
                    t('dashboard.columns.profit'),
                    t('dashboard.columns.checkpoints'),
                  ]}
                  rows={report.salesByBranch.map((branch) => [
                    branch.branchName,
                    formatCurrencyAmount(branch.salesTotalMinor, report.currency, locale),
                    formatCurrencyAmount(branch.estimatedCostMinor, report.currency, locale),
                    formatCurrencyAmount(branch.estimatedGrossProfitMinor, report.currency, locale),
                    String(branch.checkpointCount),
                  ])}
                />

                <ReportTable
                  title={t('dashboard.salesByProduct.title')}
                  description={t('dashboard.salesByProduct.description')}
                  empty={report.salesByProduct.length === 0}
                  emptyLabel={t('dashboard.empty')}
                  headers={[
                    t('dashboard.columns.product'),
                    t('dashboard.columns.quantity'),
                    t('dashboard.columns.sales'),
                    t('dashboard.columns.estimatedKg'),
                    t('dashboard.columns.profit'),
                  ]}
                  rows={report.salesByProduct.map((product) => [
                    product.productName,
                    `${formatStockQuantity(product.quantityMilli, locale)} ${product.unitCode}`,
                    formatCurrencyAmount(product.salesTotalMinor, report.currency, locale),
                    formatStockQuantity(product.estimatedWeightGrams, locale),
                    formatCurrencyAmount(
                      product.estimatedGrossProfitMinor,
                      report.currency,
                      locale,
                    ),
                  ])}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <ReportTable
                  title={t('dashboard.purchases.title')}
                  description={t('dashboard.purchases.description')}
                  empty={report.purchasesBySupplier.length === 0}
                  emptyLabel={t('dashboard.empty')}
                  headers={[
                    t('dashboard.columns.supplier'),
                    t('dashboard.columns.purchasesCount'),
                    t('dashboard.columns.total'),
                  ]}
                  rows={report.purchasesBySupplier.map((supplier) => [
                    supplier.supplierName,
                    String(supplier.purchaseCount),
                    formatCurrencyAmount(supplier.totalMinor, report.currency, locale),
                  ])}
                />

                <ReportTable
                  title={t('dashboard.production.title')}
                  description={t('dashboard.production.description')}
                  empty={report.productionByProduct.length === 0}
                  emptyLabel={t('dashboard.empty')}
                  headers={[
                    t('dashboard.columns.product'),
                    t('dashboard.columns.batches'),
                    t('dashboard.columns.trays'),
                    t('dashboard.columns.estimatedKg'),
                  ]}
                  rows={report.productionByProduct.map((product) => [
                    product.productName,
                    String(product.batchCount),
                    String(product.trayCount),
                    formatStockQuantity(product.estimatedWeightGrams, locale),
                  ])}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <ReportTable
                  title={t('dashboard.waste.title')}
                  description={t('dashboard.waste.description')}
                  empty={report.wasteByProduct.length === 0}
                  emptyLabel={t('dashboard.empty')}
                  headers={[
                    t('dashboard.columns.product'),
                    t('dashboard.columns.source'),
                    t('dashboard.columns.quantity'),
                    t('dashboard.columns.records'),
                  ]}
                  rows={report.wasteByProduct.map((waste) => [
                    waste.productName,
                    t(
                      waste.source === 'INVENTORY'
                        ? 'dashboard.wasteSource.inventory'
                        : 'dashboard.wasteSource.production',
                    ),
                    `${formatStockQuantity(waste.quantityMilli, locale)} ${waste.unitCode}`,
                    String(waste.recordCount),
                  ])}
                />

                <ReportTable
                  title={t('dashboard.inventory.title')}
                  description={t('dashboard.inventory.description')}
                  empty={report.inventoryByProduct.length === 0}
                  emptyLabel={t('dashboard.empty')}
                  headers={[
                    t('dashboard.columns.branch'),
                    t('dashboard.columns.product'),
                    t('dashboard.columns.quantity'),
                  ]}
                  rows={report.inventoryByProduct.map((inventory) => [
                    inventory.branchName,
                    inventory.productName,
                    `${formatStockQuantity(inventory.quantityMilli, locale)} ${inventory.unitCode}`,
                  ])}
                />
              </div>

              <p
                aria-live="polite"
                className={
                  exportFailure ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'
                }
              >
                {exportMessage}
              </p>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ReportTable({
  title,
  description,
  empty,
  emptyLabel,
  headers,
  rows,
}: {
  readonly title: string;
  readonly description: string;
  readonly empty: boolean;
  readonly emptyLabel: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={header} className={index === 0 ? undefined : 'text-right'}>
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.join('|')}>
                  {row.map((cell, index) => (
                    <TableCell
                      key={`${headers[index] ?? index}-${cell}`}
                      className={index === 0 ? undefined : 'text-right tabular-nums'}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function buildCsvLabels(t: Translate): ReportCsvLabels {
  return {
    sections: {
      summary: t('dashboard.csv.sections.summary'),
      periods: t('dashboard.csv.sections.periods'),
      salesByBranch: t('dashboard.csv.sections.salesByBranch'),
      salesByProduct: t('dashboard.csv.sections.salesByProduct'),
      purchasesBySupplier: t('dashboard.csv.sections.purchasesBySupplier'),
      productionByProduct: t('dashboard.csv.sections.productionByProduct'),
      wasteByProduct: t('dashboard.csv.sections.wasteByProduct'),
      inventoryByProduct: t('dashboard.csv.sections.inventoryByProduct'),
    },
    summary: {
      metric: t('dashboard.csv.summary.metric'),
      value: t('dashboard.csv.summary.value'),
      sales: t('dashboard.csv.summary.sales'),
      purchases: t('dashboard.csv.summary.purchases'),
      estimatedCost: t('dashboard.csv.summary.estimatedCost'),
      estimatedGrossProfit: t('dashboard.csv.summary.estimatedGrossProfit'),
      missingCostProducts: t('dashboard.csv.summary.missingCostProducts'),
      salesCheckpoints: t('dashboard.csv.summary.salesCheckpoints'),
      purchaseCount: t('dashboard.csv.summary.purchaseCount'),
      productionBatches: t('dashboard.csv.summary.productionBatches'),
      productionTrays: t('dashboard.csv.summary.productionTrays'),
      productionEstimatedKg: t('dashboard.csv.summary.productionEstimatedKg'),
      wasteRecords: t('dashboard.csv.summary.wasteRecords'),
      inventoryProducts: t('dashboard.csv.summary.inventoryProducts'),
      currency: t('dashboard.csv.summary.currency'),
      range: t('dashboard.csv.summary.range'),
    },
    columns: {
      period: t('dashboard.csv.columns.period'),
      sales: t('dashboard.csv.columns.sales'),
      purchases: t('dashboard.csv.columns.purchases'),
      estimatedCost: t('dashboard.csv.columns.estimatedCost'),
      estimatedGrossProfit: t('dashboard.csv.columns.estimatedGrossProfit'),
      salesCheckpoints: t('dashboard.csv.columns.salesCheckpoints'),
      purchaseCount: t('dashboard.csv.columns.purchaseCount'),
      productionBatches: t('dashboard.csv.columns.productionBatches'),
      productionTrays: t('dashboard.csv.columns.productionTrays'),
      wasteRecords: t('dashboard.csv.columns.wasteRecords'),
      branch: t('dashboard.csv.columns.branch'),
      product: t('dashboard.csv.columns.product'),
      unit: t('dashboard.csv.columns.unit'),
      quantity: t('dashboard.csv.columns.quantity'),
      revenue: t('dashboard.csv.columns.revenue'),
      supplier: t('dashboard.csv.columns.supplier'),
      source: t('dashboard.csv.columns.source'),
      records: t('dashboard.csv.columns.records'),
      estimatedKg: t('dashboard.csv.columns.estimatedKg'),
      measuredKg: t('dashboard.csv.columns.measuredKg'),
      checkpointCount: t('dashboard.csv.columns.checkpointCount'),
      missingCostProducts: t('dashboard.csv.columns.missingCostProducts'),
    },
  };
}
