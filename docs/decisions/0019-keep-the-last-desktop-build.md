# ADR 0019 — Keep the last desktop build that worked

## Status

Accepted.

## Context

A clean desktop build can take several minutes, which makes repeated debugging
cycles expensive.

## Decision

Allow developers to pin a known-good local desktop build and run that while
iterating. Pins are local artifacts, ignored by git, and clearing them is a
documented command.

## Consequences

- Desktop iteration can avoid a full rebuild.
- Pinned artifacts never enter the repository.
- A final verification still uses a fresh build.
