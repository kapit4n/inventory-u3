/**
 * Inventory U3 — Domain.
 *
 * Framework-independent inventory business rules, value objects and ports.
 * This package must never import React, browser APIs, Tauri, PostgreSQL,
 * Drizzle, TanStack Query, Zustand or any UI library
 * (see docs/decisions/0004-framework-independent-domain.md).
 */
export * from './branch/index.js';
export * from './organization/index.js';
export * from './ports/index.js';
export * from './product/index.js';
export * from './shared/index.js';
