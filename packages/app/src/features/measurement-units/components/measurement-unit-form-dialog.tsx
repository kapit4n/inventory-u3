import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  updateMeasurementUnitSchema,
  type MeasurementUnitResponse,
  type UpdateMeasurementUnitBody,
} from '@inventory-u3/validation';
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
import { useCreateMeasurementUnit } from '../mutations/use-create-measurement-unit.js';
import { useUpdateMeasurementUnit } from '../mutations/use-update-measurement-unit.js';

export interface MeasurementUnitFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly measurementUnit?: MeasurementUnitResponse;
}

function defaultValues(measurementUnit?: MeasurementUnitResponse): UpdateMeasurementUnitBody {
  return {
    code: measurementUnit?.code ?? '',
    name: measurementUnit?.name ?? '',
    isActive: measurementUnit?.isActive ?? true,
  };
}

export function MeasurementUnitFormDialog({
  open,
  onOpenChange,
  measurementUnit,
}: MeasurementUnitFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateMeasurementUnit();
  const update = useUpdateMeasurementUnit();
  const activeMutation = measurementUnit ? update : create;
  const createReset = create.reset;
  const updateReset = update.reset;
  const form = useForm<UpdateMeasurementUnitBody>({
    resolver: zodResolver(updateMeasurementUnitSchema),
    defaultValues: defaultValues(measurementUnit),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues(measurementUnit));
    createReset();
    updateReset();
  }, [open, measurementUnit, form, createReset, updateReset]);

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        onOpenChange(false);
      },
    };

    if (measurementUnit) {
      update.mutate({ measurementUnitId: measurementUnit.id, body: values }, options);
    } else {
      create.mutate(values, options);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {measurementUnit
              ? t('measurementUnits.form.editTitle')
              : t('measurementUnits.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {measurementUnit
              ? t('measurementUnits.form.editDescription')
              : t('measurementUnits.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="measurement-unit-code">{t('measurementUnits.form.code')}</Label>
            <Input
              id="measurement-unit-code"
              data-testid="measurement-unit-code"
              {...form.register('code')}
              disabled={activeMutation.isPending}
              maxLength={32}
              autoComplete="off"
            />
            {form.formState.errors.code ? (
              <p role="alert" className="text-xs text-destructive">
                {t('measurementUnits.form.codeRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('measurementUnits.form.codeHint')}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="measurement-unit-name">{t('measurementUnits.form.name')}</Label>
            <Input
              id="measurement-unit-name"
              data-testid="measurement-unit-name"
              {...form.register('name')}
              disabled={activeMutation.isPending}
              maxLength={80}
              autoComplete="off"
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {t('measurementUnits.form.nameRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('measurementUnits.form.nameHint')}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="measurement-unit-status">{t('measurementUnits.form.status')}</Label>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="measurement-unit-status" data-testid="measurement-unit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('measurementUnits.status.active')}</SelectItem>
                    <SelectItem value="false">{t('measurementUnits.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {activeMutation.error ? (
            <div
              role="alert"
              data-testid="measurement-unit-form-failure"
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
            <Button
              type="submit"
              disabled={activeMutation.isPending}
              data-testid="measurement-unit-save"
            >
              {activeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('measurementUnits.form.saving')}
                </>
              ) : measurementUnit ? (
                t('measurementUnits.form.save')
              ) : (
                t('measurementUnits.form.create')
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
      | 'measurementUnits.form.failure'
      | 'measurementUnits.form.failure.validation'
      | 'measurementUnits.form.failure.forbidden'
      | 'measurementUnits.form.failure.network'
      | 'measurementUnits.form.failure.duplicate',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('measurementUnits.form.failure.duplicate');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('measurementUnits.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('measurementUnits.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('measurementUnits.form.failure.network');
    }
  }
  return t('measurementUnits.form.failure');
}
