import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import type { ProductResponse } from '@inventory-u3/validation';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { ProductPresentationDialog } from './product-presentation-dialog.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const UNIT_ID = '33333333-3333-4333-8333-333333333333';
const PRODUCT_ID = '44444444-4444-4444-8444-444444444444';
const PRESENTATION_ID = '55555555-5555-4555-8555-555555555555';

const PRODUCT: ProductResponse = {
  id: PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: CATEGORY_ID,
  name: 'Watermelon',
  kind: 'PROCESSED',
  inventoryUnitId: UNIT_ID,
  salesUnitId: UNIT_ID,
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

const PRESENTATION = {
  id: PRESENTATION_ID,
  organizationId: ORGANIZATION_ID,
  productId: PRODUCT_ID,
  name: 'Covered tray',
  averageWeightGrams: 500,
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

type FetchMock = Mock<typeof fetch>;

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPresentations(fetchImplementation: typeof fetch) {
  const client = new ApiClient({
    baseUrl: 'http://api.test/api/v1',
    fetchImplementation,
  });

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApiClientProvider baseUrl="http://api.test/api/v1" client={client}>
        <ProductPresentationDialog open onOpenChange={() => undefined} product={PRODUCT} />
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function presentationApiMock(initial: (typeof PRESENTATION)[]): FetchMock {
  const presentations = [...initial];

  return vi.fn<typeof fetch>(async (input, init) => {
    const path = new URL(String(input)).pathname;

    if (init?.method === 'POST' && path.endsWith(`/products/${PRODUCT_ID}/presentations`)) {
      const body = JSON.parse(String(init.body)) as {
        name: string;
        averageWeightGrams: number;
        isActive?: boolean;
      };
      const created = {
        ...PRESENTATION,
        ...body,
        id: '66666666-6666-4666-8666-666666666666',
        isActive: body.isActive ?? true,
      };
      presentations.push(created);
      return jsonResponse(created, 201);
    }

    if (init?.method === 'PUT' && path.includes('/presentations/')) {
      const body = JSON.parse(String(init.body)) as {
        name: string;
        averageWeightGrams: number;
        isActive: boolean;
      };
      const updated = {
        ...PRESENTATION,
        ...body,
        updatedAt: '2026-11-09T13:00:00.000Z',
      };
      presentations[0] = updated;
      return jsonResponse(updated);
    }

    return jsonResponse({ items: presentations });
  });
}

async function selectOption(testId: string, optionName: string) {
  fireEvent.pointerDown(screen.getByTestId(testId), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('ProductPresentationDialog', () => {
  it('lists presentations and creates one with its average weight', async () => {
    const fetchImplementation = presentationApiMock([]);
    renderPresentations(fetchImplementation);

    expect(await screen.findByText('No presentations yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('product-presentation-new'));
    fireEvent.change(screen.getByTestId('product-presentation-name'), {
      target: { value: 'Open tray' },
    });
    fireEvent.change(screen.getByTestId('product-presentation-weight'), {
      target: { value: '700' },
    });
    fireEvent.click(screen.getByTestId('product-presentation-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/products/${PRODUCT_ID}/presentations`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Open tray',
            averageWeightGrams: 700,
            isActive: true,
          }),
        }),
      );
    });

    expect(await screen.findByText('Open tray')).toBeInTheDocument();
    expect(screen.getByText('700 g')).toBeInTheDocument();
  });

  it('edits a presentation weight and active state', async () => {
    const fetchImplementation = presentationApiMock([PRESENTATION]);
    renderPresentations(fetchImplementation);

    fireEvent.click(await screen.findByRole('button', { name: /edit covered tray/i }));
    fireEvent.change(screen.getByTestId('product-presentation-weight'), {
      target: { value: '750' },
    });
    await selectOption('product-presentation-status', 'Inactive');
    fireEvent.click(screen.getByTestId('product-presentation-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/products/${PRODUCT_ID}/presentations/${PRESENTATION_ID}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Covered tray',
            averageWeightGrams: 750,
            isActive: false,
          }),
        }),
      );
    });

    expect(await screen.findByText('750 g')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
