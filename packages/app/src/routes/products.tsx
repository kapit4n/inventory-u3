import { createFileRoute } from '@tanstack/react-router';

import { ProductPage } from '../features/products/components/product-page.js';

export const Route = createFileRoute('/products')({
  component: ProductPage,
});
