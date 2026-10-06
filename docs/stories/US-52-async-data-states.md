# US-52 — Loading / Empty / Error States

- Status: IMPLEMENTED / READY FOR OWNER CHECK.
- Feature: #15.
- Last updated: 2026-10-06.

## 1. User story

As a learner or parent, I want clear loading, empty and recoverable error
states while page data is read, so I can tell what is happening and recover
without losing my current place.

## 2. Outcome

Data-backed pages render an accessible state inside their normal page shell.
Loading reflects the rough content shape, empty states explain what the result
means, and retryable errors provide safe guidance and a retry action.

## 3. Source of truth references

- [Product Specification](../product/product-spec.md#loading--empty--error-states-extension-feature-15--us-52)
- [Feature UI Specification](../design/feature-ui-spec.md#loading--empty--error-states-feature-15--us-52)
- [User Flow](../flow/user-flow.md#async-data-state-extension-feature-15--us-52)
- [Global Design System](../design/design-system.md)

## 4. Dependencies

- Existing AppShell and Feature #13 navigation.
- Existing Feature #14 Global Search.
- Existing page APIs, routes and learner context.

## 5. In scope

- Shared accessible Loading, Empty and Error state components.
- Content-shaped skeletons for card grids, rows, dashboards, details,
  forms/setup, charts and grouped search.
- State consistency for Home, Vocabulary, Saved, Weak Words, Progress, Topics,
  Learning Sets and assignment, Learners/Settings, Study Setup/session and
  Global Search.
- Retry existing read requests with current route, learner, query and filters.
- Explicit empty, no-filter-match and not-found states without invented data.

## 6. Out of scope

- API/DTO, authentication, scheduler, review queue, progress calculation,
  database, migration or persistence changes.
- New routes, polling, artificial delay, new dependencies or content redesign.
- Converting authentication, permission or detail 404 states into a generic
  retry or empty state.

## 7. Acceptance criteria

- AC-01: Loading uses an aria-busy status with a concise accessible label;
  decorative skeleton elements are hidden from assistive technology.
- AC-02: Skeleton patterns reflect the approximate structure being loaded and
  fit narrow screens; reduced-motion preferences disable the animation.
- AC-03: Normal page navigation remains mounted during page-data loading and
  errors; Study may use its existing focus shell.
- AC-04: Empty results have a specific title, explanatory copy and a real
  contextual action when one exists. Empty collection and filter miss remain
  distinct.
- AC-05: Retryable read errors have safe copy and a “Thử lại” control. Retry
  invokes the relevant existing read and preserves route, learner, query and
  filters.
- AC-06: A successful zero-result response is not represented as a network
  error; resource 404, authentication and permission recovery remain distinct.
- AC-07: Fast responses do not wait for an artificial minimum duration; no
  polling or fabricated learner data is introduced.
- AC-08: Existing Feature #13 navigation, Feature #14 keyboard/recent-search
  behavior, Study answer saving, Session Summary and page business logic
  continue to pass regression tests.

## 8. UX/UI contract

- Loading: neutral shape-matched skeleton inside page content, with
  `role="status"`, `aria-live="polite"`, `aria-busy="true"` and one hidden
  label. Skeleton shapes are decorative.
- Empty: muted icon, clear Vietnamese heading, brief guidance and optional
  useful action.
- Error: safe title and description with retry when the same read can be
  retried. Never show raw exceptions or HTTP details.
- Responsive: no horizontal overflow at 320px/390px; touch actions remain
  reachable; AppShell mobile navigation stays available.
- Reduced motion: skeleton animation is removed under
  `prefers-reduced-motion: reduce`.

## 9. Domain and business rules

No domain or business rule changes. Loading/empty/error UI does not affect
queue creation, learning progress, scheduler eligibility, session writes,
search semantics or collection membership.

## 10. API and data contract

Existing read requests and response contracts are unchanged. No new endpoint,
database table, migration, persistent cache or client-side source of truth.

## 11. Authorization and security

Existing learner authorization and resource access handling remain authoritative.
Error states expose only user-safe copy. Retry repeats the authorized read.

## 12. Error and recovery matrix

| Situation | Expected behavior | Recovery |
| --- | --- | --- |
| Read pending | Layout-matched accessible skeleton | Wait for request |
| Read succeeds with records | Existing page content | Existing actions |
| Read succeeds with no records | Contextual empty state | Real page action when available |
| Search/filter has no matches | Distinct no-match guidance | Clear or edit criteria |
| Retryable network/server failure | Safe error state in page shell | Retry the same read |
| Resource 404 | Existing not-found state | Return to parent catalog |
| Authentication/permission failure | Existing auth/access recovery semantics | Sign in or select permitted learner |
| Study answer mutation pending/fails | Existing inline save/feedback state | Existing idempotent retry contract |

## 13. Concurrency and idempotency

Read retries do not create session queues, writes or polling. Existing page
request cancellation and stale-response guards remain in effect.

## 14. Test plan

- Shared state component accessibility, decorative skeleton, optional empty
  action, safe error retry and disabled retry behavior.
- Page loading/error/empty and retry regressions for Home, Vocabulary, Saved,
  Weak Words, Progress, Topics, Learning Sets/assignment, Learner Settings,
  Study Setup and Global Search.
- AppShell/Feature #13 navigation, Feature #14 palette interactions, Study
  session and Session Summary regressions.
- Global typecheck, production build, changed-file ESLint and `git diff --check`.

## 15. Expected files and modules

- Shared web async state component and styles.
- Existing learner, catalog, search and study page components/tests.
- Product/UI/Flow/roadmap/story/changelog/progress documentation.

## 16. Implementation sequence

1. Audit data-fetching pages, async phases, retry paths and blank-screen risks.
2. Implement and test reusable state components and responsive skeleton shapes.
3. Adopt states in scoped pages without changing domain behavior.
4. Run focused regression, typecheck, build, feature ESLint and diff checks.
5. Record evidence and review exact staged scope.

## 17. Definition of done

- Acceptance criteria and focused regressions pass.
- Documentation and user-facing state copy match implementation.
- No unrelated Dataset V2, API, database or migration diff.
- Exact-scope review completed before commit/push.

## 18. Acceptance evidence

- Focused web regressions: 18 files / 249 tests PASS.
- Global `pnpm typecheck`: PASS.
- Production build, changed-file ESLint, and final diff check PASS.
- No API/DB code, migration, database mutation, Dataset V2 change or
  production deployment.
