# US-58 loading and guest New-count correction

Owner request: fix the deployed loading audit and the guest screenshot showing
90 New after a goal/limit of 100 and 10 introductions, then publish to Git.

## Behavior

- New means all distinct unseen vocabulary in the eligible source. It is not
  a daily budget. `dailyNewRemaining` is the separate today-only allowance;
  session candidates respect that allowance and the requested amount/capacity.
- Select unseen IDs explicitly. Sparse progress is not an offset into content.
  Yesterday's introductions do not consume today's New allowance.
- Preserve guest localStorage data and account authorization. No migration,
  automatic guest import, learner-history rewrite or direct database operation.

## Loading architecture

- Lightweight index: IDs/levels and set/topic membership, three parallel reads.
- Word details: at most 60 unique IDs per request and two concurrent batches.
- Browse: SQL page sizes 20/30/50; guest collections use 30-row pages, URL state
  and cancelable debounced search. Weak-word search transfers matching IDs only.
- Settings/activity/history/rewards/reset/unsave work without content fetches.
  Detail, saved words and browse fetch exactly what their view needs.
- Cache word promises and validated storage snapshots; clone state before
  mutations so a failed durable write cannot alter the read snapshot.
- Public reads retain enabled/dataset filtering and the existing media sanitizer;
  timing headers identify index SQL, batch/browse and public media processing.

## Same-data payload comparison

Projection from the exact 7,311-word public response captured during the prior
read-only Production audit, using the new response shapes:

| Payload | JSON bytes |
| --- | ---: |
| Previous full catalog | 8,140,988 |
| New ID/level/membership index | 252,429 |
| Ten word details for a fresh Home | 11,074 |
| New index + ten details | 263,503 |

This is **96.8% less decoded JSON** for that initial workload. Applying the
same Brotli quality-4 settings locally gives 1,665,826 bytes before versus
30,846 bytes after. This is a reproducible payload projection, not a claim
about live latency or the exact Vercel compression level. Actual new-endpoint
SQL/network latency requires readback after deployment.

## Verification scope

Tests use generated 7,311-word fixtures and injected/mocked public responses.
They cover the reported 100/10 case (7,301 unseen, 90 remaining, 30 candidates),
exhausted allowance with a nonzero unseen total, prior-day learning, sparse IDs,
bounded requests and concurrency, offline Settings, retry/idempotency/storage
failures, actual two-tab reconciliation and guest collection paging/search.
Authenticated component/API behavior is included in regression verification.
Final commands/results are recorded in the story and docs/ai-progress.md.

Final results: 833 production web/API/domain tests in 63 files pass; all 27
selected Chromium E2E pass (guest, account login, source picker and allocation).
Web/API typechecks, changed-file ESLint, production build, strict production UI
audit and diff whitespace checks pass. Existing untracked development tools and
their unrelated root-level check failures were preserved outside this patch.
