import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  correctPurchaseSchema,
  type CorrectPurchaseBody,
  type PurchaseResponse,
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

import { useTranslation } from '../../../i18n/index.js';
import { formatCurrencyAmount } from '../../products/price-format.js';
import { useCorrectPurchase } from '../mutations/use-correct-purchase.js';

export interface PurchaseCorrectionDialogProps {
  readonly purchase?: PurchaseResponse;
  readonly onOpenChange: (open: boolean) => void;
}

export function PurchaseCorrectionDialog({
  purchase,
  onOpenChange,
}: PurchaseCorrectionDialogProps) {
  const { t, locale } = useTranslation();
  const correction = useCorrectPurchase();
  const form = useForm<CorrectPurchaseBody>({
    resolver: zodResolver(correctPurchaseSchema),
    defaultValues: { reason: '' },
  });
  const reset = correction.reset;
  const formReset = form.reset;

  useEffect(() => {
    if (!purchase) {
      return;
    }
    formReset({ reason: '' });
    reset();
  }, [purchase, formReset, reset]);

  const onSubmit = form.handleSubmit((values) => {
    if (!purchase) {
      return;
    }
    correction.mutate(
      { purchaseId: purchase.id, reason: values.reason },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={purchase !== undefined} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('purchases.correction.title')}</DialogTitle>
          <DialogDescription>
            {t('purchases.correction.description', {
              total: purchase
                ? formatCurrencyAmount(purchase.totalMinor, purchase.currency, locale)
                : '',
            })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="purchase-correction-reason">{t('purchases.correction.reason')}</Label>
            <Input
              id="purchase-correction-reason"
              data-testid="purchase-correction-reason"
              {...form.register('reason')}
              disabled={correction.isPending}
              maxLength={500}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('purchases.correction.reasonHint')}</p>
            {form.formState.errors.reason ? (
              <p role="alert" className="text-xs text-destructive">
                {t('purchases.correction.reasonRequired')}
              </p>
            ) : null}
          </div>

          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            {t('purchases.correction.warning')}
          </p>

          {correction.error ? (
            <div
              role="alert"
              data-testid="purchase-correction-failure"
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
              data-testid="purchase-correction-save"
            >
              {correction.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('purchases.correction.saving')}
                </>
              ) : (
                t('purchases.correction.confirm')
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
      | 'purchases.correction.failure'
      | 'purchases.correction.failure.validation'
      | 'purchases.correction.failure.forbidden'
      | 'purchases.correction.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('purchases.correction.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('purchases.correction.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('purchases.correction.failure.network');
    }
  }
  return t('purchases.correction.failure');
}
