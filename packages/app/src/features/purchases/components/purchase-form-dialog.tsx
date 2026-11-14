import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiClientError } from '@inventory-u3/api-client';
import type { CreatePurchaseBody } from '@inventory-u3/validation';
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

import { useTranslation } from '../../../i18n/index.js';
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { useMeasurementUnits } from '../../measurement-units/queries/measurement-units-query.js';
import { useOrganizationSettings } from '../../organization/queries/organization-settings-query.js';
import { parseCurrencyAmount, todayIsoDate } from '../../products/price-format.js';
import { useProducts } from '../../products/queries/products-query.js';
import { useSuppliers } from '../../suppliers/queries/suppliers-query.js';
import { useCreatePurchase } from '../mutations/use-create-purchase.js';
import { parseQuantityMilli } from '../purchase-quantity.js';

const purchaseFormSchema = z.object({
  branchId: z.string().min(1),
  supplierId: z.string().min(1),
  deliveryDate: z.string().min(1),
  note: z.string().max(500),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.string().trim().min(1),
        unitPrice: z.string().trim().min(1),
      }),
    )
    .min(1),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export interface PurchaseFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function emptyValues(): PurchaseFormValues {
  return {
    branchId: '',
    supplierId: '',
    deliveryDate: todayIsoDate(),
    note: '',
    items: [{ productId: '', quantity: '', unitPrice: '' }],
  };
}

