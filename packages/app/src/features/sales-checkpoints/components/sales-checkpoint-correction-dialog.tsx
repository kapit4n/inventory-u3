import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  correctSalesCheckpointSchema,
  type CorrectSalesCheckpointBody,
  type SalesCheckpointResponse,
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
import { useCorrectSalesCheckpoint } from '../mutations/use-correct-sales-checkpoint.js';

export interface SalesCheckpointCorrectionDialogProps {
  readonly checkpoint?: SalesCheckpointResponse;
  readonly onOpenChange: (open: boolean) => void;
}

export function SalesCheckpointCorrectionDialog({
  checkpoint,
  onOpenChange,
}: SalesCheckpointCorrectionDialogProps) {
  const { t, locale } = useTranslation();
  const correction = useCorrectSalesCheckpoint();
  const form = useForm<CorrectSalesCheckpointBody>({
    resolver: zodResolver(correctSalesCheckpointSchema),
    defaultValues: { reason: '' },
  });
  const reset = correction.reset;
  const formReset = form.reset;

  useEffect(() => {
    if (!checkpoint) {
      return;
    }
    formReset({ reason: '' });
    reset();
  }, [checkpoint, formReset, reset]);

  const onSubmit = form.handleSubmit((values) => {
    if (!checkpoint) {
      return;
    }
    correction.mutate(
      { checkpointId: checkpoint.id, reason: values.reason },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={checkpoint !== undefined} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('salesCheckpoint.correction.title')}</DialogTitle>
          <DialogDescription>
            {t('salesCheckpoint.correction.description')}
            {checkpoint ? ` ${formatIsoDate(checkpoint.businessDate, locale)}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="sales-checkpoint-correction-reason">
              {t('salesCheckpoint.correction.reason')}
            </Label>
            <Input
              id="sales-checkpoint-correction-reason"
              data-testid="sales-checkpoint-correction-reason"
              {...form.register('reason')}
              disabled={correction.isPending}
              maxLength={500}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t('salesCheckpoint.correction.reasonHint')}
            </p>
            {form.formState.errors.reason ? (
              <p role="alert" className="text-xs text-destructive">
                {t('salesCheckpoint.correction.reasonRequired')}
              </p>
            ) : null}
          </div>

          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            {t('salesCheckpoint.correction.warning')}
          </p>

          {correction.error ? (
            <div
              role="alert"
              data-testid="sales-checkpoint-correction-failure"
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
              data-testid="sales-checkpoint-correction-save"
            >
              {correction.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('salesCheckpoint.correction.saving')}
                </>
              ) : (
                t('salesCheckpoint.correction.confirm')
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
        ? t('salesCheckpoint.correction.failure.validation')
        : t('salesCheckpoint.correction.failure.stock');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('salesCheckpoint.correction.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('salesCheckpoint.correction.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('salesCheckpoint.correction.failure.network');
    }
  }
  return t('salesCheckpoint.correction.failure');
}
