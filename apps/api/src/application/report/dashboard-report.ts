import {
  buildReport,
  dayBounds,
  notFound,
  type OrganizationRepository,
  type Report,
  type ReportGranularity,
  type ReportRepository,
} from '@inventory-u3/domain';
import type { BranchId, IsoDate, OrganizationId } from '@inventory-u3/types';

export interface DashboardReportDependencies {
  readonly reports: ReportRepository;
  readonly organizations: OrganizationRepository;
}

export interface DashboardReportQuery {
  readonly organizationId: OrganizationId;
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly granularity: ReportGranularity;
  readonly branchId?: BranchId;
}

export async function buildDashboardReport(
  query: DashboardReportQuery,
  { reports, organizations }: DashboardReportDependencies,
): Promise<Report> {
  const organization = await organizations.findById(query.organizationId);
  if (!organization) {
    throw notFound('Organization', query.organizationId);
  }

  const fromBounds = dayBounds(query.from, organization.timezone);
  const toBounds = dayBounds(query.to, organization.timezone);
  const source = await reports.readSources(
    query.organizationId,
    query,
    fromBounds.startsAt,
    toBounds.endsAt,
  );

  return buildReport(source, {
    from: query.from,
    to: query.to,
    granularity: query.granularity,
    timezone: organization.timezone,
    currency: organization.currency,
    ...(query.branchId === undefined ? {} : { branchId: query.branchId }),
  });
}
