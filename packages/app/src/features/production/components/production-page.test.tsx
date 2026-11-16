import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { todayIsoDate } from '../../products/price-format.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { ProductionPage } from './production-page.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const RAW_PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const PROCESSED_PRODUCT_ID = '66666666-6666-4666-8666-666666666666';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const PRESENTATION_ID = '88888888-8888-4888-8888-888888888888';
const BATCH_ID = '99999999-9999-4999-8999-999999999999';
const NOW = '2026-10-05T12:00:00.000Z';

const BRANCH = {
  id: BRANCH_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Mercado Central',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const EMPLOYEE = {
  id: EMPLOYEE_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  fullName: 'Lucía Fernández',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const UNIT = {
  id: UNIT_ID,
  organizationId: ORGANIZATION_ID,
  code: 'kg',
  name: 'Kilogramo',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const RAW_PRODUCT = {
  id: RAW_PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Manzana Red Delicious',
  kind: 'RAW',
  inventoryUnitId: UNIT_ID,
  salesUnitId: UNIT_ID,
  purchaseUnitId: UNIT_ID,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const PROCESSED_PRODUCT = {
  ...RAW_PRODUCT,
  id: PROCESSED_PRODUCT_ID,
  name: 'Ensalada de frutas',
  kind: 'PROCESSED',
  productionUnitId: UNIT_ID,
};

const PRESENTATION = {
  id: PRESENTATION_ID,
  organizationId: ORGANIZATION_ID,
  productId: PROCESSED_PRODUCT_ID,
  name: 'Bandeja 500 g',
  averageWeightGrams: 500,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

type FetchMock = Mock<typeof fetch>;

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.localStorage.clear();
});

function storeSession(): void {
  window.localStorage.setItem(
    'inventory-u3-session',
    JSON.stringify({
      token: 'token-123',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      user: {
        id: USER_ID,
        organizationId: ORGANIZATION_ID,
        email: 'admin@inventory.test',
        fullName: 'Ada Administrator',
        role: 'ADMINISTRATOR',
        isActive: true,
      },
    }),
  );
}

function renderProduction(fetchImplementation: typeof fetch) {
  storeSession();
  const client = new ApiClient({
    baseUrl: 'http://api.test/api/v1',
    fetchImplementation,
  });

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApiClientProvider baseUrl="http://api.test/api/v1" client={client}>
        <SessionProvider>
          <ProductionPage />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function batchFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: BATCH_ID,
    organizationId: ORGANIZATION_ID,
    branchId: BRANCH_ID,
    businessDate: '2026-10-05',
    preparedByEmployeeId: EMPLOYEE_ID,
    registeredByUserId: USER_ID,
    status: 'DRAFT',
    note: 'Morning trays',
    createdAt: NOW,
    updatedAt: NOW,
    inputs: [
      {
        id: 'aaaaaaaa-1111-4111-8111-111111111111',
        organizationId: ORGANIZATION_ID,
        batchId: BATCH_ID,
        productId: RAW_PRODUCT_ID,
        unitId: UNIT_ID,
        quantityMilli: 1_200,
        position: 1,
        createdAt: NOW,
      },
    ],
    outputs: [
      {
        id: 'aaaaaaaa-2222-4222-8222-222222222222',
        organizationId: ORGANIZATION_ID,
        batchId: BATCH_ID,
        productId: PROCESSED_PRODUCT_ID,
        presentationId: PRESENTATION_ID,
        trayCount: 2,
        averageWeightPerTrayGrams: 500,
        estimatedWeightGrams: 1_000,
        weightBasis: 'ESTIMATED',
        position: 1,
        createdAt: NOW,
      },
    ],
    waste: [],
    ...overrides,
  };
}

function productionApiMock(): FetchMock {
  let batches: Array<Record<string, unknown>> = [];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/organization')) {
      return json({
        id: ORGANIZATION_ID,
        name: 'Inventory Test',
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    if (url.endsWith('/branches')) {
      return json({ items: [BRANCH] });
    }
    if (url.endsWith('/employees')) {
      return json({ items: [EMPLOYEE] });
    }
    if (url.endsWith(`/products/${PROCESSED_PRODUCT_ID}/presentations`)) {
      return json({ items: [PRESENTATION] });
    }
    if (url.endsWith('/products')) {
      return json({ items: [RAW_PRODUCT, PROCESSED_PRODUCT] });
    }
    if (url.endsWith('/measurement-units')) {
      return json({ items: [UNIT] });
    }
    if (method === 'POST' && url.endsWith('/production')) {
      const body = JSON.parse(String(init?.body)) as {
        branchId: string;
        businessDate: string;
        preparedByEmployeeId: string;
        note?: string;
        inputs: Array<{ productId: string; quantityMilli: number }>;
        outputs: Array<{
          productId: string;
          presentationId: string;
          trayCount: number;
          measuredWeightGrams?: number;
        }>;
        waste: Array<{ productId: string; quantityMilli: number; reason: string }>;
      };
      const batch = batchFixture({
        ...body,
        inputs: body.inputs.map((line, index) => ({
          id: `bbbbbbbb-1111-4111-8111-00000000000${index}`,
          organizationId: ORGANIZATION_ID,
          batchId: BATCH_ID,
          ...line,
          unitId: UNIT_ID,
          position: index + 1,
          createdAt: NOW,
        })),
        outputs: body.outputs.map((line, index) => ({
          id: `bbbbbbbb-2222-4222-8222-00000000000${index}`,
          organizationId: ORGANIZATION_ID,
          batchId: BATCH_ID,
          ...line,
          averageWeightPerTrayGrams: 500,
          estimatedWeightGrams: line.trayCount * 500,
          weightBasis: line.measuredWeightGrams === undefined ? 'ESTIMATED' : 'MEASURED',
          position: index + 1,
          createdAt: NOW,
        })),
        waste: [],
      });
      batches = [batch, ...batches];
      return json(batch, 201);
    }
    if (method === 'POST' && url.endsWith(`/production/${BATCH_ID}/confirm`)) {
      batches = batches.map((batch) =>
        batch.id === BATCH_ID
          ? {
              ...batch,
              status: 'CONFIRMED',
              confirmedByUserId: USER_ID,
              confirmedAt: NOW,
              updatedAt: NOW,
            }
          : batch,
      );
      return json(batches[0]);
    }
    if (method === 'POST' && url.endsWith(`/production/${BATCH_ID}/correct`)) {
      const body = JSON.parse(String(init?.body)) as { reason: string };
      batches = batches.map((batch) =>
        batch.id === BATCH_ID
          ? {
              ...batch,
              status: 'CORRECTED',
              correctedByUserId: USER_ID,
              correctedAt: NOW,
              correctionReason: body.reason.trim(),
              updatedAt: NOW,
            }
          : batch,
      );
      return json(batches[0]);
    }
    if (method === 'DELETE' && url.endsWith(`/production/${BATCH_ID}`)) {
      batches = batches.filter((batch) => batch.id !== BATCH_ID);
      return new Response(null, { status: 204 });
    }
    if (url.includes('/production') && !url.includes('/production/')) {
      const branchId = new URL(url).searchParams.get('branchId');
      return json({
        items: branchId === null ? batches : batches.filter((batch) => batch.branchId === branchId),
      });
    }

    return json({}, 404);
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function chooseOption(trigger: HTMLElement, optionName: string): Promise<void> {
  fireEvent.pointerDown(trigger, {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
  fireEvent.click(
    await screen.findByRole('option', {
      name: new RegExp(optionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    }),
  );
  await waitFor(() => {
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
}

describe('ProductionPage', () => {
  it('creates a draft, confirms it and corrects it with an audit reason', async () => {
    const fetchImplementation = productionApiMock();
    renderProduction(fetchImplementation);

    expect(await screen.findByText('No production batches yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('production-new'));
    await chooseOption(document.getElementById('production-branch')!, 'Mercado Central');
    await chooseOption(screen.getByTestId('production-preparer'), 'Lucía Fernández');
    await chooseOption(screen.getByTestId('production-output-product-0'), 'Ensalada de frutas');
    await waitFor(() =>
      expect(screen.getByTestId('production-output-presentation-0')).not.toBeDisabled(),
    );
    await chooseOption(screen.getByTestId('production-output-presentation-0'), 'Bandeja 500 g');
    fireEvent.change(screen.getByTestId('production-output-trays-0'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByTestId('production-note'), {
      target: { value: 'Morning trays' },
    });
    fireEvent.click(screen.getByTestId('production-create'));

    await waitFor(() => {
      const post = fetchImplementation.mock.calls.find(
        ([url, init]) =>
          String(url) === 'http://api.test/api/v1/production' && init?.method === 'POST',
      );
      expect(post).toBeDefined();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        branchId: BRANCH_ID,
        businessDate: todayIsoDate(),
        preparedByEmployeeId: EMPLOYEE_ID,
        note: 'Morning trays',
        inputs: [],
        outputs: [
          {
            productId: PROCESSED_PRODUCT_ID,
            presentationId: PRESENTATION_ID,
            trayCount: 2,
          },
        ],
        waste: [],
      });
    });

    expect(await screen.findByText('Draft')).toBeInTheDocument();
    expect(screen.getByTestId(`production-row-${BATCH_ID}`)).toHaveTextContent('2 · 1.000 kg');

    fireEvent.click(screen.getByTestId(`production-confirm-${BATCH_ID}`));
    expect(await screen.findByText('Confirmed')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/production/${BATCH_ID}/confirm`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    fireEvent.click(screen.getByTestId(`production-correct-${BATCH_ID}`));
    fireEvent.change(screen.getByTestId('production-correction-reason'), {
      target: { value: 'Trays were mislabelled' },
    });
    fireEvent.click(screen.getByTestId('production-correction-save'));

    expect(await screen.findByText('Corrected')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/production/${BATCH_ID}/correct`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Trays were mislabelled' }),
        }),
      );
    });
  });

  it('discards a draft', async () => {
    const fetchImplementation = productionApiMock();
    renderProduction(fetchImplementation);

    fireEvent.click(await screen.findByTestId('production-new'));
    await chooseOption(document.getElementById('production-branch')!, 'Mercado Central');
    await chooseOption(screen.getByTestId('production-preparer'), 'Lucía Fernández');
    await chooseOption(screen.getByTestId('production-output-product-0'), 'Ensalada de frutas');
    await waitFor(() =>
      expect(screen.getByTestId('production-output-presentation-0')).not.toBeDisabled(),
    );
    await chooseOption(screen.getByTestId('production-output-presentation-0'), 'Bandeja 500 g');
    fireEvent.change(screen.getByTestId('production-output-trays-0'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByTestId('production-create'));

    expect(await screen.findByText('Draft')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`production-discard-${BATCH_ID}`));
    fireEvent.click(screen.getByTestId('production-discard-confirm'));

    expect(await screen.findByText('No production batches yet.')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/production/${BATCH_ID}`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('requires a branch and preparer before sending the batch', async () => {
    const fetchImplementation = productionApiMock();
    renderProduction(fetchImplementation);

    fireEvent.click(await screen.findByTestId('production-new'));
    fireEvent.click(screen.getByTestId('production-create'));

    expect(
      await screen.findByText('Choose the branch where the batch was prepared.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Choose the employee who prepared the batch.')).toBeInTheDocument();
    expect(fetchImplementation).not.toHaveBeenCalledWith(
      'http://api.test/api/v1/production',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
