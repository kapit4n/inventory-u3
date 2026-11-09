import { useState } from 'react';
import { hasPermission } from '@inventory-u3/domain';
import type { BranchResponse } from '@inventory-u3/validation';
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
import { useBranches } from '../queries/branches-query.js';
import { BranchFormDialog } from './branch-form-dialog.js';

export function BranchManagement() {
  const { t } = useTranslation();
  const { user } = useSession();
  const branchesQuery = useBranches();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BranchResponse | undefined>();
  const canManage = user ? hasPermission(user.role, 'organization:manage') : false;

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(branch: BranchResponse) {
    setEditing(branch);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('branches.list.title')}</CardTitle>
            <CardDescription>{t('branches.list.description')}</CardDescription>
          </div>
          {canManage ? (
            <Button type="button" size="sm" onClick={openCreate} data-testid="branch-new">
              <Plus aria-hidden className="size-4" />
              {t('branches.new')}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {branchesQuery.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            {t('branches.loading')}
          </p>
        ) : null}

        {branchesQuery.isError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>{t('branches.loadFailure')}</p>
              <Button type="button" variant="outline" onClick={() => void branchesQuery.refetch()}>
                {t('branches.retry')}
              </Button>
            </div>
          </div>
        ) : null}

        {branchesQuery.isSuccess && branchesQuery.data.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="font-medium">{t('branches.list.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('branches.list.emptyDescription')}
            </p>
          </div>
        ) : null}

        {branchesQuery.isSuccess && branchesQuery.data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('branches.column.name')}</TableHead>
                <TableHead>{t('branches.column.status')}</TableHead>
                {canManage ? (
                  <TableHead className="text-right">{t('branches.column.actions')}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchesQuery.data.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        branch.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {branch.isActive
                        ? t('branches.status.active')
                        : t('branches.status.inactive')}
                    </span>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(branch)}
                        aria-label={`${t('branches.edit')} ${branch.name}`}
                      >
                        <Pencil aria-hidden className="size-4" />
                        {t('branches.edit')}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}

        {!canManage ? (
          <p className="mt-4 text-xs text-muted-foreground">{t('branches.readOnly')}</p>
        ) : null}
      </CardContent>

      <BranchFormDialog open={dialogOpen} onOpenChange={setDialogOpen} branch={editing} />
    </Card>
  );
}
