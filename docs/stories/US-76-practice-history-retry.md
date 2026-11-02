# US-76 — Lịch sử và luyện lại câu sai (ticket 07)

- Status: ACCEPTED
- Assignment: owner sequential execution2026-11-01.
- Blocker06/US75 ACCEPTED;12 guest behavior cases, full account/SQL evidence from
  earlier slices. This slice closes group A; no provider or new migration.

## Contract before code

Account GET `/api/learners/:learnerId/practice-sessions?page=&needsPage=` returns
20 bounded history entries plus independently paged20 practice-only needs-more
items and honest totals. Auth/ownership precedes repository queries; no-store.
List includes saved config, counts, status, created time and correct summary.
GET `/:sessionId/results` returns only resolved question/outcome/answer snapshots,
including content version/hash, cue and first typed/selected response. It never
reveals unanswered answer keys and does not demand current media to read history.
Guest derives these views from its own validated local store without network or
account state. Add answeredAt timestamps to new outcomes; older entries fall back
to session creation time. No regrading history. Needs-more derives latest valid
correct/incorrect outcome per Sense from practice only; latest incorrect remains
listed with historical error count. Reveal/skip/technical do not claim knowledge.

POST `/:sessionId/retry` accepts new sessionId and optional distinct questionIds
bounded30. Server authorizes original session, permits only its resolved incorrect
questions and uses its saved config/source. Client cannot submit arbitrary target
IDs or grades. Freshness-check selected original pins; retired source/media gives
explicit error. Generate targets only for selected wrong items, while safe choice
distractors still use original source. Mixed retry must still have two distinct
eligible targets/both cues; insufficient source is explained, never silently
changes cue. A retry is a new pinned session with retryOf relation; original state
is immutable. Exact creation retry replays; changed parent/selection conflicts409.
Typed/image/audio/mixed, guest/account and new results retain shared first-result,
auth, storage failure and SRS isolation behavior. No new table/migration.

UI `/practice/history`, link from setup and summary; mobile single-column list,
native buttons/paging, query state in URL. Open entry to see resolved outcomes;
select incorrect rows with labelled checkboxes (default all) and explicit
“Luyện lại câu đã chọn”. Pending retry-create keeps stable new ID until confirmed;
failed save retains selection. Enter resulting session with a device checkpoint
before navigation so reload/uncertain creation recovers exactly. Completed
history remains readable after current content retires; no scheduler weak-word
list is merged. Loading/error/empty, keyboard/focus and honest zero accuracy.

## Acceptance / verification

All5 ticket criteria/common constraints. API401/403, foreign history/retry IDs,
forged selection, exact creation replay, no first-outcome overwrite; guest/account
browser history→retry→new history plus failure/reload and source retired cases.
Run group A lint/typecheck/test/build/relevant E2E, actual local SQL rollback
history/retry/SRS snapshots. Record unrelated baseline failures separately without
claiming they pass. No ACCEPTED before evidence.

## Evidence

READY FOR IMPLEMENTATION recorded before code.
Gate passed; now IN PROGRESS.

Feature acceptance evidence:35/35 combined account/guest Chromium flows PASS;
5/5 additional history/stale/reload checks PASS after final source labels and
guest retired-content guard.35 scoped API/source tests PASS, including401/403,
resolved-only history, selected retry replay, latest-correct needs-more removal,
immutable original and retired pins. Real localhost PostgreSQL rehearsal PASS:
history/retry/readback, original unchanged, SRS/reviews/XP/catalog snapshots
unchanged, all fixtures and0025 rolled back. Root lint/typecheck/build PASS;
postbuild secret/source-map scans PASS. Desktop/mobile screenshots in tracker
evidence/07-history-*.png inspected; no horizontal overflow.

Group regression found a real integration omission: the new practice table was
missing from the application/reset inventory and migration journal expectation
still stopped at0024. Added the new application table ahead of learner FK
dependencies, updated its schema/migration contract,8/8 focused foundation tests
PASS. No reset, persistent migration, protected-schema or permission changes.
Full release regression remains running; do not claim its result until returned.

All feature acceptance criteria have browser/API/actual SQL evidence above; full release run continues as a tracked repository regression, without claiming its result.
