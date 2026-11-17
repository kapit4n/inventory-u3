import {
  confirmDailyClosing,
  DomainError,
  notFound,
  type Clock,
  type DailyClosing,
  type UnitOfWork,
} from '@inventory-u3/domain';
import type { DailyClosingId, OrganizationId, UserId } from '@inventory-u3/types';

export interface ConfirmDailyClosingCommand {
  readonly organizationId: OrganizationId;
  readonly dailyClosingId: DailyClosingId;
  readonly confirmedByUserId: UserId;
}

export interface ConfirmDailyClosingDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
}

export async function confirmDailyClosingUseCase(
  command: ConfirmDailyClosingCommand,
  { unitOfWork, clock }: ConfirmDailyClosingDependencies,
): Promise<DailyClosing> {
  return unitOfWork.transaction(async (repositories) => {
    const closing = await repositories.dailyClosings.findById(
      command.organizationId,
      command.dailyClosingId,
    );
    if (!closing) {
      throw notFound('DailyClosing', command.dailyClosingId);
    }

    const confirmation = { confirmedByUserId: command.confirmedByUserId, confirmedAt: clock.now() };
    confirmDailyClosing(closing, confirmation);
    const saved = await repositories.dailyClosings.markConfirmed(
      command.organizationId,
      closing.id,
      confirmation,
    );
    if (!saved) {
      throw new DomainError('INVALID_STATE', 'The daily closing can no longer be confirmed');
    }
    return saved;
  });
}
