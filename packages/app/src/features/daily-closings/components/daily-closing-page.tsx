import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { DailyClosingResponse } from '@inventory-u3/validation';
import { AlertCircle, CalendarCheck, Eye, Loader2, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
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

import { useTranslation } from '../../../i18n/index.js';
import { useSession } from '../../auth/session-provider.js';
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { formatCurrencyAmount, formatIsoDate, todayIsoDate } from '../../products/price-format.js';
import { openWarningCount } from '../daily-closing-format.js';
import { useDailyClosings } from '../queries/daily-closings-query.js';
import { DailyClosingCreateDialog } from './daily-closing-create-dialog.js';
import { DailyClosingDetailDialog } from './daily-closing-detail-dialog.js';

const TONE_BY_STATUS: Readonly<Record<DailyClosingResponse['status'], StatusTone>> = {
  DRAFT: 'warning',
  REVIEWED: 'info',
  CONFIRMED: 'success',
  REOPENED: 'info',
};

export function DailyClosingPage() {
  const { t, locale } = useTranslation();
  const { user } = useSession();
  const branchesQuery = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [businessDate, setBusinessDate] = useState(todayIsoDate());
  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive);
  const branchId = branches.some((branch) => branch.id === selectedBranchId)
    ? selectedBranchId
    : (branches[0]?.id ?? '');
  const closingsQuery = useDailyClosings(branchId, businessDate);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<DailyClosingResponse | undefined>();
  const canWrite = user ? hasPermission(user.role, 'inventory:write') : false;
  const branchById = new Map((branchesQuery.data ?? []).map((branch) => [branch.id, branch]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dailyClosing.title')}</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">{t('dailyClosing.description')}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
          <div className="w-full space-y-1 sm:w-56">
            <Label htmlFor="daily-closing-list-branch">{t('dailyClosing.branchFilter')}</Label>
            <BranchSelector
              id="daily-closing-list-branch"
              value={branchId}
              onValueChange={setSelectedBranchId}
              disabled={branchesQuery.isPending}
            />
          </div>
          <div className="w-full space-y-1 sm:w-48">
            <Label htmlFor="daily-closing-list-date">{t('dailyClosing.businessDate')}</Label>
            <Input
              id="daily-closing-list-date"
              type="date"
              value={businessDate}
              onChange={(event) => setBusinessDate(event.target.value)}
              data-testid="daily-closing-list-date"
            />
          </div>
          {canWrite ? (
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              data-testid="daily-closing-new"
            >
              <Plus aria-hidden className="size-4" />
              {t('dailyClosing.new')}
            </Button>
          ) : null}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('dailyClosing.column.date')}</CardTitle>
          <CardDescription>
            {formatIsoDate(businessDate, locale)} ·{' '}
            {branchById.get(branchId)?.name ?? t('common.unavailable')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {closingsQuery.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('dailyClosing.loading')}
            </p>
          ) : null}

          {closingsQuery.isError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-2">
                <p>{t('dailyClosing.loadFailure')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void closingsQuery.refetch()}
                >
                  {t('dailyClosing.retry')}
                </Button>
              </div>
            </div>
          ) : null}

          {closingsQuery.isSuccess && closingsQuery.data.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center">
              <CalendarCheck aria-hidden className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="font-medium">{t('dailyClosing.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('dailyClosing.emptyDescription')}
              </p>
            </div>
          ) : null}

          {closingsQuery.isSuccess && closingsQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dailyClosing.column.date')}</TableHead>
                  <TableHead>{t('dailyClosing.column.branch')}</TableHead>
                  <TableHead>{t('dailyClosing.column.status')}</TableHead>
                  <TableHead className="text-right">{t('dailyClosing.column.version')}</TableHead>
                  <TableHead className="text-right">{t('dailyClosing.column.revenue')}</TableHead>
                  <TableHead className="text-right">{t('dailyClosing.column.cost')}</TableHead>
                  <TableHead className="text-right">{t('dailyClosing.column.profit')}</TableHead>
                  <TableHead className="text-right">{t('dailyClosing.column.warnings')}</TableHead>
                  <TableHead className="text-right">{t('dailyClosing.column.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closingsQuery.data.map((closing) => {
                  const warnings = openWarningCount(closing);
                  return (
                    <TableRow key={closing.id} data-testid={`daily-closing-row-${closing.id}`}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatIsoDate(closing.businessDate, locale)}
                      </TableCell>
                      <TableCell>
                        {branchById.get(closing.branchId)?.name ?? t('common.unavailable')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_TONE_CLASS[TONE_BY_STATUS[closing.status]],
                          )}
                        >
                          {t(`dailyClosing.status.${closing.status}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{closing.version}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyAmount(
                          closing.estimatedRevenueMinor,
                          closing.currency,
                          locale,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyAmount(closing.estimatedCostMinor, closing.currency, locale)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyAmount(
                          closing.estimatedGrossProfitMinor,
                          closing.currency,
                          locale,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {warnings === 0 ? '—' : t('dailyClosing.warningCount', { count: warnings })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewing(closing)}
                          data-testid={`daily-closing-view-${closing.id}`}
                        >
                          <Eye aria-hidden className="size-4" />
                          {t('dailyClosing.action.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {createOpen ? (
        <DailyClosingCreateDialog
          open={createOpen}
          defaultBranchId={branchId}
          onOpenChange={setCreateOpen}
          onCreated={(closing) => {
            setCreateOpen(false);
            setSelectedBranchId(closing.branchId);
            setBusinessDate(closing.businessDate);
            setViewing(closing);
          }}
        />
      ) : null}

      <DailyClosingDetailDialog
        key={viewing?.id ?? 'empty'}
        closing={viewing}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(undefined);
          }
        }}
        onUpdated={setViewing}
      />
    </div>
  );
}
