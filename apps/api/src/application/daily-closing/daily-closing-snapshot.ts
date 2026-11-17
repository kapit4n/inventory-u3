import {
  createDailyClosing,
  dayBounds,
  notFound,
  type Clock,
  type DailyClosing,
  type DailyClosingRepository,
  type IdGenerator,
  type OrganizationRepository,
} from '@inventory-u3/domain';
import {
  asDailyClosingId,
  type BranchId,
  type IsoDate,
  type OrganizationId,
  type UserId,
} from '@inventory-u3/types';

export interface SnapshotDependencies {
  readonly dailyClosings: DailyClosingRepository;
  readonly organizations: OrganizationRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export interface SnapshotCommand {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly version: number;
  readonly previousClosingId?: DailyClosing['id'];
  readonly createdByUserId: UserId;
}

export async function createClosingSnapshot(
  command: SnapshotCommand,
  { dailyClosings, organizations, clock, ids }: SnapshotDependencies,
): Promise<DailyClosing> {
  const organization = await organizations.findById(command.organizationId);
  if (!organization) {
    throw notFound('Organization', command.organizationId);
  }

  const bounds = dayBounds(command.businessDate, organization.timezone);
  const sources = await dailyClosings.readSources(
    command.organizationId,
    command.branchId,
    command.businessDate,
    bounds.startsAt,
    bounds.endsAt,
  );

  return createDailyClosing(
    {
      id: asDailyClosingId(ids.nextId()),
      organizationId: command.organizationId,
      branchId: command.branchId,
      businessDate: command.businessDate,
      version: command.version,
      ...(command.previousClosingId === undefined
        ? {}
        : { previousClosingId: command.previousClosingId }),
      currency: organization.currency,
      createdByUserId: command.createdByUserId,
      sources,
    },
    clock.now(),
  );
}
