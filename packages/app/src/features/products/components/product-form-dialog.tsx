import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  updateProductSchema,
  type MeasurementUnitResponse,
  type ProductCategoryResponse,
  type ProductResponse,
  type UpdateProductBody,
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
import { useCreateProduct } from '../mutations/use-create-product.js';
import { useUpdateProduct } from '../mutations/use-update-product.js';

export interface ProductFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly product?: ProductResponse;
  readonly categories: readonly ProductCategoryResponse[];
  readonly units: readonly MeasurementUnitResponse[];
}

function defaultValues(product?: ProductResponse): UpdateProductBody {
  return {
    categoryId: product?.categoryId ?? '',
    name: product?.name ?? '',
    kind: product?.kind ?? 'PROCESSED',
    inventoryUnitId: product?.inventoryUnitId ?? '',
    salesUnitId: product?.salesUnitId ?? '',
    purchaseUnitId: product?.purchaseUnitId,
    productionUnitId: product?.productionUnitId,
    isActive: product?.isActive ?? true,
  };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  units,
}: ProductFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const activeMutation = product ? update : create;
  const createReset = create.reset;
  const updateReset = update.reset;
  const form = useForm<UpdateProductBody>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: defaultValues(product),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues(product));
    createReset();
    updateReset();
  }, [open, product, form, createReset, updateReset]);

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        onOpenChange(false);
      },
    };

    if (product) {
      update.mutate({ productId: product.id, body: values }, options);
    } else {
      create.mutate(values, options);
    }
  });

  const categoryOptions = selectableOptions(categories, product?.categoryId);
  const unitOptions = selectableUnits(units, [
    product?.inventoryUnitId,
    product?.salesUnitId,
    product?.purchaseUnitId,
    product?.productionUnitId,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? t('products.form.editTitle') : t('products.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {product ? t('products.form.editDescription') : t('products.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="product-name">{t('products.form.name')}</Label>
            <Input
              id="product-name"
              data-testid="product-name"
              {...form.register('name')}
              disabled={activeMutation.isPending}
              maxLength={160}
              autoComplete="off"
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {t('products.form.nameRequired')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-category">{t('products.form.category')}</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="product-category" data-testid="product-category">
                    <SelectValue placeholder={t('products.form.categoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                        {category.isActive ? '' : ` (${t('products.status.inactive')})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.categoryId ? (
              <p role="alert" className="text-xs text-destructive">
                {t('products.form.categoryRequired')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-kind">{t('products.form.kind')}</Label>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="product-kind" data-testid="product-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAW">{t('products.kind.raw')}</SelectItem>
                    <SelectItem value="PROCESSED">{t('products.kind.processed')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="inventoryUnitId"
              render={({ field }) => (
                <UnitField
                  id="product-inventory-unit"
                  label={t('products.form.inventoryUnit')}
                  testId="product-inventory-unit"
                  value={field.value}
                  onChange={field.onChange}
                  options={unitOptions}
                  disabled={activeMutation.isPending}
                  error={form.formState.errors.inventoryUnitId}
                  errorMessage={t('products.form.unitRequired')}
                  placeholder={t('products.form.unitPlaceholder')}
                />
              )}
            />

            <Controller
              control={form.control}
              name="salesUnitId"
              render={({ field }) => (
                <UnitField
                  id="product-sales-unit"
                  label={t('products.form.salesUnit')}
                  testId="product-sales-unit"
                  value={field.value}
                  onChange={field.onChange}
                  options={unitOptions}
                  disabled={activeMutation.isPending}
                  error={form.formState.errors.salesUnitId}
                  errorMessage={t('products.form.unitRequired')}
                  placeholder={t('products.form.unitPlaceholder')}
                />
              )}
            />

            <Controller
              control={form.control}
              name="purchaseUnitId"
              render={({ field }) => (
                <OptionalUnitField
                  id="product-purchase-unit"
                  label={t('products.form.purchaseUnit')}
                  testId="product-purchase-unit"
                  value={field.value}
                  onChange={field.onChange}
                  options={unitOptions}
                  disabled={activeMutation.isPending}
                  noneLabel={t('products.form.noUnit')}
                />
              )}
            />

            <Controller
              control={form.control}
              name="productionUnitId"
              render={({ field }) => (
                <OptionalUnitField
                  id="product-production-unit"
                  label={t('products.form.productionUnit')}
                  testId="product-production-unit"
                  value={field.value}
                  onChange={field.onChange}
                  options={unitOptions}
                  disabled={activeMutation.isPending}
                  noneLabel={t('products.form.noUnit')}
                />
              )}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-status">{t('products.form.status')}</Label>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="product-status" data-testid="product-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('products.status.active')}</SelectItem>
                    <SelectItem value="false">{t('products.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {activeMutation.error ? (
            <div
              role="alert"
              data-testid="product-form-failure"
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
            <Button type="submit" disabled={activeMutation.isPending} data-testid="product-save">
              {activeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('products.form.saving')}
                </>
              ) : product ? (
                t('products.form.save')
              ) : (
                t('products.form.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function selectableOptions<T extends { readonly id: string; readonly isActive: boolean }>(
  items: readonly T[],
  currentId?: string,
): readonly T[] {
  return items.filter((item) => item.isActive || item.id === currentId);
}

function selectableUnits(
  units: readonly MeasurementUnitResponse[],
  currentIds: readonly (string | undefined)[],
): readonly MeasurementUnitResponse[] {
  return units.filter((unit) => unit.isActive || currentIds.includes(unit.id));
}

function UnitField({
  id,
  label,
  testId,
  value,
  onChange,
  options,
  disabled,
  error,
  errorMessage,
  placeholder,
}: {
  readonly id: string;
  readonly label: string;
  readonly testId: string;
  readonly value: string | undefined;
  readonly onChange: (value: string) => void;
  readonly options: readonly MeasurementUnitResponse[];
  readonly disabled: boolean;
  readonly error: unknown;
  readonly errorMessage: string;
  readonly placeholder: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} data-testid={testId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              {unit.name} ({unit.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function OptionalUnitField({
  id,
  label,
  testId,
  value,
  onChange,
  options,
  disabled,
  noneLabel,
}: {
  readonly id: string;
  readonly label: string;
  readonly testId: string;
  readonly value: string | undefined;
  readonly onChange: (value: string | undefined) => void;
  readonly options: readonly MeasurementUnitResponse[];
  readonly disabled: boolean;
  readonly noneLabel: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? 'none'}
        onValueChange={(next) => onChange(next === 'none' ? undefined : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{noneLabel}</SelectItem>
          {options.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              {unit.name} ({unit.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function describeFailure(
  error: unknown,
  t: (
    key:
      | 'products.form.failure'
      | 'products.form.failure.validation'
      | 'products.form.failure.forbidden'
      | 'products.form.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('products.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('products.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('products.form.failure.network');
    }
  }
  return t('products.form.failure');
}
