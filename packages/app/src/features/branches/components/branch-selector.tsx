import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@inventory-u3/ui';

import { useTranslation } from '../../../i18n/index.js';
import { useBranches } from '../queries/branches-query.js';

export interface BranchSelectorProps {
  readonly id?: string;
  readonly value?: string;
  readonly onValueChange: (branchId: string) => void;
  readonly includeInactive?: boolean;
  readonly disabled?: boolean;
}

/**
 * The shared branch choice for branch-owned forms.
 *
 * Active branches are the default because an inactive branch should not receive
 * new operational records. The id selected here is only a choice; the API remains
 * the authority on whether the caller may use that branch.
 */
export function BranchSelector({
  id,
  value,
  onValueChange,
  includeInactive = false,
  disabled = false,
}: BranchSelectorProps) {
  const { t } = useTranslation();
  const branchesQuery = useBranches();
  const branches = (branchesQuery.data ?? []).filter(
    (branch) => includeInactive || branch.isActive,
  );

  const placeholder = branchesQuery.isPending
    ? t('branches.selector.loading')
    : branchesQuery.isError
      ? t('branches.selector.failure')
      : branches.length === 0
        ? t('branches.selector.empty')
        : t('branches.selector.placeholder');

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || !branches.length}>
      <SelectTrigger id={id} aria-label={t('branches.selector.label')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
            {branch.isActive ? '' : ` (${t('branches.status.inactive')})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
