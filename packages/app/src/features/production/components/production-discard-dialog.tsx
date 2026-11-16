import { useEffect } from 'react';
import { ApiClientError } from '@inventory-u3/api-client';
import type { ProductionBatchResponse } from '@inventory-u3/validation';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@inventory-u3/ui';

import { useTranslation, type TranslationKey } from '../../../i18n/index.js';
import { useDiscardProductionBatch } from '../mutations/use-discard-production-batch.js';

export interface ProductionDiscardDialogProps {
  readonly batch?: ProductionBatchResponse;
  readonly onOpenChange: (open: boolean) => void;
}

export function ProductionDiscardDialog({ batch, onOpenChange }: ProductionDiscardDialogProps) {
  const { t } = useTranslation();
  const discard = useDiscardProductionBatch();
  const reset = discard.reset;

  useEffect(() => {
    if (batch) {
      reset();
    }
  }, [batch, reset]);

  return (
    <Dialog open={batch !== undefined} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('production.discard.title')}</DialogTitle>
          <DialogDescription>{t('production.discard.description')}</DialogDescription>
        </DialogHeader>

        {discard.error ? (
          <div
            role="alert"
            data-testid="production-discard-failure"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{describeFailure(discard.error, t)}</span>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={discard.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (!batch) {
                return;
              }
              discard.mutate(batch.id, { onSuccess: () => onOpenChange(false) });
            }}
            disabled={discard.isPending}
            data-testid="production-discard-confirm"
          >
            {discard.isPending ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                {t('production.discard.saving')}
              </>
            ) : (
              <>
                <Trash2 aria-hidden className="size-4" />
                {t('production.discard.confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describeFailure(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'DOMAIN_RULE_VIOLATION' || error.code === 'VALIDATION_ERROR') {
      return t('production.discard.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('production.discard.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('production.discard.failure.network');
    }
  }
  return t('production.discard.failure');
}
