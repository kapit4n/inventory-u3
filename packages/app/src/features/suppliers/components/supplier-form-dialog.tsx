import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import { updateSupplierSchema, type UpdateSupplierBody } from '@inventory-u3/validation';
import type { SupplierResponse } from '@inventory-u3/validation';
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
import { useCreateSupplier } from '../mutations/use-create-supplier.js';
import { useUpdateSupplier } from '../mutations/use-update-supplier.js';

export interface SupplierFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly supplier?: SupplierResponse;
}

function defaultValues(supplier?: SupplierResponse): UpdateSupplierBody {
  return {
    name: supplier?.name ?? '',
    isActive: supplier?.isActive ?? true,
  };
}

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const activeMutation = supplier ? update : create;
  const createReset = create.reset;
  const updateReset = update.reset;
  const form = useForm<UpdateSupplierBody>({
    resolver: zodResolver(updateSupplierSchema),
    defaultValues: defaultValues(supplier),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues(supplier));
    createReset();
    updateReset();
  }, [open, supplier, form, createReset, updateReset]);

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        onOpenChange(false);
      },
    };

    if (supplier) {
      update.mutate({ supplierId: supplier.id, body: values }, options);
    } else {
      create.mutate(values, options);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {supplier ? t('suppliers.form.editTitle') : t('suppliers.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {supplier ? t('suppliers.form.editDescription') : t('suppliers.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="supplier-name">{t('suppliers.form.name')}</Label>
            <Input
              id="supplier-name"
              data-testid="supplier-name"
              {...form.register('name')}
              disabled={activeMutation.isPending}
              maxLength={160}
              autoComplete="off"
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {t('suppliers.form.nameRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('suppliers.form.nameHint')}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="supplier-status">{t('suppliers.form.status')}</Label>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="supplier-status" data-testid="supplier-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('suppliers.status.active')}</SelectItem>
                    <SelectItem value="false">{t('suppliers.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {activeMutation.error ? (
            <div
              role="alert"
              data-testid="supplier-form-failure"
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
            <Button type="submit" disabled={activeMutation.isPending} data-testid="supplier-save">
              {activeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('suppliers.form.saving')}
                </>
              ) : supplier ? (
                t('suppliers.form.save')
              ) : (
                t('suppliers.form.create')
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
      | 'suppliers.form.failure'
      | 'suppliers.form.failure.validation'
      | 'suppliers.form.failure.forbidden'
      | 'suppliers.form.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('suppliers.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('suppliers.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('suppliers.form.failure.network');
    }
  }
  return t('suppliers.form.failure');
}
