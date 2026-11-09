import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee } from '@inventory-u3/api-client';
import type { CreateEmployeeBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { employeesQueryKey } from '../queries/employees-query.js';

export function useCreateEmployee() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEmployeeBody) => createEmployee(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeesQueryKey }),
  });
}
