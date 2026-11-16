/**
 * Branch production.
 *
 * Thin on purpose: the screen is a feature component, so the route only wires it
 * into the shared shell.
 */

import { createFileRoute } from '@tanstack/react-router';

import { ProductionPage } from '../features/production/components/production-page.js';

export const Route = createFileRoute('/production')({
  component: ProductionPage,
});
