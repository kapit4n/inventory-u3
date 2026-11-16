import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import { ApiClientError } from '@inventory-u3/api-client';
import type { SalesCheckpointResponse } from '@inventory-u3/validation';
import {
  AlertCircle,
  Check,
  Eye,
  Loader2,
  Plus,
  RotateCcw,
  ShoppingBasket,
  Trash2,
} from 'lucide-react';
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
import { formatIsoDate } from '../../products/price-format.js';
import { useConfirmSalesCheckpoint } from '../mutations/use-confirm-sales-checkpoint.js';
import { useSalesCheckpoints } from '../queries/sales-checkpoints-query.js';
import { formatMoneyMinor, totalEstimatedSalesMinor } from '../sales-checkpoint-format.js';
import { SalesCheckpointCorrectionDialog } from './sales-checkpoint-correction-dialog.js';
import { SalesCheckpointDetailDialog } from './sales-checkpoint-detail-dialog.js';
import { SalesCheckpointDiscardDialog } from './sales-checkpoint-discard-dialog.js';
import { SalesCheckpointFormDialog } from './sales-checkpoint-form-dialog.js';

const TONE_BY_STATUS: Readonly<Record<SalesCheckpointResponse['status'], StatusTone>> = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  CORRECTED: 'info',
};

export function SalesCheckpointPage() {
  const { t, locale } = useTranslation();
  const { user } = useSession();
  const branchesQuery = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive);
  const branchId = branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : (branches[0]?.id ?? '');
  const checkpointsQuery = useSalesCheckpoints(branchId);
  const confirm = useConfirmSalesCheckpoint();
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<SalesCheckpointResponse | undefined>();
  const [correcting, setCorrecting] = useState<SalesCheckpointResponse | undefined>();
  const [discarding, setDiscarding] = useState<SalesCheckpointResponse | undefined>();
  const canWrite = user ? hasPermission(user.role, 'inventory:write') : false;
  const branchById = new Map((branchesQuery.data ?? []).map((branch) => [branch.id, branch]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('salesCheckpoint.title')}</h1>
          <p className="text-muted-foreground">{t('salesCheckpoint.description')}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <div className="w-full space-y-1 sm:w-64">
            <label className="text-sm font-medium" htmlFor="sales-checkpoint-list-branch">
              {t('salesCheckpoint.branchFilter')}
            </label>
            <BranchSelector
              id="sales-checkpoint-list-branch"
              value={branchId}
              onValueChange={setSelectedBranchId}
              disabled={branchesQuery.isPending}
            />
          </div>
          {canWrite ? (
            <Button
              type="button"
              onClick={() => setFormOpen(true)}
              data-testid="sales-checkpoint-new"
            >
              <Plus aria-hidden className="size-4" />
              {t('salesCheckpoint.new')}
            </Button>
          ) : null}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('salesCheckpoint.list.title')}</CardTitle>
          <CardDescription>{t('salesCheckpoint.list.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {checkpointsQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('salesCheckpoint.loading')}
            </p>
          ) : null}

          {checkpointsQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('salesCheckpoint.loadFailure')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void checkpointsQuery.refetch()}
                >
                  {t('salesCheckpoint.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {confirm.error ? (
            <div
              role="alert"
              data-testid="sales-checkpoint-action-failure"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeActionFailure(confirm.error, t)}</span>
            </div>
          ) : null}

          {checkpointsQuery.isSuccess && checkpointsQuery.data.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <ShoppingBasket aria-hidden className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="font-medium">{t('salesCheckpoint.list.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('salesCheckpoint.list.emptyDescription')}
              </p>
            </div>
          ) : null}

          {checkpointsQuery.isSuccess && checkpointsQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('salesCheckpoint.column.businessDate')}</TableHead>
                  <TableHead>{t('salesCheckpoint.column.period')}</TableHead>
                  <TableHead>{t('salesCheckpoint.column.branch')}</TableHead>
                  <TableHead>{t('salesCheckpoint.column.status')}</TableHead>
                  <TableHead className="text-right">{t('salesCheckpoint.column.items')}</TableHead>
                  <TableHead className="text-right">
                    {t('salesCheckpoint.column.estimatedSales')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('salesCheckpoint.column.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkpointsQuery.data.map((checkpoint) => {
                  const currency = checkpoint.items[0]?.sellingPriceCurrency;
                  return (
                    <TableRow
                      key={checkpoint.id}
                      data-testid={`sales-checkpoint-row-${checkpoint.id}`}
                    >
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatIsoDate(checkpoint.businessDate, locale)}
                      </TableCell>
                      <TableCell>{t(periodKey(checkpoint.period))}</TableCell>
                      <TableCell>
                        {branchById.get(checkpoint.branchId)?.name ?? t('common.unavailable')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_TONE_CLASS[TONE_BY_STATUS[checkpoint.status]],
                          )}
                        >
                          {t(statusKey(checkpoint.status))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {checkpoint.items.length}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currency
                          ? formatMoneyMinor(
                              totalEstimatedSalesMinor(checkpoint.items),
                              currency,
                              locale,
                            )
                          : t('common.notProvided')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(checkpoint)}
                            data-testid={`sales-checkpoint-view-${checkpoint.id}`}
                          >
                            <Eye aria-hidden className="size-4" />
                            {t('salesCheckpoint.action.view')}
                          </Button>
                          {canWrite && checkpoint.status === 'DRAFT' ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => confirm.mutate(checkpoint.id)}
                                disabled={confirm.isPending}
                                data-testid={`sales-checkpoint-confirm-${checkpoint.id}`}
                              >
                                <Check aria-hidden className="size-4" />
                                {t('salesCheckpoint.action.confirm')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDiscarding(checkpoint)}
                                disabled={confirm.isPending}
                                data-testid={`sales-checkpoint-discard-${checkpoint.id}`}
                              >
                                <Trash2 aria-hidden className="size-4" />
                                {t('salesCheckpoint.action.discard')}
                              </Button>
                            </>
                          ) : null}
                          {canWrite && checkpoint.status === 'CONFIRMED' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCorrecting(checkpoint)}
                              data-testid={`sales-checkpoint-correct-${checkpoint.id}`}
                            >
                              <RotateCcw aria-hidden className="size-4" />
                              {t('salesCheckpoint.action.correct')}
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
            <p className="mt-4 text-xs text-muted-foreground">{t('salesCheckpoint.readOnly')}</p>
          ) : null}
        </CardContent>
      </Card>

      <SalesCheckpointFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <SalesCheckpointDetailDialog
        checkpoint={viewing}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(undefined);
          }
        }}
      />
      <SalesCheckpointCorrectionDialog
        checkpoint={correcting}
        onOpenChange={(open) => {
          if (!open) {
            setCorrecting(undefined);
          }
        }}
      />
      <SalesCheckpointDiscardDialog
        checkpoint={discarding}
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
        ? t('salesCheckpoint.action.failure.state')
        : t('salesCheckpoint.action.failure.stock');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('salesCheckpoint.action.failure.state');
    }
    if (error.code === 'FORBIDDEN') {
      return t('salesCheckpoint.action.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('salesCheckpoint.action.failure.network');
    }
  }
  return t('salesCheckpoint.action.failure');
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
