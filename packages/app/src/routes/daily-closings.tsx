/**
 * Branch daily closings.
 *
 * The route only wires the feature screen into the shared shell.
 */

import { createFileRoute } from '@tanstack/react-router';

import { DailyClosingPage } from '../features/daily-closings/components/daily-closing-page.js';

export const Route = createFileRoute('/daily-closings')({
  component: DailyClosingPage,
});
