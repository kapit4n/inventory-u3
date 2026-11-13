import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { SupplierResponse } from '@inventory-u3/validation';
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
import { useSuppliers } from '../queries/suppliers-query.js';
import { SupplierFormDialog } from './supplier-form-dialog.js';

export function SupplierManagement() {
  const { t } = useTranslation();
  const { user } = useSession();
  const suppliersQuery = useSuppliers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierResponse | undefined>();
  const canManage = user ? hasPermission(user.role, 'organization:manage') : false;

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(supplier: SupplierResponse) {
    setEditing(supplier);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('suppliers.list.title')}</CardTitle>
            <CardDescription>{t('suppliers.list.description')}</CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreate} data-testid="supplier-new">
              <Plus aria-hidden className="size-4" />
              {t('suppliers.new')}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {suppliersQuery.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t('suppliers.loading')}
          </p>
        ) : null}

        {suppliersQuery.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>{t('suppliers.loadFailure')}</p>
              <Button type="button" variant="outline" onClick={() => void suppliersQuery.refetch()}>
                {t('suppliers.retry')}
              </Button>
            </div>
          </div>
        ) : null}

        {suppliersQuery.isSuccess && suppliersQuery.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">{t('suppliers.list.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('suppliers.list.emptyDescription')}
            </p>
          </div>
        ) : null}

        {suppliersQuery.isSuccess && suppliersQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('suppliers.column.name')}</TableHead>
                <TableHead>{t('suppliers.column.status')}</TableHead>
                {canManage ? (
                  <TableHead className="text-right">{t('suppliers.column.actions')}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersQuery.data.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        supplier.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {supplier.isActive
                        ? t('suppliers.status.active')
                        : t('suppliers.status.inactive')}
                    </span>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(supplier)}
                        aria-label={`${t('suppliers.edit')} ${supplier.name}`}
                      >
                        <Pencil aria-hidden className="size-4" />
                        {t('suppliers.edit')}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {!canManage ? (
          <p className="mt-4 text-xs text-muted-foreground">{t('suppliers.readOnly')}</p>
        ) : null}
      </CardContent>

      <SupplierFormDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />
    </Card>
  );
}
