# ADR 0032 — UI language is a typed catalogue, Spanish by default

## Status

Accepted.

## Context

The product needs English and Spanish without scattering strings through
components or making translation keys untyped.

## Decision

Keep locale modules in `packages/app/src/i18n/locales`. Derive the translation
key type from the English catalogue. Spanish and English must expose the same
keys. The header switches locale and persists the choice in `localStorage`.

## Consequences

- Missing keys fail typecheck.
- Features read copy through `t()`.
- Domain data and the product name remain literal.
- Additional locales require a product decision.
