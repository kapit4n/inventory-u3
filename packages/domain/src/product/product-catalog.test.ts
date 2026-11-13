import { describe, expect, it } from 'vitest';

import {
  asMeasurementUnitId,
  asOrganizationId,
  asProductCategoryId,
  asProductId,
  asProductPresentationId,
} from '@inventory-u3/types';

import {
  MEASUREMENT_UNIT_CODE_MAX_LENGTH,
  createMeasurementUnit,
  updateMeasurementUnit,
} from './measurement-unit.js';
import {
  PRODUCT_CATEGORY_NAME_MAX_LENGTH,
  createProductCategory,
  updateProductCategory,
} from './product-category.js';
import {
  PRODUCT_PRESENTATION_NAME_MAX_LENGTH,
  createProductPresentation,
  updateProductPresentation,
} from './product-presentation.js';
import { PRODUCT_NAME_MAX_LENGTH, createProduct } from './product.js';

const NOW = '2026-11-09T12:00:00.000Z';
const LATER = '2026-11-09T13:00:00.000Z';
const ORGANIZATION_ID = asOrganizationId('11111111-1111-4111-8111-111111111111');
const CATEGORY_ID = asProductCategoryId('22222222-2222-4222-8222-222222222222');
const PRODUCT_ID = asProductId('33333333-3333-4333-8333-333333333333');
const PRESENTATION_ID = asProductPresentationId('44444444-4444-4444-8444-444444444444');
const KILOGRAM_ID = asMeasurementUnitId('55555555-5555-4555-8555-555555555555');
const TRAY_ID = asMeasurementUnitId('66666666-6666-4666-8666-666666666666');

