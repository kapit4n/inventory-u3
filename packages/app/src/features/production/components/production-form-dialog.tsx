import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiClientError } from '@inventory-u3/api-client';
import type { CreateProductionBatchBody, ProductResponse } from '@inventory-u3/validation';
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

import { useTranslation, type TranslationKey } from '../../../i18n/index.js';
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { useEmployees } from '../../employees/queries/employees-query.js';
import { useMeasurementUnits } from '../../measurement-units/queries/measurement-units-query.js';
import { useProductPresentations } from '../../products/queries/product-presentations-query.js';
import { useProducts } from '../../products/queries/products-query.js';
import { todayIsoDate } from '../../products/price-format.js';
import {
  formatTrays,
  formatWeightGrams,
  parseQuantityMilli,
  parseWholeNumber,
} from '../production-format.js';
import { useCreateProductionBatch } from '../mutations/use-create-production-batch.js';

const lineSchema = z.object({
  productId: z.string(),
  quantity: z.string(),
});

const outputSchema = z.object({
  productId: z.string(),
  presentationId: z.string(),
  trayCount: z.string(),
  measuredWeightGrams: z.string(),
});

const wasteSchema = z.object({
  productId: z.string(),
  quantity: z.string(),
  reason: z.string().trim().max(500),
  note: z.string().trim().max(500),
});

