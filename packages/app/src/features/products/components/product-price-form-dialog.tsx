import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiClientError } from '@inventory-u3/api-client';
import { isoDateSchema } from '@inventory-u3/validation';
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
import { useCreateProductPrice } from '../mutations/use-create-product-price.js';
import { parseCurrencyAmount, todayIsoDate } from '../price-format.js';

const priceFormSchema = z.object({
  amount: z.string().trim().min(1),
  effectiveFrom: isoDateSchema,
});

type PriceFormValues = z.infer<typeof priceFormSchema>;

export interface ProductPriceFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly product: ProductResponse;
  readonly currency: string;
}

function defaultValues(): PriceFormValues {
  return {
    amount: '',
    effectiveFrom: todayIsoDate(),
  };
}

export function ProductPriceFormDialog({
  open,
  onOpenChange,
  product,
  currency,
}: ProductPriceFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateProductPrice(product.id);
  const createReset = create.reset;
  const form = useForm<PriceFormValues>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues());
    createReset();
  }, [open, form, createReset]);

  const onSubmit = form.handleSubmit((values) => {
    const amountMinor = parseCurrencyAmount(values.amount, currency);
    if (amountMinor === undefined) {
      form.setError('amount', { type: 'validate', message: 'invalid' });
      return;
    }

    create.mutate(
      { amountMinor, effectiveFrom: values.effectiveFrom },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('products.prices.form.title')}</DialogTitle>
          <DialogDescription>{t('products.prices.form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="product-price-amount">
              {t('products.prices.form.amount', { currency })}
            </Label>
            <Input
              id="product-price-amount"
              data-testid="product-price-amount"
              inputMode="decimal"
              autoComplete="off"
              {...form.register('amount')}
              disabled={create.isPending}
            />
            {form.formState.errors.amount ? (
              <p role="alert" className="text-xs text-destructive">
                {t('products.prices.form.amountRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {product.kind === 'PROCESSED'
                  ? t('products.prices.form.amountHintProcessed')
                  : t('products.prices.form.amountHintRaw')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-price-effective-from">
              {t('products.prices.form.effectiveFrom')}
            </Label>
            <Input
              id="product-price-effective-from"
              data-testid="product-price-effective-from"
              type="date"
              {...form.register('effectiveFrom')}
              disabled={create.isPending}
            />
            {form.formState.errors.effectiveFrom ? (
              <p role="alert" className="text-xs text-destructive">
                {t('products.prices.form.effectiveFromRequired')}
              </p>
            ) : null}
          </div>

          {create.error ? (
            <div
              role="alert"
              data-testid="product-price-form-failure"
              className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{describeFailure(create.error, t)}</span>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending} data-testid="product-price-save">
              {create.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('products.prices.form.saving')}
                </>
              ) : (
                t('products.prices.form.save')
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
      | 'products.prices.form.failure'
      | 'products.prices.form.failure.validation'
      | 'products.prices.form.failure.forbidden'
      | 'products.prices.form.failure.network'
      | 'products.prices.form.failure.duplicate',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('products.prices.form.failure.duplicate');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('products.prices.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('products.prices.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('products.prices.form.failure.network');
    }
  }
  return t('products.prices.form.failure');
}
