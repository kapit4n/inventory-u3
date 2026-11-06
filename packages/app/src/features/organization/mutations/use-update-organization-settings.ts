import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Organization } from '@inventory-u3/domain';
import type { UpdateOrganizationSettingsBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { organizationSettingsQueryKey } from '../queries/organization-settings-query.js';

export function useUpdateOrganizationSettings() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateOrganizationSettingsBody) =>
      client.put<Organization, UpdateOrganizationSettingsBody>('/organization', settings),
    onSuccess: (organization) => {
      queryClient.setQueryData(organizationSettingsQueryKey, organization);
    },
  });
}