const productionFormSchema = z.object({
  branchId: z.string().min(1),
  businessDate: z.string().min(1),
  preparedByEmployeeId: z.string().min(1),
  note: z.string().max(500),
  inputs: z.array(lineSchema),
  outputs: z.array(outputSchema),
  waste: z.array(wasteSchema),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;

export interface ProductionFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function emptyValues(): ProductionFormValues {
  return {
    branchId: '',
    businessDate: todayIsoDate(),
    preparedByEmployeeId: '',
    note: '',
    inputs: [{ productId: '', quantity: '' }],
    outputs: [{ productId: '', presentationId: '', trayCount: '', measuredWeightGrams: '' }],
    waste: [],
  };
}

export function ProductionFormDialog({ open, onOpenChange }: ProductionFormDialogProps) {
  const { t, locale } = useTranslation();
  const create = useCreateProductionBatch();
  const branchesQuery = useBranches();
  const employeesQuery = useEmployees();
  const productsQuery = useProducts();
  const unitsQuery = useMeasurementUnits();
  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: emptyValues(),
  });
  const inputs = useFieldArray({ control: form.control, name: 'inputs' });
  const outputs = useFieldArray({ control: form.control, name: 'outputs' });
  const waste = useFieldArray({ control: form.control, name: 'waste' });
  const branchId = useWatch({ control: form.control, name: 'branchId' });
  const preparedByEmployeeId = useWatch({
    control: form.control,
    name: 'preparedByEmployeeId',
  });
  const inputValues = useWatch({ control: form.control, name: 'inputs' });
  const wasteValues = useWatch({ control: form.control, name: 'waste' });
  const resetCreate = create.reset;

  const branches = (branchesQuery.data ?? []).filter((branch) => branch.isActive);
  const employees = (employeesQuery.data ?? []).filter(
    (employee) => employee.isActive && employee.branchId === branchId,
  );
  const products = (productsQuery.data ?? []).filter((product) => product.isActive);
  const rawProducts = products.filter((product) => product.kind === 'RAW');
  const processedProducts = products.filter((product) => product.kind === 'PROCESSED');
  const units = unitsQuery.data ?? [];
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const productById = new Map(products.map((product) => [product.id, product]));

  const loading =
    branchesQuery.isPending ||
    employeesQuery.isPending ||
    productsQuery.isPending ||
    unitsQuery.isPending;
  const masterDataReady = branches.length > 0 && employees.length > 0 && products.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(emptyValues());
    resetCreate();
  }, [open, form, resetCreate]);

  useEffect(() => {
    if (
      preparedByEmployeeId.length > 0 &&
      !employees.some((employee) => employee.id === preparedByEmployeeId)
    ) {
      form.setValue('preparedByEmployeeId', '');
    }
  }, [employees, preparedByEmployeeId, form]);

  const onSubmit = form.handleSubmit((values) => {
    const inputLines: CreateProductionBatchBody['inputs'] = [];
    const outputLines: CreateProductionBatchBody['outputs'] = [];
    const wasteLines: CreateProductionBatchBody['waste'] = [];
    let valid = true;

    values.inputs.forEach((line, index) => {
      if (line.productId.length === 0 && line.quantity.trim().length === 0) {
        return;
      }

      if (!productById.has(line.productId)) {
        form.setError(`inputs.${index}.productId`, {
          message: t('production.form.productRequired'),
        });
        valid = false;
        return;
      }

      const quantityMilli = parseQuantityMilli(line.quantity);
      if (quantityMilli === undefined) {
        form.setError(`inputs.${index}.quantity`, {
          message: t('production.form.quantityInvalid'),
        });
        valid = false;
        return;
      }

      inputLines.push({ productId: line.productId, quantityMilli });
    });

    values.outputs.forEach((line, index) => {
      if (line.productId.length === 0) {
        return;
      }

      if (!productById.has(line.productId)) {
        form.setError(`outputs.${index}.productId`, {
          message: t('production.form.productRequired'),
        });
        valid = false;
        return;
      }
      if (line.presentationId.length === 0) {
        form.setError(`outputs.${index}.presentationId`, {
          message: t('production.form.presentationRequired'),
        });
        valid = false;
        return;
      }

      const trayCount = parseWholeNumber(line.trayCount);
      if (trayCount === undefined) {
        form.setError(`outputs.${index}.trayCount`, {
          message: t('production.form.trayCountInvalid'),
        });
        valid = false;
        return;
      }

      const measuredWeightGrams =
        line.measuredWeightGrams.trim().length === 0
          ? undefined
          : parseWholeNumber(line.measuredWeightGrams);
      if (line.measuredWeightGrams.trim().length > 0 && measuredWeightGrams === undefined) {
        form.setError(`outputs.${index}.measuredWeightGrams`, {
          message: t('production.form.measuredWeightInvalid'),
        });
        valid = false;
        return;
      }

      outputLines.push({
        productId: line.productId,
        presentationId: line.presentationId,
        trayCount,
        ...(measuredWeightGrams === undefined ? {} : { measuredWeightGrams }),
      });
    });

    values.waste.forEach((line, index) => {
      if (line.productId.length === 0) {
        return;
      }

      if (!productById.has(line.productId)) {
        form.setError(`waste.${index}.productId`, {
          message: t('production.form.productRequired'),
        });
        valid = false;
        return;
      }

      const quantityMilli = parseQuantityMilli(line.quantity);
      if (quantityMilli === undefined) {
        form.setError(`waste.${index}.quantity`, {
          message: t('production.form.quantityInvalid'),
        });
        valid = false;
        return;
      }
      if (line.reason.trim().length === 0) {
        form.setError(`waste.${index}.reason`, {
          message: t('production.form.reasonRequired'),
        });
        valid = false;
        return;
      }

      wasteLines.push({
        productId: line.productId,
        quantityMilli,
        reason: line.reason,
        ...(line.note.length === 0 ? {} : { note: line.note }),
      });
    });

    if (!valid) {
      return;
    }

    if (inputLines.length === 0 && outputLines.length === 0 && wasteLines.length === 0) {
      form.setError('root', { message: t('production.form.linesRequired') });
      return;
    }

    const note = values.note.trim();
    create.mutate(
      {
        branchId: values.branchId,
        businessDate: values.businessDate,
        preparedByEmployeeId: values.preparedByEmployeeId,
        ...(note.length === 0 ? {} : { note }),
        inputs: inputLines,
        outputs: outputLines,
        waste: wasteLines,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('production.form.title')}</DialogTitle>
          <DialogDescription>{t('production.form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="production-branch">{t('production.form.branch')}</Label>
              <Controller
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <BranchSelector
                    id="production-branch"
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={create.isPending || loading}
                  />
                )}
              />
              {form.formState.errors.branchId ? (
                <p role="alert" className="text-xs text-destructive">
                  {t('production.form.branchRequired')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="production-date">{t('production.form.businessDate')}</Label>
              <Input
                id="production-date"
                type="date"
                data-testid="production-date"
                {...form.register('businessDate')}
                disabled={create.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="production-preparer">{t('production.form.preparer')}</Label>
              <Controller
                control={form.control}
                name="preparedByEmployeeId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={create.isPending || loading || employees.length === 0}
                  >
                    <SelectTrigger
                      id="production-preparer"
                      data-testid="production-preparer"
                      aria-label={t('production.form.preparer')}
                    >
                      <SelectValue
                        placeholder={
                          branchId.length === 0
                            ? t('production.form.chooseBranchFirst')
                            : employees.length === 0
                              ? t('production.form.noEmployees')
                              : t('production.form.preparerPlaceholder')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.preparedByEmployeeId ? (
                <p role="alert" className="text-xs text-destructive">
                  {t('production.form.preparerRequired')}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="production-note">{t('production.form.note')}</Label>
              <Input
                id="production-note"
                data-testid="production-note"
                {...form.register('note')}
                disabled={create.isPending}
                maxLength={500}
                autoComplete="off"
              />
            </div>
          </div>

          {!loading && !masterDataReady ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              {t('production.form.masterDataRequired')}
            </p>
          ) : null}

          <FormSection
            title={t('production.form.outputs')}
            hint={t('production.form.outputsHint')}
            addLabel={t('production.form.addOutput')}
            onAdd={() =>
              outputs.append({
                productId: '',
                presentationId: '',
                trayCount: '',
                measuredWeightGrams: '',
              })
            }
            disabled={create.isPending || processedProducts.length === 0}
            testId="production-add-output"
          >
            {outputs.fields.map((field, index) => (
              <OutputLineFields
                key={field.id}
                form={form}
                index={index}
                products={processedProducts}
                disabled={create.isPending || loading}
                locale={locale}
                onRemove={() => outputs.remove(index)}
              />
            ))}
          </FormSection>

          <FormSection
            title={t('production.form.inputs')}
            hint={t('production.form.inputsHint')}
            addLabel={t('production.form.addInput')}
            onAdd={() => inputs.append({ productId: '', quantity: '' })}
            disabled={create.isPending || rawProducts.length === 0}
            testId="production-add-input"
          >
            {inputs.fields.map((field, index) => {
              const productId = inputValues[index]?.productId ?? '';
              const product = productById.get(productId);
              const unit = product ? unitById.get(product.inventoryUnitId) : undefined;
              const lineErrors = form.formState.errors.inputs?.[index];

              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`production-input-product-${index}`}>
                      {t('production.form.product')}
                    </Label>
                    <Controller
                      control={form.control}
                      name={`inputs.${index}.productId`}
                      render={({ field: productField }) => (
                        <Select
                          value={productField.value}
                          onValueChange={productField.onChange}
                          disabled={create.isPending || loading}
                        >
                          <SelectTrigger
                            id={`production-input-product-${index}`}
                            data-testid={`production-input-product-${index}`}
                            aria-label={t('production.form.product')}
                          >
                            <SelectValue placeholder={t('production.form.productPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {rawProducts.map((option) => (
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

                  <div className="space-y-1">
                    <Label htmlFor={`production-input-quantity-${index}`}>
                      {t('production.form.quantity')}
                    </Label>
                    <Input
                      id={`production-input-quantity-${index}`}
                      data-testid={`production-input-quantity-${index}`}
                      inputMode="decimal"
                      {...form.register(`inputs.${index}.quantity`)}
                      disabled={create.isPending}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      {unit?.name ?? t('production.form.unitUnknown')}
                    </p>
                    {lineErrors?.quantity ? (
                      <p role="alert" className="text-xs text-destructive">
                        {lineErrors.quantity.message}
                      </p>
                    ) : null}
                  </div>

                  <RemoveButton
                    label={t('production.form.removeLine')}
                    onClick={() => inputs.remove(index)}
                    disabled={create.isPending}
                  />
                </div>
              );
            })}
          </FormSection>

          <FormSection
            title={t('production.form.waste')}
            hint={t('production.form.wasteHint')}
            addLabel={t('production.form.addWaste')}
            onAdd={() => waste.append({ productId: '', quantity: '', reason: '', note: '' })}
            disabled={create.isPending || products.length === 0}
            testId="production-add-waste"
          >
            {waste.fields.map((field, index) => {
              const productId = wasteValues[index]?.productId ?? '';
              const product = productById.get(productId);
              const unit = product ? unitById.get(product.inventoryUnitId) : undefined;
              const lineErrors = form.formState.errors.waste?.[index];

              return (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto]"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`production-waste-product-${index}`}>
                      {t('production.form.product')}
                    </Label>
                    <Controller
                      control={form.control}
                      name={`waste.${index}.productId`}
                      render={({ field: productField }) => (
                        <Select
                          value={productField.value}
                          onValueChange={productField.onChange}
                          disabled={create.isPending || loading}
                        >
                          <SelectTrigger
                            id={`production-waste-product-${index}`}
                            data-testid={`production-waste-product-${index}`}
                            aria-label={t('production.form.product')}
                          >
                            <SelectValue placeholder={t('production.form.productPlaceholder')} />
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

                  <div className="space-y-1">
                    <Label htmlFor={`production-waste-quantity-${index}`}>
                      {t('production.form.quantity')}
                    </Label>
                    <Input
                      id={`production-waste-quantity-${index}`}
                      data-testid={`production-waste-quantity-${index}`}
                      inputMode="decimal"
                      {...form.register(`waste.${index}.quantity`)}
                      disabled={create.isPending}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      {unit?.name ?? t('production.form.unitUnknown')}
                    </p>
                    {lineErrors?.quantity ? (
                      <p role="alert" className="text-xs text-destructive">
                        {lineErrors.quantity.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`production-waste-reason-${index}`}>
                      {t('production.form.wasteReason')}
                    </Label>
                    <Input
                      id={`production-waste-reason-${index}`}
                      data-testid={`production-waste-reason-${index}`}
                      {...form.register(`waste.${index}.reason`)}
                      disabled={create.isPending}
                      maxLength={500}
                      autoComplete="off"
                    />
                    {lineErrors?.reason ? (
                      <p role="alert" className="text-xs text-destructive">
                        {t('production.form.reasonRequired')}
                      </p>
                    ) : null}
                  </div>

                  <RemoveButton
                    label={t('production.form.removeLine')}
                    onClick={() => waste.remove(index)}
                    disabled={create.isPending}
                  />
                </div>
              );
            })}
          </FormSection>

          {form.formState.errors.root ? (
            <p role="alert" className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          {create.error ? (
            <div
              role="alert"
              data-testid="production-create-failure"
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
            <Button type="submit" disabled={create.isPending} data-testid="production-create">
              {create.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('production.form.saving')}
                </>
              ) : (
                t('production.form.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({
  title,
  hint,
  addLabel,
  onAdd,
  disabled,
  testId,
  children,
}: {
  readonly title: string;
  readonly hint: string;
  readonly addLabel: string;
  readonly onAdd: () => void;
  readonly disabled: boolean;
  readonly testId: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={disabled}
          data-testid={testId}
        >
          <Plus aria-hidden className="size-4" />
          {addLabel}
        </Button>
      </div>
      {children}
    </section>
  );
}

function RemoveButton({
  label,
  onClick,
  disabled,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled: boolean;
}) {
  return (
    <div className="flex items-end">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

function OutputLineFields({
  form,
  index,
  products,
  disabled,
  locale,
  onRemove,
}: {
  readonly form: ReturnType<typeof useForm<ProductionFormValues>>;
  readonly index: number;
  readonly products: readonly ProductResponse[];
  readonly disabled: boolean;
  readonly locale: 'en' | 'es';
  readonly onRemove: () => void;
}) {
  const { t } = useTranslation();
  const productId = useWatch({ control: form.control, name: `outputs.${index}.productId` });
  const presentationId = useWatch({
    control: form.control,
    name: `outputs.${index}.presentationId`,
  });
  const trayCountValue = useWatch({
    control: form.control,
    name: `outputs.${index}.trayCount`,
  });
  const presentationsQuery = useProductPresentations(productId, productId.length > 0);
  const presentations = (presentationsQuery.data ?? []).filter(
    (presentation) => presentation.isActive,
  );
  const presentation = presentations.find((option) => option.id === presentationId);
  const trayCount = parseWholeNumber(trayCountValue);
  const estimatedGrams =
    presentation && trayCount ? presentation.averageWeightGrams * trayCount : undefined;
  const lineErrors = form.formState.errors.outputs?.[index];

  return (
    <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]">
      <div className="space-y-1">
        <Label htmlFor={`production-output-product-${index}`}>{t('production.form.product')}</Label>
        <Controller
          control={form.control}
          name={`outputs.${index}.productId`}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue(`outputs.${index}.presentationId`, '');
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id={`production-output-product-${index}`}
                data-testid={`production-output-product-${index}`}
                aria-label={t('production.form.product')}
              >
                <SelectValue placeholder={t('production.form.productPlaceholder')} />
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

      <div className="space-y-1">
        <Label htmlFor={`production-output-presentation-${index}`}>
          {t('production.form.presentation')}
        </Label>
        <Controller
          control={form.control}
          name={`outputs.${index}.presentationId`}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled || presentations.length === 0}
            >
              <SelectTrigger
                id={`production-output-presentation-${index}`}
                data-testid={`production-output-presentation-${index}`}
                aria-label={t('production.form.presentation')}
              >
                <SelectValue
                  placeholder={
                    presentationsQuery.isPending
                      ? t('production.form.loading')
                      : presentations.length === 0
                        ? t('production.form.noPresentations')
                        : t('production.form.presentationPlaceholder')
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
        <Label htmlFor={`production-output-trays-${index}`}>{t('production.form.trays')}</Label>
        <Input
          id={`production-output-trays-${index}`}
          data-testid={`production-output-trays-${index}`}
          inputMode="numeric"
          {...form.register(`outputs.${index}.trayCount`)}
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
        <Label htmlFor={`production-output-measured-${index}`}>
          {t('production.form.measuredWeight')}
        </Label>
        <Input
          id={`production-output-measured-${index}`}
          data-testid={`production-output-measured-${index}`}
          inputMode="numeric"
          {...form.register(`outputs.${index}.measuredWeightGrams`)}
          disabled={disabled}
          autoComplete="off"
        />
        {lineErrors?.measuredWeightGrams ? (
          <p role="alert" className="text-xs text-destructive">
            {lineErrors.measuredWeightGrams.message}
          </p>
        ) : null}
      </div>

      <RemoveButton
        label={t('production.form.removeLine')}
        onClick={onRemove}
        disabled={disabled}
      />

      <p className="text-xs text-muted-foreground sm:col-span-5">
        {estimatedGrams === undefined
          ? t('production.form.estimatedPending')
          : t('production.form.estimatedWeight', {
              weight: formatWeightGrams(estimatedGrams, locale),
              trays: formatTrays(trayCount ?? 0, locale),
            })}
      </p>
    </div>
  );
}

function describeFailure(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'VALIDATION_ERROR') {
      return t('production.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('production.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('production.form.failure.network');
    }
  }
  return t('production.form.failure');
}
