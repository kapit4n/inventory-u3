import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@inventory-u3/domain';

export const uuidGenerator: IdGenerator = {
  nextId: () => randomUUID(),
};
