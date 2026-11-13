import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { MeasurementUnitResponse } from '@inventory-u3/validation';
import { AlertCircle, Loader2, Pencil, Plus } from 'lucide-react';
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
  cn,
} from '@inventory-u3/ui';

import { useTranslation } from '../../../i18n/index.js';
import { useSession } from '../../auth/session-provider.js';
import { useMeasurementUnits } from '../queries/measurement-units-query.js';
import { MeasurementUnitFormDialog } from './measurement-unit-form-dialog.js';

export function MeasurementUnitManagement() {
  const { t } = useTranslation();
  const { user } = useSession();
  const unitsQuery = useMeasurementUnits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MeasurementUnitResponse | undefined>();
  const canManage = user ? hasPermission(user.role, 'organization:manage') : false;

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(unit: MeasurementUnitResponse) {
    setEditing(unit);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('measurementUnits.list.title')}</CardTitle>
            <CardDescription>{t('measurementUnits.list.description')}</CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreate} data-testid="measurement-unit-new">
              <Plus aria-hidden className="size-4" />
              {t('measurementUnits.new')}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {unitsQuery.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t('measurementUnits.loading')}
          </p>
        ) : null}

        {unitsQuery.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>{t('measurementUnits.loadFailure')}</p>
              <Button type="button" variant="outline" onClick={() => void unitsQuery.refetch()}>
                {t('measurementUnits.retry')}
              </Button>
            </div>
          </div>
        ) : null}

        {unitsQuery.isSuccess && unitsQuery.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">{t('measurementUnits.list.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('measurementUnits.list.emptyDescription')}
            </p>
          </div>
        ) : null}

        {unitsQuery.isSuccess && unitsQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('measurementUnits.column.code')}</TableHead>
                <TableHead>{t('measurementUnits.column.name')}</TableHead>
                <TableHead>{t('measurementUnits.column.status')}</TableHead>
                {canManage ? (
                  <TableHead className="text-right">
                    {t('measurementUnits.column.actions')}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {unitsQuery.data.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-mono text-sm">{unit.code}</TableCell>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        unit.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {unit.isActive
                        ? t('measurementUnits.status.active')
                        : t('measurementUnits.status.inactive')}
                    </span>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(unit)}
                        aria-label={`${t('measurementUnits.edit')} ${unit.name}`}
                      >
                        <Pencil aria-hidden className="size-4" />
                        {t('measurementUnits.edit')}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {!canManage ? (
          <p className="mt-4 text-xs text-muted-foreground">{t('measurementUnits.readOnly')}</p>
        ) : null}
      </CardContent>

      <MeasurementUnitFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        measurementUnit={editing}
      />
    </Card>
  );
}
