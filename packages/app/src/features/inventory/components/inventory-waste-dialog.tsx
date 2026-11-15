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
import { useRecordInventoryWaste } from '../mutations/use-record-inventory-waste.js';
import { formatStockQuantity, parseStockQuantityMilli } from '../stock-quantity.js';

const wasteFormSchema = z.object({
  quantity: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
  note: z.string().max(500),
});

type WasteFormValues = z.infer<typeof wasteFormSchema>;

export interface InventoryWasteDialogProps {
  readonly product?: ProductResponse;
  readonly branchId: string;
  readonly currentQuantityMilli: number;
  readonly unitCode: string;
  readonly onOpenChange: (open: boolean) => void;
}

export function InventoryWasteDialog({
  product,
  branchId,
  currentQuantityMilli,
  unitCode,
  onOpenChange,
}: InventoryWasteDialogProps) {
  const { t, locale } = useTranslation();
  const waste = useRecordInventoryWaste();
  const form = useForm<WasteFormValues>({
    resolver: zodResolver(wasteFormSchema),
    defaultValues: { quantity: '', reason: '', note: '' },
  });
  const resetMutation = waste.reset;
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

    const quantityMilli = parseStockQuantityMilli(values.quantity);
    if (quantityMilli === undefined) {
      form.setError('quantity', { message: t('inventory.waste.quantityInvalid') });
      return;
    }

    waste.mutate(
      {
        branchId,
        productId: product.id,
        quantityMilli,
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
          <DialogTitle>{t('inventory.waste.title')}</DialogTitle>
          <DialogDescription>
            {t('inventory.waste.description', {
              product: product?.name ?? '',
              quantity: formatStockQuantity(currentQuantityMilli, locale),
              unit: unitCode,
            })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="inventory-waste-quantity">{t('inventory.waste.quantity')}</Label>
            <Input
              id="inventory-waste-quantity"
              data-testid="inventory-waste-quantity"
              {...form.register('quantity')}
              disabled={waste.isPending}
              inputMode="decimal"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t('inventory.waste.quantityHint', { unit: unitCode })}
            </p>
            {form.formState.errors.quantity ? (
              <p role="alert" className="text-xs text-destructive">
                {t('inventory.waste.quantityInvalid')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="inventory-waste-reason">{t('inventory.waste.reason')}</Label>
            <Input
              id="inventory-waste-reason"
              data-testid="inventory-waste-reason"
              {...form.register('reason')}
              disabled={waste.isPending}
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
            <Label htmlFor="inventory-waste-note">{t('inventory.note')}</Label>
            <Input
              id="inventory-waste-note"
              data-testid="inventory-waste-note"
              {...form.register('note')}
              disabled={waste.isPending}
              maxLength={500}
              autoComplete="off"
            />
          </div>

          {waste.error ? (
            <div
              role="alert"
              data-testid="inventory-waste-failure"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeInventoryFailure(waste.error, t)}</span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={waste.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={waste.isPending}
              data-testid="inventory-waste-save"
            >
              {waste.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('inventory.waste.confirm')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
