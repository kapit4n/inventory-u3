import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import { updateBranchSchema, type UpdateBranchBody } from '@inventory-u3/validation';
import type { BranchResponse } from '@inventory-u3/validation';
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
import { useCreateBranch } from '../mutations/use-create-branch.js';
import { useUpdateBranch } from '../mutations/use-update-branch.js';

export interface BranchFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly branch?: BranchResponse;
}

function defaultValues(branch?: BranchResponse): UpdateBranchBody {
  return {
    name: branch?.name ?? '',
    isActive: branch?.isActive ?? true,
  };
}

export function BranchFormDialog({ open, onOpenChange, branch }: BranchFormDialogProps) {
  const { t } = useTranslation();
  const create = useCreateBranch();
  const update = useUpdateBranch();
  const activeMutation = branch ? update : create;
  const createReset = create.reset;
  const updateReset = update.reset;
  const form = useForm<UpdateBranchBody>({
    resolver: zodResolver(updateBranchSchema),
    defaultValues: defaultValues(branch),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(defaultValues(branch));
    createReset();
    updateReset();
  }, [open, branch, form, createReset, updateReset]);

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        onOpenChange(false);
      },
    };

    if (branch) {
      update.mutate({ branchId: branch.id, body: values }, options);
    } else {
      create.mutate(values, options);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {branch ? t('branches.form.editTitle') : t('branches.form.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {branch ? t('branches.form.editDescription') : t('branches.form.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <Label htmlFor="branch-name">{t('branches.form.name')}</Label>
            <Input
              id="branch-name"
              data-testid="branch-name"
              {...form.register('name')}
              disabled={activeMutation.isPending}
              maxLength={120}
              autoComplete="off"
            />
            {form.formState.errors.name ? (
              <p role="alert" className="text-xs text-destructive">
                {t('branches.form.nameRequired')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('branches.form.nameHint')}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="branch-status">{t('branches.form.status')}</Label>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(value) => field.onChange(value === 'true')}
                  disabled={activeMutation.isPending}
                >
                  <SelectTrigger id="branch-status" data-testid="branch-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('branches.status.active')}</SelectItem>
                    <SelectItem value="false">{t('branches.status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {activeMutation.error ? (
            <div
              role="alert"
              data-testid="branch-form-failure"
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
            <Button type="submit" disabled={activeMutation.isPending} data-testid="branch-save">
              {activeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                  {t('branches.form.saving')}
                </>
              ) : branch ? (
                t('branches.form.save')
              ) : (
                t('branches.form.create')
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
      | 'branches.form.failure'
      | 'branches.form.failure.validation'
      | 'branches.form.failure.forbidden'
      | 'branches.form.failure.duplicate'
      | 'branches.form.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION') {
      return t('branches.form.failure.duplicate');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('branches.form.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('branches.form.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('branches.form.failure.network');
    }
  }
  return t('branches.form.failure');
}
