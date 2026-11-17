import {
  DomainError,
  notFound,
  reopenDailyClosing,
  type Clock,
  type DailyClosing,
  type IdGenerator,
  type OrganizationRepository,
  type UnitOfWork,
} from '@inventory-u3/domain';
import type { DailyClosingId, OrganizationId, UserId } from '@inventory-u3/types';

import { createClosingSnapshot } from './daily-closing-snapshot.js';

export interface ReopenDailyClosingCommand {
  readonly organizationId: OrganizationId;
  readonly dailyClosingId: DailyClosingId;
  readonly reopenedByUserId: UserId;
  readonly reason: string;
}

export interface ReopenDailyClosingDependencies {
  readonly organizations: OrganizationRepository;
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function reopenDailyClosingUseCase(
  command: ReopenDailyClosingCommand,
  dependencies: ReopenDailyClosingDependencies,
): Promise<DailyClosing> {
  return dependencies.unitOfWork.transaction(async (repositories) => {
    const closing = await repositories.dailyClosings.findById(
      command.organizationId,
      command.dailyClosingId,
    );
    if (!closing) {
      throw notFound('DailyClosing', command.dailyClosingId);
    }

    const reopening = {
      reopenedByUserId: command.reopenedByUserId,
      reopenedAt: dependencies.clock.now(),
      reason: command.reason,
    };
    reopenDailyClosing(closing, reopening);

    const reopened = await repositories.dailyClosings.markReopened(
      command.organizationId,
      closing.id,
      reopening,
    );
    if (!reopened) {
      throw new DomainError('INVALID_STATE', 'The daily closing is no longer confirmed');
    }

    const next = await createClosingSnapshot(
      {
        organizationId: closing.organizationId,
        branchId: closing.branchId,
        businessDate: closing.businessDate,
        version: closing.version + 1,
        previousClosingId: closing.id,
        createdByUserId: command.reopenedByUserId,
      },
      {
        dailyClosings: repositories.dailyClosings,
        organizations: repositories.organizations,
        clock: dependencies.clock,
        ids: dependencies.ids,
      },
    );

    return repositories.dailyClosings.create(next);
  });
}
