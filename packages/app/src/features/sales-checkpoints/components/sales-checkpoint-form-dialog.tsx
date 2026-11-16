import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiClientError } from '@inventory-u3/api-client';
import type { CreateSalesCheckpointBody, ProductResponse } from '@inventory-u3/validation';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
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

import { useTranslation, type Locale, type TranslationKey } from '../../../i18n/index.js';
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { useProductPresentations } from '../../products/queries/product-presentations-query.js';
import { useProducts } from '../../products/queries/products-query.js';
import { todayIsoDate } from '../../products/price-format.js';
import { useCreateSalesCheckpoint } from '../mutations/use-create-sales-checkpoint.js';
import {
  formatTrays,
  formatWeightGrams,
  parseQuantityMilli,
  parseWholeNumber,
} from '../sales-checkpoint-format.js';

const itemSchema = z.object({
  productId: z.string(),
  quantity: z.string(),
  presentationId: z.string(),
  trayCount: z.string(),
  measuredWeightGrams: z.string(),
});

const salesCheckpointFormSchema = z.object({
  branchId: z.string().min(1),
  businessDate: z.string().min(1),
  period: z.enum(['MORNING', 'EVENING']),
  note: z.string().max(500),
  items: z.array(itemSchema),
});

type SalesCheckpointFormValues = z.infer<typeof salesCheckpointFormSchema>;

export interface SalesCheckpointFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function emptyValues(): SalesCheckpointFormValues {
  return {
    branchId: '',
    businessDate: todayIsoDate(),
    period: 'MORNING',
    note: '',
    items: [
      { productId: '', quantity: '', presentationId: '', trayCount: '', measuredWeightGrams: '' },
    ],
  };
}