export function PurchaseFormDialog({ open, onOpenChange }: PurchaseFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreatePurchase();
  const branchesQuery = useBranches();
  const suppliersQuery = useSuppliers();
  const productsQuery = useProducts();
  const unitsQuery = useMeasurementUnits();
  const organizationQuery = useOrganizationSettings();
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: emptyValues(),
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const resetCreate = create.reset;

  const currency = organizationQuery.data?.currency ?? 'USD';
  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive);
  const suppliers = (suppliersQuery.data ?? []).filter((supplier) => supplier.isActive);
  const products = (productsQuery.data ?? []).filter((product) => product.isActive);
  const units = unitsQuery.data ?? [];
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const productById = new Map(products.map((product) => [product.id, product]));

  const loading =
    branchesQuery.isPending ||
    suppliersQuery.isPending ||
    productsQuery.isPending ||
    unitsQuery.isPending ||
    organizationQuery.isPending;
  const masterDataReady = branches.length > 0 && suppliers.length > 0 && products.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(emptyValues());
    resetCreate();
  }, [open, form, resetCreate]);

  const onSubmit = form.handleSubmit((values) => {
    const items: CreatePurchaseBody['items'] = [];
    let valid = true;

    values.items.forEach((line, index) => {
      const product = productById.get(line.productId);
      if (!product) {
        form.setError(`items.${index}.productId`, {
          message: t('purchases.form.productRequired'),
        });
        valid = false;
        return;
      }

      const quantityMilli = parseQuantityMilli(line.quantity);
      if (quantityMilli === undefined) {
        form.setError(`items.${index}.quantity`, {
          message: t('purchases.form.quantityInvalid'),
        });
        valid = false;
        return;
      }

      const unitPriceMinor = parseCurrencyAmount(line.unitPrice, currency);
      if (unitPriceMinor === undefined) {
        form.setError(`items.${index}.unitPrice`, {
          message: t('purchases.form.unitPriceInvalid'),
        });
        valid = false;
        return;
      }

      items.push({
        productId: product.id,
        unitId: product.inventoryUnitId,
        quantityMilli,
        unitPriceMinor,
      });
    });

    if (!valid) {
      return;
    }

    const note = values.note.trim();
    create.mutate(
      {
        branchId: values.branchId,
        supplierId: values.supplierId,
        deliveryDate: values.deliveryDate,
        ...(note.length === 0 ? {} : { note }),
        items,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('purchases.form.title')}</DialogTitle>
          <DialogDescription>{t('purchases.form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="purchase-branch">{t('purchases.form.branch')}</Label>
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <BranchSelector
                    id="purchase-branch"
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={create.isPending || loading}
                  />
                )}
              />
              {form.formState.errors.branchId ? (
                <p role="alert" className="text-xs text-destructive">
                  {t('purchases.form.branchRequired')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="purchase-supplier">{t('purchases.form.supplier')}</Label>
              <Controller
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={create.isPending || loading || suppliers.length === 0}
                  >
                    <SelectTrigger
                      id="purchase-supplier"
                      data-testid="purchase-supplier"
                      aria-label={t('purchases.form.supplier')}
                    >
                      <SelectValue
                        placeholder={
                          suppliersQuery.isPending
                            ? t('purchases.form.loading')
                            : suppliers.length === 0
                              ? t('purchases.form.noSuppliers')
                              : t('purchases.form.supplierPlaceholder')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.supplierId ? (
                <p role="alert" className="text-xs text-destructive">
                  {t('purchases.form.supplierRequired')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="purchase-delivery-date">{t('purchases.form.deliveryDate')}</Label>
              <Input
                id="purchase-delivery-date"
                type="date"
                data-testid="purchase-delivery-date"
                {...form.register('deliveryDate')}
                disabled={create.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="purchase-note">{t('purchases.form.note')}</Label>
              <Input
                id="purchase-note"
                data-testid="purchase-note"
                {...form.register('note')}
                disabled={create.isPending}
                maxLength={500}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t('purchases.form.items')}</p>
                <p className="text-xs text-muted-foreground">{t('purchases.form.itemsHint')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '', unitPrice: '' })}
                disabled={create.isPending || products.length === 0}
                data-testid="purchase-add-item"
              >
                <Plus aria-hidden className="size-4" />
                {t('purchases.form.addItem')}
              </Button>
            </div>

            {fields.map((field, index) => {
              const product = productById.get(watchedItems?.[index]?.productId ?? '');
              const unit = product ? unitById.get(product.inventoryUnitId) : undefined;
              const itemErrors = form.formState.errors.items?.[index];

              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`purchase-product-${index}`}>
                      {t('purchases.form.product')}
                    </Label>
                    <Controller
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field: productField }) => (
                        <Select
                          value={productField.value}
                          onValueChange={productField.onChange}
                          disabled={create.isPending || loading || products.length === 0}
                        >
                          <SelectTrigger
                            id={`purchase-product-${index}`}
                            data-testid={`purchase-product-${index}`}
                            aria-label={t('purchases.form.product')}
                          >
                            <SelectValue
                              placeholder={
                                products.length === 0
                                  ? t('purchases.form.noProducts')
                                  : t('purchases.form.productPlaceholder')
                              }
                            />
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
                    {itemErrors?.productId ? (
                      <p role="alert" className="text-xs text-destructive">
                        {itemErrors.productId.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`purchase-quantity-${index}`}>
                      {t('purchases.form.quantity')}
                    </Label>
                    <Input
                      id={`purchase-quantity-${index}`}
                      data-testid={`purchase-quantity-${index}`}
                      inputMode="decimal"
                      {...form.register(`items.${index}.quantity`)}
                      disabled={create.isPending}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      {unit?.name ?? t('purchases.form.unitUnknown')}
                    </p>
                    {itemErrors?.quantity ? (
                      <p role="alert" className="text-xs text-destructive">
                        {itemErrors.quantity.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`purchase-unit-price-${index}`}>
                      {t('purchases.form.unitPrice', { currency })}
                    </Label>
                    <Input
                      id={`purchase-unit-price-${index}`}
                      data-testid={`purchase-unit-price-${index}`}
                      inputMode="decimal"
                      {...form.register(`items.${index}.unitPrice`)}
                      disabled={create.isPending}
                      autoComplete="off"
                    />
                    {itemErrors?.unitPrice ? (
                      <p role="alert" className="text-xs text-destructive">
                        {itemErrors.unitPrice.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={create.isPending || fields.length === 1}
                      aria-label={t('purchases.form.removeItem')}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {form.formState.errors.items?.root?.message ? (
              <p role="alert" className="text-xs text-destructive">
                {form.formState.errors.items.root.message}
              </p>
            ) : null}
          </div>

          {!loading && !masterDataReady ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              {t('purchases.form.masterDataRequired')}
            </p>
          ) : null}

          {create.error ? (
            <div
              role="alert"
              data-testid="purchase-form-failure"
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
            <Button
              type="submit"
              disabled={create.isPending || loading || !masterDataReady}
              data-testid="purchase-save"
            >
              {create.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('purchases.form.saving')}
                </>
              ) : (
                t('purchases.form.create')
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
      | 'purchases.form.failure'
      | 'purchases.form.failure.validation'
      | 'purchases.form.failure.forbidden'
      | 'purchases.form.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('purchases.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('purchases.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('purchases.form.failure.network');
    }
  }
  return t('purchases.form.failure');
}
