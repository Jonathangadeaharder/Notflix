# ADR-006: Frontend Stack (Historical Record)

**Status:** Demoted from ADR Set
**Date:** 2025-12-19
**Context:** This document originally captured UI stack choices and frontend conventions. Those decisions remain important for day-to-day engineering, but they are better treated as standards than as long-lived architecture records.

## 1. Decision

The normative source for current frontend stack choices and conventions is now:

- `docs/standards/frontend-stack.md`

This file remains only as a historical record of why a frontend standards document exists.

## 2. Why This Was Demoted

- The content is primarily about tooling and conventions, not a durable architectural boundary.
- The stack can evolve faster than the ADR set should.
- Treating stack conventions as ADRs made audits noisier by mixing architecture decisions with implementation standards.

## 3. Consequences

- Future frontend stack updates should be made in `docs/standards/frontend-stack.md`.
- Architecture audits should not treat this file as the canonical source of shipped frontend behavior.
- Product behavior remains defined by `docs/specs/functional-specs.md`, not by this historical note.
