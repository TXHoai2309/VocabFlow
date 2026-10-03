# US-47 — Continue Learning

- Status: `IN PROGRESS` (owner-requested Feature #9, 2026-10-03).
- Owner: Product owner.
- Depends on: US-08 Review Queue, US-21 Learner Progress Isolation,
  US-27 Topics, US-28 Learning Sets, US-38 Topic Progress, US-46 Saved
  Vocabulary, and US-18 Reload / Leave.
- This explicit owner reprioritization adds one learner-scoped Home read model
  while US-42 and US-46 remain listed as open work. Dataset V2 is outside scope.

## 1. Sources of truth

- [Product Specification](../product/product-spec.md).
- [Technical Architecture](../architecture/technical-architecture.md).
- [Global Design System](../design/design-system.md).
- [Feature UI Specification](../design/feature-ui-spec.md#32-learner-home).
- [User Flow](../flow/user-flow.md#continue-learning-extension-us-47).
- [DEC-022 Collection Continue and session persistence](../decisions.md#dec-022-collection-continue-and-session-persistence).
- US-18, US-21, US-27, US-28, US-38, and US-46.

## 2. User story

As a parent viewing an active learner's Home, I can continue a partially
learned Topic, Learning Set, or saved collection at the correct Study Setup
scope and see its real progress and, when available, its latest review time.

## 3. In scope

- Upgrade only the existing Home “Tiếp tục học” card; retain all other Home
  sections and current layout.
- Add one read-only learner-authorized continue summary with one selected
  candidate, exact collection totals, learned count, rounded percentage, and
  latest review-event timestamp when available.
- Detect partial progress using `0 < learnedCount < totalCount`.
- Include active assigned Learning Sets, enabled Topics with content eligible
  through an active assigned set, and the learner's enabled saved vocabulary.
- Order candidates by latest `review_events.reviewed_at` descending. When
  timestamps tie or are absent, use `LEARNING_SET`, `TOPIC`, `SAVED`, followed
  by collection sort order and ID for deterministic selection.
- Navigate to `/study/setup?topicId=...`,
  `/study/setup?learningSetId=...`, or
  `/study/setup?saved=1&content=all` using React Router.
- Preserve the existing Home queue fallback if no partial collection is
  available or the continue summary is unavailable.

## 4. Out of scope

- Home hero, greeting, stats, learning-set list, chart, recent activity, or
  AppShell redesign.
- Exact session persistence/resume, session tables, queue/index reconstruction,
  browser storage, and inferred/guessed learning modes.
- Study queue or scheduler behavior, Topic/Set membership, review writes,
  progress reset, database schema/migrations, and production DB/deployment.
- Dataset V2 content, schemas, fixtures, scripts, and pipeline.

## 5. Acceptance criteria

- AC-01: Home requests one small summary for the active learner and does not
  fetch the full vocabulary catalog for this card.
- AC-02: Only partially learned scopes are candidates; untouched and completed
  collections are not selected.
- AC-03: Topic progress matches Topic Detail (all enabled Topic vocabulary;
  the Topic is available only when it has active-set-eligible content). Set
  progress is over enabled members of that active assigned set. Saved progress
  is over that learner's enabled saved vocabulary.
- AC-04: Learned/total counts and rounded progress percentage are derived from
  the selected collection's own learner statuses, not global learner totals.
- AC-05: Latest activity comes only from that learner's actual review events.
  If no event exists, hide its timestamp. Do not infer a study mode; mode is
  omitted because runtime does not persist it.
- AC-06: Most recent activity wins. Ties and missing timestamps follow the
  deterministic order in §3. No random or arbitrary candidate is selected.
- AC-07: Each candidate's CTA preserves its exact Topic, Set, or all-saved
  scope and enters Study Setup without a full page reload.
- AC-08: When no candidate exists or its API is unavailable, show the current
  queue-based Home fallback honestly; do not label it as a resumed session.
- AC-09: The read endpoint requires authentication and learner household
  ownership, rejects unexpected query parameters, and returns no vocabulary
  list or private event details.
- AC-10: Learner switching refreshes the candidate for the newly active
  learner. Progress is accessible through a semantic progress indicator and
  remains usable on narrow screens.
- AC-11: Exact session resume remains unsupported; do not add local/session
  storage as a substitute.

## 6. UX/UI contract

- Keep the existing card position, title, and visual hierarchy. Replace only
  its content with a compact icon/collection label, title, progress, optional
  latest review time, and primary “Tiếp tục học” action.
- Do not show a mode row without a persisted source. Keep the existing
  “Bắt đầu phiên học” fallback when no continuation target is available.
- On mobile, stack the icon/content/action, let the progress track fill the
  content width, and make the action full width without horizontal overflow.

## 7. Domain and business rules

- A collection is in progress only when at least one of its enabled members is
  `LEARNING` or `MASTERED`, and at least one enabled member is still not learned.
- Candidate time is `MAX(review_events.reviewed_at)` among the selected
  learner's scoped vocabulary, not assignment/create/update time.
- Mode and originating scope are not recorded in review events. The Home card
  makes no claim about the previous mode.
- This feature continues a collection at Setup; it does not resume the old
  in-memory queue or question position.

## 8. API contract

- `GET /api/learners/:learnerId/continue-learning`
- Response: `{ learnerId, candidate }`; candidate is null or contains
  `scope`, `scopeId`, `title`, `totalCount`, `learnedCount`,
  `progressPercent`, and nullable ISO `lastActivityAt`.
- Authentication and household ownership follow existing learner APIs. Error
  responses use the existing safe error envelope. Only one aggregate read is
  executed after authorization.

## 9. Authorization and security

- Scope every progress/review query to the authorized learner UUID; require
  active assignment for Set membership and learner ownership for Saved.
- Do not return review contents, session data, or vocabulary rows.
- SQL is read-only. No schema changes or database mutation are part of this
  story.

## 10. Data and persistence contract

- Progress source: `learner_progress.status`, with absent rows treated as not
  learned, matching Topic Detail and Learning Set Detail.
- Recency source: `review_events.reviewed_at`.
- No `study_sessions` runtime table or persisted queue currently exists; exact
  session resume is explicitly unavailable.

## 11. Error and recovery matrix

| Situation | Expected behavior | Recovery |
| --- | --- | --- |
| No in-progress collection | Existing queue-based “Bắt đầu phiên học” or empty state | User may browse a collection |
| Continue summary loading | Compact loading state in this card | Resolve summary |
| Continue summary fails | Honest card/global retry state and queue fallback if ready | Retry Home data |
| No review event timestamp | Omit last-activity line | Continue by scope |
| Learner not in household | 403 safe error | No data returned |

## 12. Concurrency and idempotency

This read-only aggregate does not reserve, mutate, or duplicate Study queues.
Study Setup and the canonical queue API continue to resolve current membership
and progress on entry.

## 13. Test plan

- API authorization, response validation, partial/completed/untouched filtering,
  per-scope counts, review-event recency and deterministic tie/fallback order.
- Home Topic, Set and Saved rendering; exact scope links; absent date/mode;
  candidate fallback; active learner switch; no catalog request; unchanged
  neighboring Home content.
- Regression: Topic Detail, Learning Set Detail, Study Setup and Study queue.
- `pnpm typecheck`, `pnpm build`, Home/Study feature ESLint, and
  `git diff --check`.

## 14. Expected files and modules

- Home Continue card, Home client and focused tests.
- One learner-authorized read-only API/service and contract schema/tests.
- Story, Home UI/flow documentation, decision log, changelog, and AI progress
  handoff.

## 15. Implementation sequence

1. Audit session persistence, collection progress, assignments, review times,
   and Home's current queue fallback.
2. Add contract and read-only summary API, then test query authorization,
   partial-progress eligibility and recency ranking.
3. Connect Home's active-learner card and exact Setup scopes.
4. Validate feature regressions, build and lint, then commit/push the explicit
   feature branch request.

## 16. Definition of Done

- All ACs pass and documentation captures the decision and evidence.
- Only Continue Learning feature/API/contract/tests/docs are staged; Dataset V2
  work remains untouched and unstaged.
- Commit `feat: add continue learning card` is pushed to `origin TXH`; no merge
  or production deployment occurs.

## 17. Open questions and blockers

- None. Exact session resume is a known product/runtime limitation, not a
  blocker for collection-level Continue Learning.

## 18. Acceptance evidence

- 2026-10-03 focused Home, Topic Detail/progress, Learning Set, Study Setup/
  queue, Continue client and API tests pass: 9 files / 92 tests.
- `pnpm typecheck`, `pnpm build`, Home/API/contracts feature ESLint, and
  `git diff --check` pass. The build reports existing dynamic-import and
  bundle-size warnings; local Node is 22.19.0 versus the repo pin 22.23.2.
- No production deployment or database mutation was performed. Commit/push
  evidence will be added after the branch update.
