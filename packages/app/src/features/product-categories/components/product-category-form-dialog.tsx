import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  updateProductCategorySchema,
  type ProductCategoryResponse,
  type UpdateProductCategoryBody,
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
import { useCreateProductCategory } from '../mutations/use-create-product-category.js';
import { useUpdateProductCategory } from '../mutations/use-update-product-category.js';

export interface ProductCategoryFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly category?: ProductCategoryResponse;
}

function defaultValues(category?: ProductCategoryResponse): UpdateProductCategoryBody {
  return {
    name: category?.name ?? '',
    isActive: category?.isActive ?? true,
  };
}

export function ProductCategoryFormDialog({
  open,
  onOpenChange,
  category,
}: ProductCategoryFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateProductCategory();
  const update = useUpdateProductCategory();
  const activeMutation = category ? update : create;
  const createReset = create.reset;
  const updateReset = update.reset;
  const form = useForm<UpdateProductCategoryBody>({
    resolver: zodResolver(updateProductCategorySchema),
    defaultValues: defaultValues(category),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues(category));
    createReset();
    updateReset();
  }, [open, category, form, createReset, updateReset]);

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        onOpenChange(false);
      },
    };

    if (category) {
      update.mutate({ productCategoryId: category.id, body: values }, options);
    } else {
      create.mutate(values, options);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category
              ? t('productCategories.form.editTitle')
              : t('productCategories.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {category
              ? t('productCategories.form.editDescription')
              : t('productCategories.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="product-category-name">{t('productCategories.form.name')}</Label>
            <Input
              id="product-category-name"
              data-testid="product-category-name"
              {...form.register('name')}
              disabled={activeMutation.isPending}
              maxLength={120}
              autoComplete="off"
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {t('productCategories.form.nameRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('productCategories.form.nameHint')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-category-status">{t('productCategories.form.status')}</Label>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="product-category-status" data-testid="product-category-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('productCategories.status.active')}</SelectItem>
                    <SelectItem value="false">{t('productCategories.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {activeMutation.error ? (
            <div
              role="alert"
              data-testid="product-category-form-failure"
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
            <Button
              type="submit"
              disabled={activeMutation.isPending}
              data-testid="product-category-save"
            >
              {activeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('productCategories.form.saving')}
                </>
              ) : category ? (
                t('productCategories.form.save')
              ) : (
                t('productCategories.form.create')
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
      | 'productCategories.form.failure'
      | 'productCategories.form.failure.validation'
      | 'productCategories.form.failure.forbidden'
      | 'productCategories.form.failure.network'
      | 'productCategories.form.failure.duplicate',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('productCategories.form.failure.duplicate');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('productCategories.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('productCategories.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('productCategories.form.failure.network');
    }
  }
  return t('productCategories.form.failure');
}
