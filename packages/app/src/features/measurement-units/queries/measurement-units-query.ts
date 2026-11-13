import { useQuery } from '@tanstack/react-query';
import { listMeasurementUnits } from '@inventory-u3/api-client';

import { useApiClient } from '../../../query/api-client-provider.js';

export const measurementUnitsQueryKey = ['measurement-units'] as const;

export function useMeasurementUnits() {
  const client = useApiClient();

  return useQuery({
    queryKey: measurementUnitsQueryKey,
    queryFn: () => listMeasurementUnits(client),
  });
}
