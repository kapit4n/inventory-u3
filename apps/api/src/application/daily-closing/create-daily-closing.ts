import {
  DomainError,
  notFound,
  type Clock,
  type DailyClosing,
  type BranchRepository,
  type IdGenerator,
  type OrganizationRepository,
  type UnitOfWork,
} from '@inventory-u3/domain';
import type { BranchId, IsoDate, UserId, OrganizationId } from '@inventory-u3/types';

import { createClosingSnapshot } from './daily-closing-snapshot.js';

export interface CreateDailyClosingCommand {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly createdByUserId: UserId;
}

export interface CreateDailyClosingDependencies {
  readonly branches: BranchRepository;
  readonly organizations: OrganizationRepository;
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function createDailyClosingUseCase(
  command: CreateDailyClosingCommand,
  dependencies: CreateDailyClosingDependencies,
): Promise<DailyClosing> {
  return dependencies.unitOfWork.transaction(async (repositories) => {
    const branch = await repositories.branches.findById(command.organizationId, command.branchId);
    if (!branch) {
      throw notFound('Branch', command.branchId);
    }
    if (!branch.isActive) {
      throw new DomainError('INVALID_INPUT', 'A daily closing requires an active branch');
    }

    const current = await repositories.dailyClosings.findCurrent(
      command.organizationId,
      command.branchId,
      command.businessDate,
    );
    if (current && current.status !== 'REOPENED') {
      throw new DomainError(
        'DUPLICATED_RECORD',
        'A daily closing already exists for this branch and business date',
        { dailyClosingId: current.id },
      );
    }

    const closing = await createClosingSnapshot(
      {
        organizationId: command.organizationId,
        branchId: command.branchId,
        businessDate: command.businessDate,
        version: current === undefined ? 1 : current.version + 1,
        createdByUserId: command.createdByUserId,
      },
      {
        dailyClosings: repositories.dailyClosings,
        organizations: repositories.organizations,
        clock: dependencies.clock,
        ids: dependencies.ids,
      },
    );

    return repositories.dailyClosings.create(closing);
  });
}
