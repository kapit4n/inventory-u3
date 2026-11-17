import { createFileRoute } from '@tanstack/react-router';

import { DashboardPage } from '../features/dashboard/components/dashboard-page.js';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});
