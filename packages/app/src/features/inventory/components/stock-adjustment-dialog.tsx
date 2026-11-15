import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useAdjustStock } from '../mutations/use-adjust-stock.js';
import { formatStockQuantity, parseStockQuantityMilli } from '../stock-quantity.js';

const adjustmentFormSchema = z.object({
  quantity: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
  note: z.string().max(500),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

export interface StockAdjustmentDialogProps {
  readonly product?: ProductResponse;
  readonly branchId: string;
  readonly currentQuantityMilli: number;
  readonly unitCode: string;
  readonly onOpenChange: (open: boolean) => void;
}

export function StockAdjustmentDialog({
  product,
  branchId,
  currentQuantityMilli,
  unitCode,
  onOpenChange,
}: StockAdjustmentDialogProps) {
  const { t, locale } = useTranslation();
  const adjustment = useAdjustStock();
  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: { quantity: '', reason: '', note: '' },
  });
  const resetMutation = adjustment.reset;
  const formReset = form.reset;

  useEffect(() => {
    if (!product) {
      return;
    }
    formReset({ quantity: '', reason: '', note: '' });
    resetMutation();
  }, [product, formReset, resetMutation]);

  const onSubmit = form.handleSubmit((values) => {
    if (!product) {
      return;
    }

    const quantityDeltaMilli = parseStockQuantityMilli(values.quantity, { allowNegative: true });
    if (quantityDeltaMilli === undefined) {
      form.setError('quantity', { message: t('inventory.adjustment.quantityInvalid') });
      return;
    }

    adjustment.mutate(
      {
        branchId,
        productId: product.id,
        quantityDeltaMilli,
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
          <DialogTitle>{t('inventory.adjustment.title')}</DialogTitle>
          <DialogDescription>
            {t('inventory.adjustment.description', {
              product: product?.name ?? '',
              quantity: formatStockQuantity(currentQuantityMilli, locale),
              unit: unitCode,
            })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="stock-adjustment-quantity">{t('inventory.adjustment.quantity')}</Label>
            <Input
              id="stock-adjustment-quantity"
              data-testid="stock-adjustment-quantity"
              {...form.register('quantity')}
              disabled={adjustment.isPending}
              inputMode="decimal"
              autoComplete="off"
              placeholder="-2.5"
            />
            <p className="text-xs text-muted-foreground">
              {t('inventory.adjustment.quantityHint', { unit: unitCode })}
            </p>
            {form.formState.errors.quantity ? (
              <p role="alert" className="text-xs text-destructive">
                {t('inventory.adjustment.quantityInvalid')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="stock-adjustment-reason">{t('inventory.adjustment.reason')}</Label>
            <Input
              id="stock-adjustment-reason"
              data-testid="stock-adjustment-reason"
              {...form.register('reason')}
              disabled={adjustment.isPending}
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
            <Label htmlFor="stock-adjustment-note">{t('inventory.note')}</Label>
            <Input
              id="stock-adjustment-note"
              data-testid="stock-adjustment-note"
              {...form.register('note')}
              disabled={adjustment.isPending}
              maxLength={500}
              autoComplete="off"
            />
          </div>

          {adjustment.error ? (
            <div
              role="alert"
              data-testid="stock-adjustment-failure"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeInventoryFailure(adjustment.error, t)}</span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjustment.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={adjustment.isPending}
              data-testid="stock-adjustment-save"
            >
              {adjustment.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('inventory.adjustment.confirm')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
