/**
 * Supplier purchases.
 *
 * Thin on purpose: the screen is a feature component, so it can be tested with a
 * stub API client and the route only wires it into the shared shell.
 */

import { createFileRoute } from '@tanstack/react-router';

import { PurchasesPage } from '../features/purchases/components/purchases-page.js';

export const Route = createFileRoute('/purchases')({
  component: PurchasesPage,
});
