import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiClientError } from '@inventory-u3/api-client';
import type { Organization } from '@inventory-u3/domain';
import {
  updateOrganizationSettingsSchema,
  type UpdateOrganizationSettingsBody,
} from '@inventory-u3/validation';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@inventory-u3/ui';

import { useTranslation } from '../../../i18n/index.js';
import { BranchManagement } from '../../branches/components/branch-management.js';
import { EmployeeManagement } from '../../employees/components/employee-management.js';
import { MeasurementUnitManagement } from '../../measurement-units/components/measurement-unit-management.js';
import { useOrganizationSettings } from '../../organization/queries/organization-settings-query.js';
import { useUpdateOrganizationSettings } from '../../organization/mutations/use-update-organization-settings.js';
import { ProductCategoryManagement } from '../../product-categories/components/product-category-management.js';
import { SupplierManagement } from '../../suppliers/components/supplier-management.js';

function defaultValues(organization?: Organization): UpdateOrganizationSettingsBody {
  return {
    name: organization?.name ?? '',
    timezone: organization?.timezone ?? 'UTC',
    currency: organization?.currency ?? 'USD',
  };
}

export function SettingsPage() {
  const { t } = useTranslation();
  const organizationQuery = useOrganizationSettings();

  if (organizationQuery.isPending) {
    return <p className="text-sm text-muted-foreground">{t('settings.loading')}</p>;
  }

  if (organizationQuery.isError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
      >
        <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-2">
          <p>{t('settings.loadFailure')}</p>
          <Button type="button" variant="outline" onClick={() => void organizationQuery.refetch()}>
            {t('settings.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OrganizationSettingsForm organization={organizationQuery.data} />
      <BranchManagement />
      <EmployeeManagement />
      <SupplierManagement />
      <ProductCategoryManagement />
      <MeasurementUnitManagement />
    </div>
  );
}

function OrganizationSettingsForm({ organization }: { readonly organization: Organization }) {
  const { t } = useTranslation();
  const update = useUpdateOrganizationSettings();
  const form = useForm<UpdateOrganizationSettingsBody>({
    resolver: zodResolver(updateOrganizationSettingsSchema),
    defaultValues: defaultValues(organization),
  });

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(values, {
      onSuccess: (saved) => form.reset(defaultValues(saved)),
    });
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.description')}</p>
      </header>

      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.identity.title')}</CardTitle>
            <CardDescription>{t('settings.identity.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="organization-name"
                label={t('settings.field.name')}
                error={form.formState.errors.name?.message}
              >
                <Input
                  id="organization-name"
                  data-testid="settings-name"
                  {...form.register('name')}
                  disabled={update.isPending}
                  maxLength={120}
                />
              </Field>

              <Field
                id="organization-timezone"
                label={t('settings.field.timeZone')}
                hint={t('settings.field.timeZoneHint')}
                error={form.formState.errors.timezone?.message}
              >
                <Input
                  id="organization-timezone"
                  data-testid="settings-time-zone"
                  {...form.register('timezone')}
                  disabled={update.isPending}
                  maxLength={100}
                />
              </Field>

              <Field
                id="organization-currency"
                label={t('settings.field.currency')}
                hint={t('settings.field.currencyHint')}
                error={form.formState.errors.currency?.message}
              >
                <Input
                  id="organization-currency"
                  data-testid="settings-currency"
                  {...form.register('currency')}
                  disabled={update.isPending}
                  maxLength={3}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {update.error ? (
          <div
            role="alert"
            data-testid="settings-failure"
            className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{describeSettingsFailure(update.error, t)}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending} data-testid="settings-save">
            {update.isPending ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                {t('settings.saving')}
              </>
            ) : (
              <>
                <Save aria-hidden className="size-4" />
                {t('settings.save')}
              </>
            )}
          </Button>
          {update.isSuccess ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t('settings.saved')}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describeSettingsFailure(
  error: unknown,
  t: (
    key:
      | 'settings.failure'
      | 'settings.failure.validation'
      | 'settings.failure.forbidden'
      | 'settings.failure.network',
  ) => string,
): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return t('settings.failure.network');
    }
    if (error.code === 'FORBIDDEN') {
      return t('settings.failure.forbidden');
    }
    if (error.code === 'VALIDATION_ERROR') {
      return t('settings.failure.validation');
    }
  }
  return t('settings.failure');
}
