import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { ProductResponse } from '@inventory-u3/validation';
import {
  AlertCircle,
  History,
  Loader2,
  Scale,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';
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
} from '@inventory-u3/ui';

import { useTranslation, type TranslationKey } from '../../../i18n/index.js';
import { useSession } from '../../auth/session-provider.js';
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { useMeasurementUnits } from '../../measurement-units/queries/measurement-units-query.js';
import { formatIsoDateTime } from '../../products/price-format.js';
import { useProducts } from '../../products/queries/products-query.js';
import { useStockBalances } from '../queries/stock-balances-query.js';
import { formatStockQuantity } from '../stock-quantity.js';
import { InventoryWasteDialog } from './inventory-waste-dialog.js';
import { ReconcileStockDialog } from './reconcile-stock-dialog.js';
import { StockAdjustmentDialog } from './stock-adjustment-dialog.js';
import { StockHistoryDialog } from './stock-history-dialog.js';

export function InventoryPage() {
  const { t, locale } = useTranslation();
  const { user } = useSession();
  const branchesQuery = useBranches();
  const productsQuery = useProducts();
  const unitsQuery = useMeasurementUnits();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [historyProduct, setHistoryProduct] = useState<ProductResponse | undefined>();
  const [adjustingProduct, setAdjustingProduct] = useState<ProductResponse | undefined>();
  const [wasteProduct, setWasteProduct] = useState<ProductResponse | undefined>();
  const [reconcilingProduct, setReconcilingProduct] = useState<ProductResponse | undefined>();
  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive);
  const branchId = branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : (branches[0]?.id ?? '');
  const balancesQuery = useStockBalances(branchId);
  const canWrite = user ? hasPermission(user.role, 'inventory:write') : false;

  const products = [...(productsQuery.data ?? [])]
    .filter((product) => product.isActive)
    .sort((left, right) => left.name.localeCompare(right.name));
  const unitById = new Map((unitsQuery.data ?? []).map((unit) => [unit.id, unit]));
  const balanceByProduct = new Map(
    (balancesQuery.data ?? []).map((balance) => [balance.productId, balance]),
  );
  const hasMovements = (balancesQuery.data ?? []).length > 0;
  const loading = branchesQuery.isPending || productsQuery.isPending || unitsQuery.isPending;
  const loadFailure = branchesQuery.isError || productsQuery.isError || unitsQuery.isError;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">{t('inventory.description')}</p>
        </div>
        <div className="w-full space-y-1 sm:w-64">
          <label className="text-sm font-medium" htmlFor="inventory-branch">
            {t('inventory.branch')}
          </label>
          <BranchSelector
            id="inventory-branch"
            value={branchId}
            onValueChange={setSelectedBranchId}
            disabled={branchesQuery.isPending}
          />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.list.title')}</CardTitle>
          <CardDescription>{t('inventory.list.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('inventory.loading')}
            </p>
          ) : null}

          {loadFailure ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('inventory.loadFailure')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void branchesQuery.refetch();
                    void productsQuery.refetch();
                    void unitsQuery.refetch();
                  }}
                >
                  {t('inventory.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {balancesQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('inventory.balanceFailure')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void balancesQuery.refetch()}
                >
                  {t('inventory.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {!loading && branches.length === 0 ? (
            <EmptyState
              title={t('inventory.noBranches.title')}
              description={t('inventory.noBranches.description')}
            />
          ) : null}

          {!loading && branches.length > 0 && products.length === 0 ? (
            <EmptyState
              title={t('inventory.noProducts.title')}
              description={t('inventory.noProducts.description')}
            />
          ) : null}

          {!loading && branches.length > 0 && products.length > 0 && !hasMovements ? (
            <div className="rounded-md border border-dashed p-4 text-sm">
              <p className="font-medium">{t('inventory.empty.title')}</p>
              <p className="mt-1 text-muted-foreground">{t('inventory.empty.description')}</p>
            </div>
          ) : null}

          {!loading && branches.length > 0 && products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.column.product')}</TableHead>
                  <TableHead>{t('inventory.column.kind')}</TableHead>
                  <TableHead>{t('inventory.column.unit')}</TableHead>
                  <TableHead className="text-right">{t('inventory.column.onHand')}</TableHead>
                  <TableHead>{t('inventory.column.updated')}</TableHead>
                  <TableHead className="text-right">{t('inventory.column.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const balance = balanceByProduct.get(product.id);
                  const unit = unitById.get(product.inventoryUnitId);
                  const unitCode = unit?.code ?? t('common.notProvided');
                  const quantityMilli = balance?.quantityOnHandMilli ?? 0;

                  return (
                    <TableRow key={product.id} data-testid={`stock-row-${product.id}`}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{t(productKindKey(product.kind))}</TableCell>
                      <TableCell>{unitCode}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatStockQuantity(quantityMilli, locale)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {balance
                          ? formatIsoDateTime(balance.updatedAt, locale)
                          : t('inventory.neverUpdated')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryProduct(product)}
                            data-testid={`stock-history-${product.id}`}
                          >
                            <History aria-hidden className="size-4" />
                            {t('inventory.action.history')}
                          </Button>
                          {canWrite ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setAdjustingProduct(product)}
                                data-testid={`stock-adjust-${product.id}`}
                              >
                                <SlidersHorizontal aria-hidden className="size-4" />
                                {t('inventory.action.adjust')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setWasteProduct(product)}
                                data-testid={`stock-waste-${product.id}`}
                              >
                                <TriangleAlert aria-hidden className="size-4" />
                                {t('inventory.action.waste')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setReconcilingProduct(product)}
                                data-testid={`stock-reconcile-${product.id}`}
                              >
                                <Scale aria-hidden className="size-4" />
                                {t('inventory.action.reconcile')}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}

          {!canWrite ? (
            <p className="text-xs text-muted-foreground">{t('inventory.readOnly')}</p>
          ) : null}
        </CardContent>
      </Card>

      <StockHistoryDialog
        product={historyProduct}
        branchId={branchId}
        unitCode={unitCodeFor(historyProduct, unitById, t('common.notProvided'))}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryProduct(undefined);
          }
        }}
      />
      <StockAdjustmentDialog
        product={adjustingProduct}
        branchId={branchId}
        currentQuantityMilli={quantityFor(adjustingProduct, balanceByProduct)}
        unitCode={unitCodeFor(adjustingProduct, unitById, t('common.notProvided'))}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustingProduct(undefined);
          }
        }}
      />
      <InventoryWasteDialog
        product={wasteProduct}
        branchId={branchId}
        currentQuantityMilli={quantityFor(wasteProduct, balanceByProduct)}
        unitCode={unitCodeFor(wasteProduct, unitById, t('common.notProvided'))}
        onOpenChange={(open) => {
          if (!open) {
            setWasteProduct(undefined);
          }
        }}
      />
      <ReconcileStockDialog
        product={reconcilingProduct}
        branchId={branchId}
        expectedQuantityMilli={quantityFor(reconcilingProduct, balanceByProduct)}
        unitCode={unitCodeFor(reconcilingProduct, unitById, t('common.notProvided'))}
        onOpenChange={(open) => {
          if (!open) {
            setReconcilingProduct(undefined);
          }
        }}
      />
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function quantityFor(
  product: ProductResponse | undefined,
  balances: ReadonlyMap<string, { readonly quantityOnHandMilli: number }>,
): number {
  if (!product) {
    return 0;
  }
  return balances.get(product.id)?.quantityOnHandMilli ?? 0;
}

function unitCodeFor(
  product: ProductResponse | undefined,
  units: ReadonlyMap<string, { readonly code: string }>,
  fallback: string,
): string {
  if (!product) {
    return fallback;
  }
  return units.get(product.inventoryUnitId)?.code ?? fallback;
}

function productKindKey(kind: ProductResponse['kind']): TranslationKey {
  return kind === 'RAW' ? 'products.kind.raw' : 'products.kind.processed';
}
