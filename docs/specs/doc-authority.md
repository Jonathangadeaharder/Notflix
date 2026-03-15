# Documentation Authority

**Status:** Active
**Purpose:** Define which documents are normative so architecture, shipped behavior, and aspirational UX do not drift during audits or implementation.

## 1. Precedence

1. **Architecture ADRs** are normative for cross-service boundaries, architectural constraints, and long-lived technical decisions.
2. **`docs/specs/database-schema.md`** is normative for persistent data shape, table ownership, and stored field semantics.
3. **Functional/runtime specs** are normative for shipped product behavior:
   - `docs/specs/functional-specs.md`
   - `docs/specs/processing-progress.md`
   - `docs/specs/learning-session-state.md`
4. **Standards docs** are normative for engineering conventions and tool choices, but are not architecture records:
   - `docs/standards/frontend-stack.md`
   - `docs/standards/testing-and-di.md`
5. **Design docs** are aspirational unless specific behavior is promoted into a functional spec:
   - `docs/specs/design-brief.md`
   - `docs/figma-designs/*`

## 2. Conflict Rules

- If a design brief conflicts with a functional spec, the functional spec wins.
- If a functional spec conflicts with the schema spec about stored fields, the schema spec wins for persistence shape and the functional spec wins for user-visible behavior.
- If any spec or standard conflicts with an ADR on an architectural boundary, the ADR wins.
- Stack choices, coding conventions, and test workflow rules should live in standards docs, not in ADRs unless they create a long-lived architectural constraint.

## 3. Duplication Rules

- Canonical status enums and progress-stage names must not be redefined independently in aspirational or design-oriented docs.
- Design docs may describe intent using semantic language such as "success", "in progress", or "error", but should reference the functional/schema specs for canonical labels.
- When shipped behavior changes, update the functional spec and schema spec before updating aspirational design docs.

## 4. Promotion Rules

- When an aspirational UX becomes shipped behavior, promote it into the relevant functional spec.
- When a tooling choice becomes a day-to-day convention rather than an architectural trade-off, document it in a standards doc.
- ADRs should focus on boundaries, contracts, lifecycle decisions, and trade-offs that remain important even if implementation details evolve.