describe('createMeasurementUnit', () => {
  it('creates an active unit with trimmed code and name', () => {
    const unit = createMeasurementUnit(
      {
        id: KILOGRAM_ID,
        organizationId: ORGANIZATION_ID,
        code: '  kg  ',
        name: '  Kilogram  ',
      },
      NOW,
    );

    expect(unit).toEqual({
      id: KILOGRAM_ID,
      organizationId: ORGANIZATION_ID,
      code: 'kg',
      name: 'Kilogram',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('rejects missing or oversized unit codes and names', () => {
    expect(() =>
      createMeasurementUnit(
        { id: KILOGRAM_ID, organizationId: ORGANIZATION_ID, code: ' ', name: 'Kilogram' },
        NOW,
      ),
    ).toThrowError('Measurement unit code must be between 1 and 32 characters');

    expect(() =>
      createMeasurementUnit(
        {
          id: KILOGRAM_ID,
          organizationId: ORGANIZATION_ID,
          code: 'k'.repeat(MEASUREMENT_UNIT_CODE_MAX_LENGTH + 1),
          name: 'Kilogram',
        },
        NOW,
      ),
    ).toThrowError('Measurement unit code must be between 1 and 32 characters');

    expect(() =>
      createMeasurementUnit(
        { id: KILOGRAM_ID, organizationId: ORGANIZATION_ID, code: 'kg', name: ' ' },
        NOW,
      ),
    ).toThrowError('Measurement unit name must be between 1 and 80 characters');
  });
});

describe('updateMeasurementUnit', () => {
  it('updates the editable fields and leaves identity and creation time intact', () => {
    const unit = createMeasurementUnit(
      {
        id: KILOGRAM_ID,
        organizationId: ORGANIZATION_ID,
        code: 'kg',
        name: 'Kilogram',
      },
      NOW,
    );

    expect(
      updateMeasurementUnit(
        unit,
        { code: '  kilos  ', name: '  Kilograms  ', isActive: false },
        LATER,
      ),
    ).toEqual({
      ...unit,
      code: 'kilos',
      name: 'Kilograms',
      isActive: false,
      updatedAt: LATER,
    });
  });

  it('rejects invalid edited codes and names', () => {
    const unit = createMeasurementUnit(
      {
        id: KILOGRAM_ID,
        organizationId: ORGANIZATION_ID,
        code: 'kg',
        name: 'Kilogram',
      },
      NOW,
    );

    expect(() =>
      updateMeasurementUnit(unit, { code: ' ', name: 'Kilogram', isActive: true }, LATER),
    ).toThrowError('Measurement unit code must be between 1 and 32 characters');
    expect(() =>
      updateMeasurementUnit(unit, { code: 'kg', name: ' ', isActive: true }, LATER),
    ).toThrowError('Measurement unit name must be between 1 and 80 characters');
  });
});

describe('createProductCategory', () => {
  it('creates an active category with a trimmed name', () => {
    const category = createProductCategory(
      {
        id: CATEGORY_ID,
        organizationId: ORGANIZATION_ID,
        name: '  Fruit  ',
      },
      NOW,
    );

    expect(category).toEqual({
      id: CATEGORY_ID,
      organizationId: ORGANIZATION_ID,
      name: 'Fruit',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('rejects an empty or oversized category name', () => {
    expect(() =>
      createProductCategory({ id: CATEGORY_ID, organizationId: ORGANIZATION_ID, name: ' ' }, NOW),
    ).toThrowError('Product category name must be between 1 and 120 characters');

    expect(() =>
      createProductCategory(
        {
          id: CATEGORY_ID,
          organizationId: ORGANIZATION_ID,
          name: 'c'.repeat(PRODUCT_CATEGORY_NAME_MAX_LENGTH + 1),
        },
        NOW,
      ),
    ).toThrowError('Product category name must be between 1 and 120 characters');
  });
});

describe('updateProductCategory', () => {
  it('updates the editable fields and leaves identity and creation time intact', () => {
    const category = createProductCategory(
      {
        id: CATEGORY_ID,
        organizationId: ORGANIZATION_ID,
        name: 'Fruit',
      },
      NOW,
    );

    expect(
      updateProductCategory(category, { name: '  Fresh fruit  ', isActive: false }, LATER),
    ).toEqual({
      ...category,
      name: 'Fresh fruit',
      isActive: false,
      updatedAt: LATER,
    });
  });

  it('rejects an invalid edited name', () => {
    const category = createProductCategory(
      {
        id: CATEGORY_ID,
        organizationId: ORGANIZATION_ID,
        name: 'Fruit',
      },
      NOW,
    );

    expect(() =>
      updateProductCategory(category, { name: ' ', isActive: true }, LATER),
    ).toThrowError('Product category name must be between 1 and 120 characters');
  });
});

describe('createProduct', () => {
  it('creates an active product with its category and explicit units', () => {
    const product = createProduct(
      {
        id: PRODUCT_ID,
        organizationId: ORGANIZATION_ID,
        categoryId: CATEGORY_ID,
        name: '  Watermelon  ',
        kind: 'PROCESSED',
        inventoryUnitId: KILOGRAM_ID,
        salesUnitId: KILOGRAM_ID,
        purchaseUnitId: KILOGRAM_ID,
        productionUnitId: TRAY_ID,
      },
      NOW,
    );

    expect(product).toEqual({
      id: PRODUCT_ID,
      organizationId: ORGANIZATION_ID,
      categoryId: CATEGORY_ID,
      name: 'Watermelon',
      kind: 'PROCESSED',
      inventoryUnitId: KILOGRAM_ID,
      salesUnitId: KILOGRAM_ID,
      purchaseUnitId: KILOGRAM_ID,
      productionUnitId: TRAY_ID,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('keeps purchase and production units optional', () => {
    const product = createProduct(
      {
        id: PRODUCT_ID,
        organizationId: ORGANIZATION_ID,
        categoryId: CATEGORY_ID,
        name: 'Bananas',
        kind: 'RAW',
        inventoryUnitId: KILOGRAM_ID,
        salesUnitId: KILOGRAM_ID,
      },
      NOW,
    );

    expect(product.purchaseUnitId).toBeUndefined();
    expect(product.productionUnitId).toBeUndefined();
  });

  it('rejects an empty or oversized product name', () => {
    expect(() =>
      createProduct(
        {
          id: PRODUCT_ID,
          organizationId: ORGANIZATION_ID,
          categoryId: CATEGORY_ID,
          name: ' ',
          kind: 'RAW',
          inventoryUnitId: KILOGRAM_ID,
          salesUnitId: KILOGRAM_ID,
        },
        NOW,
      ),
    ).toThrowError('Product name must be between 1 and 160 characters');

    expect(() =>
      createProduct(
        {
          id: PRODUCT_ID,
          organizationId: ORGANIZATION_ID,
          categoryId: CATEGORY_ID,
          name: 'p'.repeat(PRODUCT_NAME_MAX_LENGTH + 1),
          kind: 'RAW',
          inventoryUnitId: KILOGRAM_ID,
          salesUnitId: KILOGRAM_ID,
        },
        NOW,
      ),
    ).toThrowError('Product name must be between 1 and 160 characters');
  });

  it('rejects an unknown product kind', () => {
    expect(() =>
      createProduct(
        {
          id: PRODUCT_ID,
          organizationId: ORGANIZATION_ID,
          categoryId: CATEGORY_ID,
          name: 'Watermelon',
          kind: 'FROZEN' as never,
          inventoryUnitId: KILOGRAM_ID,
          salesUnitId: KILOGRAM_ID,
        },
        NOW,
      ),
    ).toThrowError('Product kind must be RAW or PROCESSED');
  });
});

describe('createProductPresentation', () => {
  it('creates an active presentation with a trimmed name', () => {
    const presentation = createProductPresentation(
      {
        id: PRESENTATION_ID,
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: '  Covered tray  ',
        averageWeightGrams: 500,
      },
      NOW,
    );

    expect(presentation).toEqual({
      id: PRESENTATION_ID,
      organizationId: ORGANIZATION_ID,
      productId: PRODUCT_ID,
      name: 'Covered tray',
      averageWeightGrams: 500,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('rejects an empty or oversized presentation name', () => {
    expect(() =>
      createProductPresentation(
        {
          id: PRESENTATION_ID,
          organizationId: ORGANIZATION_ID,
          productId: PRODUCT_ID,
          name: ' ',
          averageWeightGrams: 500,
        },
        NOW,
      ),
    ).toThrowError('Product presentation name must be between 1 and 120 characters');

    expect(() =>
      createProductPresentation(
        {
          id: PRESENTATION_ID,
          organizationId: ORGANIZATION_ID,
          productId: PRODUCT_ID,
          name: 'p'.repeat(PRODUCT_PRESENTATION_NAME_MAX_LENGTH + 1),
          averageWeightGrams: 500,
        },
        NOW,
      ),
    ).toThrowError('Product presentation name must be between 1 and 120 characters');
  });

  it('updates the editable fields and leaves identity and creation time intact', () => {
    const presentation = createProductPresentation(
      {
        id: PRESENTATION_ID,
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Covered tray',
        averageWeightGrams: 500,
      },
      NOW,
    );

    expect(
      updateProductPresentation(
        presentation,
        { name: '  Large covered tray  ', averageWeightGrams: 750, isActive: false },
        LATER,
      ),
    ).toEqual({
      ...presentation,
      name: 'Large covered tray',
      averageWeightGrams: 750,
      isActive: false,
      updatedAt: LATER,
    });
  });

  it('rejects invalid edited names and weights', () => {
    const presentation = createProductPresentation(
      {
        id: PRESENTATION_ID,
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Covered tray',
        averageWeightGrams: 500,
      },
      NOW,
    );

    expect(() =>
      updateProductPresentation(
        presentation,
        { name: ' ', averageWeightGrams: 500, isActive: true },
        LATER,
      ),
    ).toThrowError('Product presentation name must be between 1 and 120 characters');
    expect(() =>
      updateProductPresentation(
        presentation,
        { name: 'Covered tray', averageWeightGrams: 1.5, isActive: true },
        LATER,
      ),
    ).toThrowError('Product presentation average weight must be a positive whole number of grams');
  });

  it('rejects a missing, non-positive or fractional average weight', () => {
    for (const averageWeightGrams of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        createProductPresentation(
          {
            id: PRESENTATION_ID,
            organizationId: ORGANIZATION_ID,
            productId: PRODUCT_ID,
            name: 'Covered tray',
            averageWeightGrams,
          },
          NOW,
        ),
      ).toThrowError(
        'Product presentation average weight must be a positive whole number of grams',
      );
    }
  });
});
