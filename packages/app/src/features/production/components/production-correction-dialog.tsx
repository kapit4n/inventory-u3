import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  correctProductionBatchSchema,
  type CorrectProductionBatchBody,
  type ProductionBatchResponse,
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
} from '@inventory-u3/ui';

import { useTranslation, type TranslationKey } from '../../../i18n/index.js';
import { formatIsoDate } from '../../products/price-format.js';
import { useCorrectProductionBatch } from '../mutations/use-correct-production-batch.js';

export interface ProductionCorrectionDialogProps {
  readonly batch?: ProductionBatchResponse;
  readonly onOpenChange: (open: boolean) => void;
}

export function ProductionCorrectionDialog({
  batch,
  onOpenChange,
}: ProductionCorrectionDialogProps) {
  const { t, locale } = useTranslation();
  const correction = useCorrectProductionBatch();
  const form = useForm<CorrectProductionBatchBody>({
    resolver: zodResolver(correctProductionBatchSchema),
    defaultValues: { reason: '' },
  });
  const reset = correction.reset;
  const formReset = form.reset;

  useEffect(() => {
    if (!batch) {
      return;
    }
    formReset({ reason: '' });
    reset();
  }, [batch, formReset, reset]);

  const onSubmit = form.handleSubmit((values) => {
    if (!batch) {
      return;
    }
    correction.mutate(
      { batchId: batch.id, reason: values.reason },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={batch !== undefined} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('production.correction.title')}</DialogTitle>
          <DialogDescription>
            {t('production.correction.description')}
            {batch ? ` ${formatIsoDate(batch.businessDate, locale)}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="production-correction-reason">
              {t('production.correction.reason')}
            </Label>
            <Input
              id="production-correction-reason"
              data-testid="production-correction-reason"
              {...form.register('reason')}
              disabled={correction.isPending}
              maxLength={500}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('production.correction.reasonHint')}</p>
            {form.formState.errors.reason ? (
              <p role="alert" className="text-xs text-destructive">
                {t('production.correction.reasonRequired')}
              </p>
            ) : null}
          </div>

          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            {t('production.correction.warning')}
          </p>

          {correction.error ? (
            <div
              role="alert"
              data-testid="production-correction-failure"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeFailure(correction.error, t)}</span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={correction.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={correction.isPending}
              data-testid="production-correction-save"
            >
              {correction.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('production.correction.saving')}
                </>
              ) : (
                t('production.correction.confirm')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function describeFailure(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return error.details.resultingQuantityMilli === undefined
        ? t('production.correction.failure.validation')
        : t('production.correction.failure.stock');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('production.correction.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('production.correction.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('production.correction.failure.network');
    }
  }
  return t('production.correction.failure');
}
