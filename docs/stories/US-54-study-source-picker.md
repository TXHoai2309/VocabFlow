# US-54 — Compact Study Source Picker

- Owner-approved implementation scope: 2026-10-08, target TXH.
- Status: IMPLEMENTED / READY FOR OWNER CHECK.
- Dependencies: US-08/14 queue, US-28 sets, US-30 daily allowance,
  US-46 saved, US-49 weak and Features #13–#16.

## Contract

Study Setup defaults to **Học theo lộ trình**. A compact select offers exactly
Pathway, Custom and All. Custom opens a 560px desktop dialog / mobile bottom
sheet with searchable canonical enabled set summaries, draft checkboxes,
Cancel and Apply(N). Apply requires 1–50 distinct sets. Cancel, X, Escape and
backdrop discard the draft. The list scrolls independently of its footer.
Keyboard focus is trapped and restored; mobile respects the bottom safe area.
The setup retains amount/mode controls and a three-row summary with actual
planned count. Generic tips, explanatory banners and the repeated note are
removed. Selection actions produce no toast or assignment write.

## Queue contract

`GET /api/learners/:learnerId/review-queue` retains its default assigned-set
queue and saved / saved-all / weak contract. Additive queries:

- `source=pathway`: earliest enabled set with enabled vocabulary missing
  canonical learner progress, ordered by `sort_order`, then ID. New comes from
  that set. Due comes from previously studied vocabulary in any enabled set.
  When no set has New, Due remains available. Mastery does not gate advancement.
- `source=custom&setIds=1,2`: enabled selected-set vocabulary union.
- `source=all`: vocabulary union of all enabled sets.
- `learningSetId=123`: exact enabled set, without requiring assignment.
- `topicId=123`: enabled topic intersected with the existing learner-assigned
  vocabulary membership, preserving Topic access semantics.

Reject repeated/unknown/conflicting parameters, duplicate IDs, non-positive or
unsafe IDs and more than 50 custom IDs. Missing/disabled sets/topics return
404 SCOPE_NOT_FOUND after household-to-learner authorization. ID comparison
uses parameterized bigint to safely handle positive safe integers outside the
runtime integer-ID range. Membership is EXISTS before LIMIT, so overlapping
set items never multiply words. Vocabulary must be enabled; quarantined media
continues to be suppressed by the existing media projection. There is no new
quarantine state or migration.

Due date/order, 20 Due / 10 New presentation bounds, canonical daily allowance,
sparse progress, review revision/idempotency, reinforcement and XP are retained.
The review write service and learning-domain scheduler are unchanged.

## Preference and continuity

`vocabflow.study-source.v1:<authenticated userId>` stores only preferred source
and custom IDs. Fresh canonical enabled summaries prune stale remembered IDs.
Account changes remount authenticated identity; another account receives its
own preference/default. Logout preserves these per-account preferences.
Explicit URL scope wins. Switching sources replaces incompatible URL scope.
Start, refresh/reconcile, session exit and Summary → Học tiếp serialize the
same exact source. Canceled async reads cannot publish old availability.

## Verification boundary

Component/API tests and Chromium mocked-API E2E cover source selection, drafts,
search, keyboard/focus, counts, no assignment writes, preference isolation,
scoped links and responsive widths 320/390/768/1440. SQL tests inspect generated
parameterized queries and mocked database responses; they do not claim live
PostgreSQL execution. Existing review/XP tests remain the write-invariant
evidence. No live Neon, migration, Dataset changes or Production deployment.

Final counts and commands are recorded in docs/ai-progress.md.

## Verification results

178 final focused tests; 638 broader regression tests; 265 expanded relevant
tests; 23 identity/preference tests; 16 Chromium E2E PASS. Typecheck, build,
full repository lint and diff check PASS. Live Preview/device verification
remains an owner check, with historical unrelated E2E debt documented in
ai-progress.

## Changed files

- `apps/api/src/index.ts`
- `apps/api/src/review-queue.test.ts`
- `apps/api/src/review-queue.ts`
- `apps/web/src/features/learners/learner-context-provider.tsx`
- `apps/web/src/features/learners/learner-context.ts`
- `apps/web/src/features/study/review-queue-client.ts`
- `apps/web/src/features/study/session-summary.tsx`
- `apps/web/src/features/study/session-summary.test.tsx`
- `apps/web/src/features/study/study-page.test.tsx`
- `apps/web/src/features/study/study-page.tsx`
- `apps/web/src/features/study/study-queue.test.ts`
- `apps/web/src/features/study/study-queue.ts`
- `apps/web/src/features/study/study-setup-page.test.tsx`
- `apps/web/src/features/study/study-setup-page.tsx`
- `apps/web/src/features/study/learning-set-picker-dialog.test.tsx`
- `apps/web/src/features/study/learning-set-picker-dialog.tsx`
- `apps/web/src/features/study/study-source-preference.test.ts`
- `apps/web/src/features/study/study-source-preference.ts`
- `apps/web/src/styles.css`
- `docs/ai-progress.md`
- `docs/changelog.md`
- `docs/architecture/technical-architecture.md`
- `docs/decisions.md`
- `docs/design/feature-ui-spec.md`
- `docs/flow/user-flow.md`
- `docs/product/product-spec.md`
- `docs/roadmap.md`
- `docs/stories/README.md`
- `docs/stories/US-54-study-source-picker.md`
- `e2e/study-source-picker.spec.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/study-scope.ts`
