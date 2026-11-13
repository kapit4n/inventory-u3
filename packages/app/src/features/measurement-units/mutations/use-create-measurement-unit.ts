import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMeasurementUnit } from '@inventory-u3/api-client';
import type { CreateMeasurementUnitBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { measurementUnitsQueryKey } from '../queries/measurement-units-query.js';

export function useCreateMeasurementUnit() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateMeasurementUnitBody) => createMeasurementUnit(client, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: measurementUnitsQueryKey }),
  });
}
