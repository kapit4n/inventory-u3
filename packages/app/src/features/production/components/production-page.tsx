import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import { ApiClientError } from '@inventory-u3/api-client';
import type { ProductionBatchResponse } from '@inventory-u3/validation';
import { AlertCircle, Check, ChefHat, Eye, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
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
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { useEmployees } from '../../employees/queries/employees-query.js';
import { formatIsoDate } from '../../products/price-format.js';
import { useConfirmProductionBatch } from '../mutations/use-confirm-production-batch.js';
import { useProductionBatches } from '../queries/production-batches-query.js';
import { formatTrays, formatWeightGrams } from '../production-format.js';
import { ProductionBatchDetailDialog } from './production-batch-detail-dialog.js';
import { ProductionCorrectionDialog } from './production-correction-dialog.js';
import { ProductionDiscardDialog } from './production-discard-dialog.js';
import { ProductionFormDialog } from './production-form-dialog.js';

const TONE_BY_STATUS: Readonly<Record<ProductionBatchResponse['status'], StatusTone>> = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  CORRECTED: 'info',
};

export function ProductionPage() {
  const { t, locale } = useTranslation();
  const { user } = useSession();
  const branchesQuery = useBranches();
  const employeesQuery = useEmployees();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive);
  const branchId = branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : (branches[0]?.id ?? '');
  const batchesQuery = useProductionBatches(branchId);
  const confirm = useConfirmProductionBatch();
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<ProductionBatchResponse | undefined>();
  const [correcting, setCorrecting] = useState<ProductionBatchResponse | undefined>();
  const [discarding, setDiscarding] = useState<ProductionBatchResponse | undefined>();
  const canWrite = user ? hasPermission(user.role, 'inventory:write') : false;

  const branchById = new Map((branchesQuery.data ?? []).map((branch) => [branch.id, branch]));
  const employeeById = new Map(
    (employeesQuery.data ?? []).map((employee) => [employee.id, employee]),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('production.title')}</h1>
          <p className="text-muted-foreground">{t('production.description')}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <div className="w-full space-y-1 sm:w-64">
            <label className="text-sm font-medium" htmlFor="production-list-branch">
              {t('production.branchFilter')}
            </label>
            <BranchSelector
              id="production-list-branch"
              value={branchId}
              onValueChange={setSelectedBranchId}
              disabled={branchesQuery.isPending}
            />
          </div>
          {canWrite ? (
            <Button type="button" onClick={() => setFormOpen(true)} data-testid="production-new">
              <Plus aria-hidden className="size-4" />
              {t('production.new')}
            </Button>
          ) : null}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('production.list.title')}</CardTitle>
          <CardDescription>{t('production.list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('production.loading')}
            </p>
          ) : null}

          {batchesQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('production.loadFailure')}</p>
                <Button type="button" variant="outline" onClick={() => void batchesQuery.refetch()}>
                  {t('production.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {confirm.error ? (
            <div
              role="alert"
              data-testid="production-action-failure"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeActionFailure(confirm.error, t)}</span>
            </div>
          ) : null}

          {batchesQuery.isSuccess && batchesQuery.data.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <ChefHat aria-hidden className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="font-medium">{t('production.list.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('production.list.emptyDescription')}
              </p>
            </div>
          ) : null}

          {batchesQuery.isSuccess && batchesQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('production.column.businessDate')}</TableHead>
                  <TableHead>{t('production.column.branch')}</TableHead>
                  <TableHead>{t('production.column.preparer')}</TableHead>
                  <TableHead>{t('production.column.status')}</TableHead>
                  <TableHead>{t('production.column.outputs')}</TableHead>
                  <TableHead className="text-right">{t('production.column.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchesQuery.data.map((batch) => {
                  const trayCount = batch.outputs.reduce(
                    (total, output) => total + output.trayCount,
                    0,
                  );
                  const weightGrams = batch.outputs.reduce(
                    (total, output) =>
                      total + (output.measuredWeightGrams ?? output.estimatedWeightGrams),
                    0,
                  );

                  return (
                    <TableRow key={batch.id} data-testid={`production-row-${batch.id}`}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatIsoDate(batch.businessDate, locale)}
                      </TableCell>
                      <TableCell>
                        {branchById.get(batch.branchId)?.name ?? t('common.unavailable')}
                      </TableCell>
                      <TableCell>
                        <div>
                          {employeeById.get(batch.preparedByEmployeeId)?.fullName ??
                            t('common.unavailable')}
                        </div>
                        {batch.note ? (
                          <div className="max-w-48 truncate text-xs text-muted-foreground">
                            {batch.note}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_TONE_CLASS[TONE_BY_STATUS[batch.status]],
                          )}
                        >
                          {t(statusKey(batch.status))}
                        </span>
                      </TableCell>
                      <TableCell>
                        {batch.outputs.length === 0 ? (
                          t('common.notProvided')
                        ) : (
                          <div>
                            <div>{t('production.column.outputs')}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTrays(trayCount, locale)} ·{' '}
                              {formatWeightGrams(weightGrams, locale)} kg
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(batch)}
                            data-testid={`production-view-${batch.id}`}
                          >
                            <Eye aria-hidden className="size-4" />
                            {t('production.action.view')}
                          </Button>
                          {canWrite && batch.status === 'DRAFT' ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => confirm.mutate(batch.id)}
                                disabled={confirm.isPending}
                                data-testid={`production-confirm-${batch.id}`}
                              >
                                <Check aria-hidden className="size-4" />
                                {t('production.action.confirm')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDiscarding(batch)}
                                disabled={confirm.isPending}
                                data-testid={`production-discard-${batch.id}`}
                              >
                                <Trash2 aria-hidden className="size-4" />
                                {t('production.action.discard')}
                              </Button>
                            </>
                          ) : null}
                          {canWrite && batch.status === 'CONFIRMED' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCorrecting(batch)}
                              data-testid={`production-correct-${batch.id}`}
                            >
                              <RotateCcw aria-hidden className="size-4" />
                              {t('production.action.correct')}
                            </Button>
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
            <p className="mt-4 text-xs text-muted-foreground">{t('production.readOnly')}</p>
          ) : null}
        </CardContent>
      </Card>

      <ProductionFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ProductionBatchDetailDialog
        batch={viewing}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(undefined);
          }
        }}
      />
      <ProductionCorrectionDialog
        batch={correcting}
        onOpenChange={(open) => {
          if (!open) {
            setCorrecting(undefined);
          }
        }}
      />
      <ProductionDiscardDialog
        batch={discarding}
        onOpenChange={(open) => {
          if (!open) {
            setDiscarding(undefined);
          }
        }}
      />
    </div>
  );
}

function describeActionFailure(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return error.details.resultingQuantityMilli === undefined
        ? t('production.action.failure.state')
        : t('production.action.failure.stock');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('production.action.failure.state');
    }
    if (error.code === 'FORBIDDEN') {
      return t('production.action.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('production.action.failure.network');
    }
  }
  return t('production.action.failure');
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
