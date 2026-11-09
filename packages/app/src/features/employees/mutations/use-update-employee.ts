import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEmployee } from '@inventory-u3/api-client';
import type { UpdateEmployeeBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { employeesQueryKey } from '../queries/employees-query.js';

export function useUpdateEmployee() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, body }: { employeeId: string; body: UpdateEmployeeBody }) =>
      updateEmployee(client, employeeId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: employeesQueryKey }),
  });
}
