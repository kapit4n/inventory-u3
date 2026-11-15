import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { ProductResponse } from '@inventory-u3/validation';
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
import { describeInventoryFailure } from '../inventory-failure.js';
import { useReconcileStock } from '../mutations/use-reconcile-stock.js';
import { formatStockQuantity, parseStockQuantityMilli } from '../stock-quantity.js';

const reconciliationFormSchema = z.object({
  countedQuantity: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
  note: z.string().max(500),
});

type ReconciliationFormValues = z.infer<typeof reconciliationFormSchema>;

export interface ReconcileStockDialogProps {
  readonly product?: ProductResponse;
  readonly branchId: string;
  readonly expectedQuantityMilli: number;
  readonly unitCode: string;
  readonly onOpenChange: (open: boolean) => void;
}

export function ReconcileStockDialog({
  product,
  branchId,
  expectedQuantityMilli,
  unitCode,
  onOpenChange,
}: ReconcileStockDialogProps) {
  const { t, locale } = useTranslation();
  const reconciliation = useReconcileStock();
  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationFormSchema),
    defaultValues: { countedQuantity: '', reason: '', note: '' },
  });
  const countedValue = useWatch({ control: form.control, name: 'countedQuantity' });
  const parsedCount = parseStockQuantityMilli(countedValue ?? '', { allowZero: true });
  const differenceMilli =
    parsedCount === undefined ? undefined : parsedCount - expectedQuantityMilli;
  const resetMutation = reconciliation.reset;
  const formReset = form.reset;

  useEffect(() => {
    if (!product) {
      return;
    }
    formReset({ countedQuantity: '', reason: '', note: '' });
    resetMutation();
  }, [product, formReset, resetMutation]);

  const onSubmit = form.handleSubmit((values) => {
    if (!product) {
      return;
    }

    const countedQuantityMilli = parseStockQuantityMilli(values.countedQuantity, {
      allowZero: true,
    });
    if (countedQuantityMilli === undefined) {
      form.setError('countedQuantity', {
        message: t('inventory.reconciliation.countedInvalid'),
      });
      return;
    }

    reconciliation.mutate(
      {
        branchId,
        productId: product.id,
        countedQuantityMilli,
        reason: values.reason,
        ...(values.note.trim().length === 0 ? {} : { note: values.note.trim() }),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={product !== undefined} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inventory.reconciliation.title')}</DialogTitle>
          <DialogDescription>
            {t('inventory.reconciliation.description', { product: product?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('inventory.reconciliation.expected')}</p>
              <p className="font-medium tabular-nums">
                {formatStockQuantity(expectedQuantityMilli, locale)} {unitCode}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('inventory.reconciliation.difference')}</p>
              <p className="font-medium tabular-nums">
                {differenceMilli === undefined
                  ? t('inventory.reconciliation.pendingDifference')
                  : `${differenceMilli > 0 ? '+' : ''}${formatStockQuantity(differenceMilli, locale)} ${unitCode}`}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="stock-reconciliation-counted">
              {t('inventory.reconciliation.counted')}
            </Label>
            <Input
              id="stock-reconciliation-counted"
              data-testid="stock-reconciliation-counted"
              {...form.register('countedQuantity')}
              disabled={reconciliation.isPending}
              inputMode="decimal"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t('inventory.reconciliation.countedHint', { unit: unitCode })}
            </p>
            {form.formState.errors.countedQuantity ? (
              <p role="alert" className="text-xs text-destructive">
                {t('inventory.reconciliation.countedInvalid')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="stock-reconciliation-reason">
              {t('inventory.reconciliation.reason')}
            </Label>
            <Input
              id="stock-reconciliation-reason"
              data-testid="stock-reconciliation-reason"
              {...form.register('reason')}
              disabled={reconciliation.isPending}
              maxLength={500}
              autoComplete="off"
            />
            {form.formState.errors.reason ? (
              <p role="alert" className="text-xs text-destructive">
                {t('inventory.reasonRequired')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="stock-reconciliation-note">{t('inventory.note')}</Label>
            <Input
              id="stock-reconciliation-note"
              data-testid="stock-reconciliation-note"
              {...form.register('note')}
              disabled={reconciliation.isPending}
              maxLength={500}
              autoComplete="off"
            />
          </div>

          {reconciliation.error ? (
            <div
              role="alert"
              data-testid="stock-reconciliation-failure"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeInventoryFailure(reconciliation.error, t)}</span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reconciliation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={reconciliation.isPending}
              data-testid="stock-reconciliation-save"
            >
              {reconciliation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('inventory.reconciliation.confirm')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
