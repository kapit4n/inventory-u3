/**
 * Public surface of the Inventory U3 API client.
 *
 * Features import from `@inventory-u3/api-client` and build their own typed
 * resource functions on top of `ApiClient`.
 */

export {
  API_ERROR_CODES,
  ApiClient,
  ApiClientError,
  buildQueryString,
  toApiClientError,
  type ApiClientOptions,
  type ApiErrorCode,
  type QueryValue,
  type RequestOptions,
} from './http.js';
export { createBranch, listBranches, updateBranch } from './branches.js';
export {
  createMeasurementUnit,
  createProductCategory,
  createProductPresentation,
  listMeasurementUnits,
  listProductCategories,
  listProductPresentations,
  updateMeasurementUnit,
  updateProductCategory,
  updateProductPresentation,
} from './catalog.js';
export { createEmployee, listEmployees, updateEmployee } from './employees.js';
export { createProduct, listProducts, updateProduct } from './products.js';
export { createProductPrice, listProductPrices } from './product-prices.js';
export {
  cancelPurchase,
  correctPurchase,
  createPurchase,
  getPurchase,
  getPurchaseCorrection,
  listPurchases,
  receivePurchase,
} from './purchases.js';
export { createSupplier, listSuppliers, updateSupplier } from './suppliers.js';
