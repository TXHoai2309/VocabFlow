# US-53 — Toast & Feedback

- Status: IMPLEMENTED / READY FOR OWNER CHECK.
- Feature: #16.
- Last updated: 2026-10-07.

## 1. User story

As a learner or parent, I want brief feedback after everyday actions so I can
understand whether my change succeeded without interrupting my current task.

## 2. Outcome

Successful everyday mutations provide short-lived, accessible confirmation.
Recoverable mutation failures provide safe feedback while preserving the
existing retry or rollback behavior. Destructive actions retain an explicit
confirmation dialog.

## 3. Source of truth references

- [Product Specification](../product/product-spec.md#toast-mutation-feedback-extension-feature-16--us-53)
- [Feature UI Specification](../design/feature-ui-spec.md#toast-mutation-feedback-feature-16--us-53)
- [User Flow](../flow/user-flow.md#mutation-feedback-extension-feature-16--us-53)
- [Global Design System](../design/design-system.md)

## 4. Dependencies

- Existing AppShell and authenticated learner routes.
- Existing vocabulary, saved vocabulary, learner settings, assignment, learner
  creation and progress APIs.

## 5. In scope

- A shared toast provider mounted across authenticated routes.
- Success, informational and error feedback with accessible live regions,
  manual dismissal, bounded stacking and automatic dismissal.
- Toast feedback for successful or failed everyday mutations while retaining
  each feature's existing pending, rollback, validation and retry behavior.
- Keyboard-accessible confirmation for progress reset.

## 6. Out of scope

- API, DTO, scheduler, database, migration, persistence or business-rule changes.
- Replacing destructive confirmation, read-state error/retry UI, form
  validation or Study answer correctness feedback.
- New dependencies, routes or global redesign.

## 7. Acceptance criteria

- AC-01: Success and informational toasts use polite status announcements;
  errors use assertive alert announcements.
- AC-02: Toasts do not steal focus, support a labeled close control, dismiss
  automatically, and remain visible across route navigation.
- AC-03: At most three toasts are visible; repeated identical feedback is
  deduplicated.
- AC-04: Ordinary mutation outcomes use the shared feedback system without
  changing API behavior, pending state, rollback or form validation.
- AC-05: Destructive progress reset remains explicitly confirmed and its
  dialog supports initial focus, focus containment, Escape cancellation, and
  return of focus to the trigger.
- AC-06: Read failures and authentication/permission recovery remain in their
  existing page states; Study correctness feedback remains inline.
- AC-07: Toasts are readable and dismissible on desktop and mobile without
  covering primary navigation controls.

## 8. UX/UI contract

- Toasts appear in a fixed viewport with semantic success, info and error
  styling, a concise message and a 44px close target.
- Desktop placement is in the upper-right content area. Mobile placement is
  above bottom navigation and respects safe-area insets.
- Success and info messages dismiss after four seconds; errors after 6.5
  seconds. The user can dismiss any toast earlier.
- Toasts are not actionable and do not offer undo.
- Confirmation dialogs remain reserved for destructive or difficult-to-reverse
  actions.

## 9. Domain and business rules

No domain or business rule changes. Toasts report the result of existing
mutations; optimistic updates and rollback remain owned by their pages.

## 10. API and data contract

Existing requests and response contracts are unchanged. Toasts are transient
client presentation state and are not persisted.

## 11. Authorization and security

Existing authorization and resource access behavior remains authoritative.
Error messages use safe user-facing copy and do not expose raw exceptions,
credentials or server details.

## 12. Error and recovery matrix

| Situation | Expected behavior | Recovery |
| --- | --- | --- |
| Everyday mutation succeeds | Brief success or info toast | Continue current task |
| Everyday mutation fails | Safe error toast; existing rollback retained | Retry using existing control |
| Read request fails | Existing inline page error state | Retry the same read |
| Destructive reset requested | Confirmation dialog with clear consequence | Cancel or explicitly confirm |
| Study answer is correct or incorrect | Existing learning feedback | Continue the session |

## 13. Concurrency and idempotency

Existing mutation guards and API idempotency semantics are unchanged. Repeated
identical toasts are coalesced and the visible stack is bounded.

## 14. Test plan

- Shared toast semantics, close control, timeout, bounded stack, duplicate
  replacement and route persistence.
- Mutation success/failure feedback and existing rollback, pending, validation
  and query-error regressions.
- Destructive reset dialog keyboard focus behavior.
- Feature #13 navigation, Feature #14 Global Search, Feature #15 async states,
  Study and learner feature regressions.
- Global typecheck, production build, changed-file ESLint and `git diff --check`.

## 15. Expected files and modules

- Shared toast provider and styles.
- App shell integration and existing mutation pages/tests.
- Product, design, flow, roadmap, story, changelog and progress documentation.

## 16. Implementation sequence

1. Audit existing confirmation dialogs, mutation feedback and inline states.
2. Add and test the shared provider and responsive presentation.
3. Convert only everyday mutation feedback; preserve dangerous confirmations
   and read/learning states.
4. Run focused regressions, typecheck, build, changed-file ESLint and diff check.
5. Review and stage only Feature #16 files.

## 17. Definition of done

- Acceptance criteria and regressions pass.
- Documentation and user-facing state copy match implementation.
- No Dataset V2, API, database, migration or deployment changes.
- Exact-scope review completed before commit and push.

## 18. Acceptance evidence

- Focused feedback suite: 8 files / 98 tests PASS.
- Relevant AppShell/navigation, Global Search, Home, vocabulary, Weak Words,
  Topics, learner persistence, Study and async-state regressions: 12 files /
  166 tests PASS.
- Global `pnpm typecheck`, `pnpm build`, changed-file ESLint and
  `git diff --check` PASS.
- No API/DB implementation, migration, database mutation, Dataset V2 change,
  main merge or production deployment.
