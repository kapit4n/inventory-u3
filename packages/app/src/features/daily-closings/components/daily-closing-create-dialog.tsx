import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import {
  createDailyClosingSchema,
  type CreateDailyClosingBody,
  type DailyClosingResponse,
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
} from '@inventory-u3/ui';

import { useTranslation, type TranslationKey } from '../../../i18n/index.js';
import { BranchSelector } from '../../branches/components/branch-selector.js';
import { useBranches } from '../../branches/queries/branches-query.js';
import { todayIsoDate } from '../../products/price-format.js';
import { useCreateDailyClosing } from '../mutations/use-create-daily-closing.js';

export interface DailyClosingCreateDialogProps {
  readonly open: boolean;
  readonly defaultBranchId: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: (closing: DailyClosingResponse) => void;
}

export function DailyClosingCreateDialog({
  open,
  defaultBranchId,
  onOpenChange,
  onCreated,
}: DailyClosingCreateDialogProps) {
  const { t } = useTranslation();
  const branchesQuery = useBranches();
  const create = useCreateDailyClosing();
  const form = useForm<CreateDailyClosingBody>({
    resolver: zodResolver(createDailyClosingSchema),
    defaultValues: { branchId: defaultBranchId, businessDate: todayIsoDate() },
  });
  const reset = create.reset;
  const formReset = form.reset;

  useEffect(() => {
    if (!open) {
      return;
    }
    formReset({ branchId: defaultBranchId, businessDate: todayIsoDate() });
    reset();
  }, [open, defaultBranchId, formReset, reset]);

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, { onSuccess: onCreated });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dailyClosing.form.title')}</DialogTitle>
          <DialogDescription>{t('dailyClosing.form.description')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="daily-closing-branch">{t('dailyClosing.form.branch')}</Label>
            <BranchSelector
              id="daily-closing-branch"
              value={form.watch('branchId')}
              onValueChange={(value) => form.setValue('branchId', value, { shouldValidate: true })}
              disabled={create.isPending || branchesQuery.isPending}
            />
            {form.formState.errors.branchId ? (
              <p role="alert" className="text-xs text-destructive">
                {t('dailyClosing.form.failure')}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="daily-closing-date">{t('dailyClosing.form.businessDate')}</Label>
            <Input
              id="daily-closing-date"
              type="date"
              data-testid="daily-closing-date"
              {...form.register('businessDate')}
              disabled={create.isPending}
            />
            {form.formState.errors.businessDate ? (
              <p role="alert" className="text-xs text-destructive">
                {t('dailyClosing.form.failure')}
              </p>
            ) : null}
          </div>

          {create.error ? (
            <div
              role="alert"
              data-testid="daily-closing-create-failure"
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
              disabled={create.isPending}
              data-testid="daily-closing-create-submit"
            >
              {create.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('dailyClosing.form.saving')}
                </>
              ) : (
                t('dailyClosing.form.submit')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function describeFailure(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.status === 409) {
      return t('dailyClosing.form.duplicate');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('dailyClosing.actionFailure.network');
    }
    if (error.code === 'FORBIDDEN') {
      return t('dailyClosing.actionFailure.forbidden');
    }
  }
  return t('dailyClosing.form.failure');
}
