/**
 * Branch sales checkpoints.
 *
 * Thin on purpose: the screen is a feature component, so the route only wires it
 * into the shared shell.
 */

import { createFileRoute } from '@tanstack/react-router';

import { SalesCheckpointPage } from '../features/sales-checkpoints/components/sales-checkpoint-page.js';

export const Route = createFileRoute('/sales-checkpoints')({
  component: SalesCheckpointPage,
});
