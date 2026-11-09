import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import { updateEmployeeSchema, type EmployeeResponse } from '@inventory-u3/validation';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@inventory-u3/ui';

import { useTranslation } from '../../../i18n/index.js';
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useCreateEmployee } from '../mutations/use-create-employee.js';
import { useUpdateEmployee } from '../mutations/use-update-employee.js';

type EmployeeFormValues = {
  fullName: string;
  branchId: string;
  isActive: boolean;
};

export interface EmployeeFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly employee?: EmployeeResponse;
}

function defaultValues(employee?: EmployeeResponse): EmployeeFormValues {
  return {
    fullName: employee?.fullName ?? '',
    branchId: employee?.branchId ?? '',
    isActive: employee?.isActive ?? true,
  };
}

export function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const activeMutation = employee ? update : create;
  const createReset = create.reset;
  const updateReset = update.reset;
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: defaultValues(employee),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues(employee));
    createReset();
    updateReset();
  }, [open, employee, form, createReset, updateReset]);

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        onOpenChange(false);
      },
    };

    if (employee) {
      update.mutate({ employeeId: employee.id, body: values }, options);
    } else {
      create.mutate(values, options);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {employee ? t('employees.form.editTitle') : t('employees.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {employee ? t('employees.form.editDescription') : t('employees.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="employee-full-name">{t('employees.form.fullName')}</Label>
            <Input
              id="employee-full-name"
              data-testid="employee-full-name"
              {...form.register('fullName')}
              disabled={activeMutation.isPending}
              maxLength={160}
              autoComplete="off"
            />
            {form.formState.errors.fullName ? (
              <p role="alert" className="text-xs text-destructive">
                {t('employees.form.nameRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('employees.form.fullNameHint')}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="employee-branch">{t('employees.form.branch')}</Label>
            <Controller
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <BranchSelector
                  id="employee-branch"
                  value={field.value}
                  onValueChange={field.onChange}
                  includeInactive={Boolean(employee)}
                  disabled={activeMutation.isPending}
                />
              )}
            />
            {form.formState.errors.branchId ? (
              <p role="alert" className="text-xs text-destructive">
                {t('employees.form.branchRequired')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="employee-status">{t('employees.form.status')}</Label>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="employee-status" data-testid="employee-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('employees.status.active')}</SelectItem>
                    <SelectItem value="false">{t('employees.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {activeMutation.error ? (
            <div
              role="alert"
              data-testid="employee-form-failure"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeFailure(activeMutation.error, t)}</span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={activeMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={activeMutation.isPending} data-testid="employee-save">
              {activeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('employees.form.saving')}
                </>
              ) : employee ? (
                t('employees.form.save')
              ) : (
                t('employees.form.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function describeFailure(
  error: unknown,
  t: (
    key:
      | 'employees.form.failure'
      | 'employees.form.failure.validation'
      | 'employees.form.failure.forbidden'
      | 'employees.form.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('employees.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('employees.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('employees.form.failure.network');
    }
  }
  return t('employees.form.failure');
}
