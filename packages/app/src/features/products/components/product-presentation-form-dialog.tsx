import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  updateProductPresentationSchema,
  type ProductPresentationResponse,
  type UpdateProductPresentationBody,
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
import { useCreateProductPresentation } from '../mutations/use-create-product-presentation.js';
import { useUpdateProductPresentation } from '../mutations/use-update-product-presentation.js';

export interface ProductPresentationFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly productId: string;
  readonly presentation?: ProductPresentationResponse;
}

function defaultValues(presentation?: ProductPresentationResponse): UpdateProductPresentationBody {
  return {
    name: presentation?.name ?? '',
    averageWeightGrams: presentation?.averageWeightGrams ?? 0,
    isActive: presentation?.isActive ?? true,
  };
}

export function ProductPresentationFormDialog({
  open,
  onOpenChange,
  productId,
  presentation,
}: ProductPresentationFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateProductPresentation(productId);
  const update = useUpdateProductPresentation(productId);
  const activeMutation = presentation ? update : create;
  const createReset = create.reset;
  const updateReset = update.reset;
  const form = useForm<UpdateProductPresentationBody>({
    resolver: zodResolver(updateProductPresentationSchema),
    defaultValues: defaultValues(presentation),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues(presentation));
    createReset();
    updateReset();
  }, [open, presentation, form, createReset, updateReset]);

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        onOpenChange(false);
      },
    };

    if (presentation) {
      update.mutate({ presentationId: presentation.id, body: values }, options);
    } else {
      create.mutate(values, options);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {presentation
              ? t('products.presentations.form.editTitle')
              : t('products.presentations.form.createTitle')}
          </DialogTitle>
          <DialogDescription>{t('products.presentations.form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="product-presentation-name">
              {t('products.presentations.form.name')}
            </Label>
            <Input
              id="product-presentation-name"
              data-testid="product-presentation-name"
              {...form.register('name')}
              disabled={activeMutation.isPending}
              maxLength={120}
              autoComplete="off"
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {t('products.presentations.form.nameRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('products.presentations.form.nameHint')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-presentation-weight">
              {t('products.presentations.form.averageWeight')}
            </Label>
            <Input
              id="product-presentation-weight"
              data-testid="product-presentation-weight"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              {...form.register('averageWeightGrams', { valueAsNumber: true })}
              disabled={activeMutation.isPending}
            />
            {form.formState.errors.averageWeightGrams ? (
              <p role="alert" className="text-xs text-destructive">
                {t('products.presentations.form.weightRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('products.presentations.form.weightHint')}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="product-presentation-status">
              {t('products.presentations.form.status')}
            </Label>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger
                    id="product-presentation-status"
                    data-testid="product-presentation-status"
                  >
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
              data-testid="product-presentation-form-failure"
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
              data-testid="product-presentation-save"
            >
              {activeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('products.presentations.form.saving')}
                </>
              ) : presentation ? (
                t('products.presentations.form.save')
              ) : (
                t('products.presentations.form.create')
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
      | 'products.presentations.form.failure'
      | 'products.presentations.form.failure.validation'
      | 'products.presentations.form.failure.forbidden'
      | 'products.presentations.form.failure.network'
      | 'products.presentations.form.failure.duplicate',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('products.presentations.form.failure.duplicate');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('products.presentations.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('products.presentations.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('products.presentations.form.failure.network');
    }
  }
  return t('products.presentations.form.failure');
}
