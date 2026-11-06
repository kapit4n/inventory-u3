# ADR 0002 — Tauri 2 for the desktop target

## Status

Accepted.

## Context

Inventory U3 needs a desktop application without maintaining a second UI.

## Decision

Use Tauri 2 as the desktop shell. It renders the same React application as the
browser target. Desktop-only capabilities are reached through the shared platform
abstraction.

## Consequences

- Rust and system webview dependencies are required for desktop development.
- The shell stays thin; features never import Tauri directly.
- Desktop builds can be pinned locally for verification.
