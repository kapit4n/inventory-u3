import {
  DomainError,
  notFound,
  reviewDailyClosing,
  type Clock,
  type DailyClosing,
  type UnitOfWork,
} from '@inventory-u3/domain';
import type { DailyClosingId, OrganizationId, UserId } from '@inventory-u3/types';

export interface ReviewDailyClosingCommand {
  readonly organizationId: OrganizationId;
  readonly dailyClosingId: DailyClosingId;
  readonly reviewedByUserId: UserId;
}

export interface ReviewDailyClosingDependencies {
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
}

export async function reviewDailyClosingUseCase(
  command: ReviewDailyClosingCommand,
  { unitOfWork, clock }: ReviewDailyClosingDependencies,
): Promise<DailyClosing> {
  return unitOfWork.transaction(async (repositories) => {
    const closing = await repositories.dailyClosings.findById(
      command.organizationId,
      command.dailyClosingId,
    );
    if (!closing) {
      throw notFound('DailyClosing', command.dailyClosingId);
    }

    const review = { reviewedByUserId: command.reviewedByUserId, reviewedAt: clock.now() };
    reviewDailyClosing(closing, review);
    const saved = await repositories.dailyClosings.markReviewed(
      command.organizationId,
      closing.id,
      review,
    );
    if (!saved) {
      throw new DomainError('INVALID_STATE', 'The daily closing is no longer a draft');
    }
    return saved;
  });
}
