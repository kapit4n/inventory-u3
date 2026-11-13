import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMeasurementUnit } from '@inventory-u3/api-client';
import type { UpdateMeasurementUnitBody } from '@inventory-u3/validation';

import { useApiClient } from '../../../query/api-client-provider.js';
import { measurementUnitsQueryKey } from '../queries/measurement-units-query.js';

export function useUpdateMeasurementUnit() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      measurementUnitId,
      body,
    }: {
      measurementUnitId: string;
      body: UpdateMeasurementUnitBody;
    }) => updateMeasurementUnit(client, measurementUnitId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: measurementUnitsQueryKey }),
  });
}