export function SalesCheckpointFormDialog({ open, onOpenChange }: SalesCheckpointFormDialogProps) {
  const { t, locale } = useTranslation();
  const create = useCreateSalesCheckpoint();
  const branchesQuery = useBranches();
  const productsQuery = useProducts();
  const form = useForm<SalesCheckpointFormValues>({
    resolver: zodResolver(salesCheckpointFormSchema),
    defaultValues: emptyValues(),
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive);
  const products = (productsQuery.data ?? []).filter((product) => product.isActive);
  const productById = new Map(products.map((product) => [product.id, product]));
  const loading = branchesQuery.isPending || productsQuery.isPending;
  const masterDataReady = branches.length > 0 && products.length > 0;
  const resetCreate = create.reset;

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(emptyValues());
    resetCreate();
  }, [open, form, resetCreate]);

  const onSubmit = form.handleSubmit((values) => {
    const lines: CreateSalesCheckpointBody['items'] = [];
    let valid = true;

    values.items.forEach((line, index) => {
      const product = productById.get(line.productId);
      if (!product) {
        form.setError(`items.${index}.productId`, {
          message: t('salesCheckpoint.form.productRequired'),
        });
        valid = false;
        return;
      }

      if (product.kind === 'RAW') {
        const quantityMilli = parseQuantityMilli(line.quantity);
        if (quantityMilli === undefined) {
          form.setError(`items.${index}.quantity`, {
            message: t('salesCheckpoint.form.quantityInvalid'),
          });
          valid = false;
          return;
        }

        lines.push({ productId: product.id, quantityMilli });
        return;
      }

      if (line.presentationId.length === 0) {
        form.setError(`items.${index}.presentationId`, {
          message: t('salesCheckpoint.form.presentationRequired'),
        });
        valid = false;
        return;
      }

      const trayCount = parseWholeNumber(line.trayCount);
      if (trayCount === undefined) {
        form.setError(`items.${index}.trayCount`, {
          message: t('salesCheckpoint.form.trayCountInvalid'),
        });
        valid = false;
        return;
      }

      const measuredWeightGrams =
        line.measuredWeightGrams.trim().length === 0
          ? undefined
          : parseWholeNumber(line.measuredWeightGrams);
      if (line.measuredWeightGrams.trim().length > 0 && measuredWeightGrams === undefined) {
        form.setError(`items.${index}.measuredWeightGrams`, {
          message: t('salesCheckpoint.form.measuredWeightInvalid'),
        });
        valid = false;
        return;
      }

      lines.push({
        productId: product.id,
        presentationId: line.presentationId,
        trayCount,
        ...(measuredWeightGrams === undefined ? {} : { measuredWeightGrams }),
      });
    });

    if (!valid) {
      return;
    }

    if (lines.length === 0) {
      form.setError('root', { message: t('salesCheckpoint.form.linesRequired') });
      return;
    }

    const note = values.note.trim();
    create.mutate(
      {
        branchId: values.branchId,
        businessDate: values.businessDate,
        period: values.period,
        ...(note.length === 0 ? {} : { note }),
        items: lines,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('salesCheckpoint.form.title')}</DialogTitle>
          <DialogDescription>{t('salesCheckpoint.form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sales-checkpoint-branch">{t('salesCheckpoint.form.branch')}</Label>
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <BranchSelector
                    id="sales-checkpoint-branch"
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={create.isPending || loading}
                  />
                )}
              />
              {form.formState.errors.branchId ? (
                <p role="alert" className="text-xs text-destructive">
                  {t('salesCheckpoint.form.branchRequired')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="sales-checkpoint-date">
                {t('salesCheckpoint.form.businessDate')}
              </Label>
              <Input
                id="sales-checkpoint-date"
                type="date"
                data-testid="sales-checkpoint-date"
                {...form.register('businessDate')}
                disabled={create.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sales-checkpoint-period">{t('salesCheckpoint.form.period')}</Label>
              <Controller
                control={form.control}
                name="period"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={create.isPending}
                  >
                    <SelectTrigger
                      id="sales-checkpoint-period"
                      data-testid="sales-checkpoint-period"
                      aria-label={t('salesCheckpoint.form.period')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MORNING">{t('salesCheckpoint.period.morning')}</SelectItem>
                      <SelectItem value="EVENING">{t('salesCheckpoint.period.evening')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sales-checkpoint-note">{t('salesCheckpoint.form.note')}</Label>
              <Input
                id="sales-checkpoint-note"
                data-testid="sales-checkpoint-note"
                {...form.register('note')}
                disabled={create.isPending}
                maxLength={500}
                autoComplete="off"
              />
            </div>
          </div>

          {!loading && !masterDataReady ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              {t('salesCheckpoint.form.masterDataRequired')}
            </p>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t('salesCheckpoint.form.items')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('salesCheckpoint.form.itemsHint')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  items.append({
                    productId: '',
                    quantity: '',
                    presentationId: '',
                    trayCount: '',
                    measuredWeightGrams: '',
                  })
                }
                disabled={create.isPending || products.length === 0}
                data-testid="sales-checkpoint-add-item"
              >
                <Plus aria-hidden className="size-4" />
                {t('salesCheckpoint.form.addItem')}
              </Button>
            </div>

            {items.fields.map((field, index) => (
              <SalesItemFields
                key={field.id}
                form={form}
                index={index}
                products={products}
                disabled={create.isPending || loading}
                locale={locale}
                onRemove={() => items.remove(index)}
              />
            ))}
          </section>

          {form.formState.errors.root ? (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          {create.error ? (
            <div
              role="alert"
              data-testid="sales-checkpoint-create-failure"
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
            <Button type="submit" disabled={create.isPending} data-testid="sales-checkpoint-create">
              {create.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('salesCheckpoint.form.saving')}
                </>
              ) : (
                t('salesCheckpoint.form.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SalesItemFields({
  form,
  index,
  products,
  disabled,
  locale,
  onRemove,
}: {
  readonly form: ReturnType<typeof useForm<SalesCheckpointFormValues>>;
  readonly index: number;
  readonly products: readonly ProductResponse[];
  readonly disabled: boolean;
  readonly locale: Locale;
  readonly onRemove: () => void;
}) {
  const { t } = useTranslation();
  const productId = useWatch({ control: form.control, name: `items.${index}.productId` });
  const presentationId = useWatch({ control: form.control, name: `items.${index}.presentationId` });
  const trayCountValue = useWatch({ control: form.control, name: `items.${index}.trayCount` });
  const product = products.find((option) => option.id === productId);
  const presentationsQuery = useProductPresentations(productId, productId.length > 0);
  const presentations = (presentationsQuery.data ?? []).filter(
    (presentation) => presentation.isActive,
  );
  const presentation = presentations.find((option) => option.id === presentationId);
  const trayCount = parseWholeNumber(trayCountValue);
  const estimatedGrams =
    presentation && trayCount ? presentation.averageWeightGrams * trayCount : undefined;
  const lineErrors = form.formState.errors.items?.[index];

  return (
    <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-1">
        <Label htmlFor={`sales-checkpoint-product-${index}`}>
          {t('salesCheckpoint.form.product')}
        </Label>
        <Controller
          control={form.control}
          name={`items.${index}.productId`}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue(`items.${index}.presentationId`, '');
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id={`sales-checkpoint-product-${index}`}
                data-testid={`sales-checkpoint-product-${index}`}
                aria-label={t('salesCheckpoint.form.product')}
              >
                <SelectValue placeholder={t('salesCheckpoint.form.productPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {products.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {lineErrors?.productId ? (
          <p role="alert" className="text-xs text-destructive">
            {lineErrors.productId.message}
          </p>
        ) : null}
      </div>

      {product?.kind === 'RAW' ? (
        <div className="space-y-1">
          <Label htmlFor={`sales-checkpoint-quantity-${index}`}>
            {t('salesCheckpoint.form.quantity')}
          </Label>
          <Input
            id={`sales-checkpoint-quantity-${index}`}
            data-testid={`sales-checkpoint-quantity-${index}`}
            inputMode="decimal"
            {...form.register(`items.${index}.quantity`)}
            disabled={disabled}
            autoComplete="off"
          />
          {lineErrors?.quantity ? (
            <p role="alert" className="text-xs text-destructive">
              {lineErrors.quantity.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {product?.kind === 'PROCESSED' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor={`sales-checkpoint-presentation-${index}`}>
              {t('salesCheckpoint.form.presentation')}
            </Label>
            <Controller
              control={form.control}
              name={`items.${index}.presentationId`}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || presentations.length === 0}
                >
                  <SelectTrigger
                    id={`sales-checkpoint-presentation-${index}`}
                    data-testid={`sales-checkpoint-presentation-${index}`}
                    aria-label={t('salesCheckpoint.form.presentation')}
                  >
                    <SelectValue
                      placeholder={
                        presentationsQuery.isPending
                          ? t('salesCheckpoint.form.loading')
                          : presentations.length === 0
                            ? t('salesCheckpoint.form.noPresentations')
                            : t('salesCheckpoint.form.presentationPlaceholder')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {presentations.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} · {formatWeightGrams(option.averageWeightGrams, locale)} kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {lineErrors?.presentationId ? (
              <p role="alert" className="text-xs text-destructive">
                {lineErrors.presentationId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`sales-checkpoint-trays-${index}`}>
              {t('salesCheckpoint.form.trays')}
            </Label>
            <Input
              id={`sales-checkpoint-trays-${index}`}
              data-testid={`sales-checkpoint-trays-${index}`}
              inputMode="numeric"
              {...form.register(`items.${index}.trayCount`)}
              disabled={disabled}
              autoComplete="off"
            />
            {lineErrors?.trayCount ? (
              <p role="alert" className="text-xs text-destructive">
                {lineErrors.trayCount.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`sales-checkpoint-measured-${index}`}>
              {t('salesCheckpoint.form.measuredWeight')}
            </Label>
            <Input
              id={`sales-checkpoint-measured-${index}`}
              data-testid={`sales-checkpoint-measured-${index}`}
              inputMode="numeric"
              {...form.register(`items.${index}.measuredWeightGrams`)}
              disabled={disabled}
              autoComplete="off"
            />
            {lineErrors?.measuredWeightGrams ? (
              <p role="alert" className="text-xs text-destructive">
                {lineErrors.measuredWeightGrams.message}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('salesCheckpoint.form.removeLine')}
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </div>

      {product?.kind === 'PROCESSED' ? (
        <p className="text-xs text-muted-foreground sm:col-span-2">
          {estimatedGrams === undefined
            ? t('salesCheckpoint.form.estimatedPending')
            : t('salesCheckpoint.form.estimatedWeight', {
                weight: formatWeightGrams(estimatedGrams, locale),
                trays: formatTrays(trayCount ?? 0, locale),
              })}
        </p>
      ) : null}
    </div>
  );
}

function describeFailure(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION' && error.details.salesCheckpointId !== undefined) {
      return t('salesCheckpoint.form.failure.duplicate');
    }
    if (error.code === 'VALIDATION_ERROR' || error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('salesCheckpoint.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('salesCheckpoint.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('salesCheckpoint.form.failure.network');
    }
  }
  return t('salesCheckpoint.form.failure');
}
