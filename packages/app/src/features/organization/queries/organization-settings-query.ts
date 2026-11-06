import { useQuery } from '@tanstack/react-query';
import type { Organization } from '@inventory-u3/domain';

import { useApiClient } from '../../../query/api-client-provider.js';

export const organizationSettingsQueryKey = ['organization', 'settings'] as const;

export function useOrganizationSettings() {
  const client = useApiClient();

  return useQuery({
    queryKey: organizationSettingsQueryKey,
    queryFn: () => client.get<Organization>('/organization'),
  });
}
