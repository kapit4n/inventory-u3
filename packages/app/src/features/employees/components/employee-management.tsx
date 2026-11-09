import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { EmployeeResponse } from '@inventory-u3/validation';
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
import { useBranches } from '../../branches/queries/branches-query.js';
import { useEmployees } from '../queries/employees-query.js';
import { EmployeeFormDialog } from './employee-form-dialog.js';

export function EmployeeManagement() {
  const { t } = useTranslation();
  const { user } = useSession();
  const employeesQuery = useEmployees();
  const branchesQuery = useBranches();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeResponse | undefined>();
  const canManage = user ? hasPermission(user.role, 'organization:manage') : false;
  const branchesById = new Map(
    (branchesQuery.data ?? []).map((branch) => [branch.id, branch.name]),
  );

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(employee: EmployeeResponse) {
    setEditing(employee);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('employees.list.title')}</CardTitle>
            <CardDescription>{t('employees.list.description')}</CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreate} data-testid="employee-new">
              <Plus aria-hidden className="size-4" />
              {t('employees.new')}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {employeesQuery.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t('employees.loading')}
          </p>
        ) : null}

        {employeesQuery.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>{t('employees.loadFailure')}</p>
              <Button type="button" variant="outline" onClick={() => void employeesQuery.refetch()}>
                {t('employees.retry')}
              </Button>
            </div>
          </div>
        ) : null}

        {employeesQuery.isSuccess && employeesQuery.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">{t('employees.list.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('employees.list.emptyDescription')}
            </p>
          </div>
        ) : null}

        {employeesQuery.isSuccess && employeesQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employees.column.name')}</TableHead>
                <TableHead>{t('employees.column.branch')}</TableHead>
                <TableHead>{t('employees.column.status')}</TableHead>
                {canManage ? (
                  <TableHead className="text-right">{t('employees.column.actions')}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesQuery.data.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.fullName}</TableCell>
                  <TableCell>
                    {branchesById.get(employee.branchId) ?? t('employees.unknownBranch')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        employee.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {employee.isActive
                        ? t('employees.status.active')
                        : t('employees.status.inactive')}
                    </span>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(employee)}
                        aria-label={`${t('employees.edit')} ${employee.fullName}`}
                      >
                        <Pencil aria-hidden className="size-4" />
                        {t('employees.edit')}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {!canManage ? (
          <p className="mt-4 text-xs text-muted-foreground">{t('employees.readOnly')}</p>
        ) : null}
      </CardContent>

      <EmployeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} employee={editing} />
    </Card>
  );
}
