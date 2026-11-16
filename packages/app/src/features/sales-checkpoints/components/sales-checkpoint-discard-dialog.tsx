import { useEffect } from 'react';
import { ApiClientError } from '@inventory-u3/api-client';
import type { SalesCheckpointResponse } from '@inventory-u3/validation';
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
import { useDiscardSalesCheckpoint } from '../mutations/use-discard-sales-checkpoint.js';

export interface SalesCheckpointDiscardDialogProps {
  readonly checkpoint?: SalesCheckpointResponse;
  readonly onOpenChange: (open: boolean) => void;
}

export function SalesCheckpointDiscardDialog({
  checkpoint,
  onOpenChange,
}: SalesCheckpointDiscardDialogProps) {
  const { t } = useTranslation();
  const discard = useDiscardSalesCheckpoint();
  const reset = discard.reset;

  useEffect(() => {
    if (checkpoint) {
      reset();
    }
  }, [checkpoint, reset]);

  return (
    <Dialog open={checkpoint !== undefined} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('salesCheckpoint.discard.title')}</DialogTitle>
          <DialogDescription>{t('salesCheckpoint.discard.description')}</DialogDescription>
        </DialogHeader>

        {discard.error ? (
          <div
            role="alert"
            data-testid="sales-checkpoint-discard-failure"
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
              if (!checkpoint) {
                return;
              }
              discard.mutate(checkpoint.id, { onSuccess: () => onOpenChange(false) });
            }}
            disabled={discard.isPending}
            data-testid="sales-checkpoint-discard-confirm"
          >
            {discard.isPending ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                {t('salesCheckpoint.discard.saving')}
              </>
            ) : (
              <>
                <Trash2 aria-hidden className="size-4" />
                {t('salesCheckpoint.discard.confirm')}
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
      return t('salesCheckpoint.discard.failure.validation');
    }
    if (error.code === 'FORBIDDEN') {
      return t('salesCheckpoint.discard.failure.forbidden');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('salesCheckpoint.discard.failure.network');
    }
  }
  return t('salesCheckpoint.discard.failure');
}
