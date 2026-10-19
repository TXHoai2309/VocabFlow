# US-58 — Public guest learning

Status: IMPLEMENTED / READY FOR OWNER CHECK (owner authorized implementation in chat, 2026-10-19).

The owner reprioritized guest access for the initial public phase. Visitors can
study without registering. A dismissible recommendation explains registration
and device-local persistence. Existing account authorization remains intact.

Acceptance criteria:
- Guest default/Pathway/All count and select the complete enabled dataset like
  authenticated V2, including unclassified words outside enabled sets. Explicit
  custom/set/topic/saved/weak scopes remain restricted to the selected source.
- Home, catalog, study setup, flashcards/exercises, saved words, settings and
  progress work for a guest without provisioning an account or database learner.
- Public reads contain enabled learning content only and use the existing media
  publication policy; private APIs continue to require account authorization.
- Guest reviews reuse the pure scheduler, revision checks and review idempotency.
  Progress, saved words, settings and activity persist in versioned localStorage.
- Storage failures are visible and do not claim a successful durable save.
- Guest data stays separate from signed-in data and remains on the device after
  signup/login. Automatic cloud import is outside this slice; copy must be honest.
- Refresh restores progress; concurrent tab writes reconcile or fail visibly.

Publication authorization (2026-10-19): the owner requested committing and pushing
this feature to TXH, dev and main. Use normal fast-forward Git updates. The
existing main CI/release pipeline applies; no separate manual deployment or
database operation is included in this publication task.

## Verification — 2026-10-19

- 74 focused unit/component/API tests pass across 5 files. Scheduler/exercise
  regression suite passes 14/14 when run independently. A combined run exposed
  an intermittent existing shortcut test; the isolated rerun passed.
- Six guest Chromium E2E pass: persistent flashcard progress/reload/signup entry,
  mobile keyboard/navigation, storage failure, content retry, actual two-tab
  stale-answer reconciliation, and typing exercise persistence.
- Expanded authenticated/guest E2E: 11/12 pass. The inherited US-05 summary test
  expects old labels ("Đã ôn tập"/"Lượt ôn lại") while the existing summary uses
  "Từ đã ôn"/"Cần ôn lại". No summary implementation was changed.
- Broad web/API/domain regression: 810 pass, one existing untracked development
  preview test fails on duplicate Source note text. No development editor was changed.
- Web/API typecheck, changed-file ESLint, pnpm build and git diff --check pass.
- Root pnpm typecheck still fails in existing backfill/local PostgreSQL/pending
  reconciliation scripts; root pnpm lint reports 46 existing errors in local
  release tooling, untracked development UI and scripts. These are out of scope.
- Production UI strict audit passes with explicit source ownership; see
  docs/qa/US-58-premium-ui-audit.json. Desktop/mobile screenshots were inspected.
- API/public content tests use injected data and mocked SQL results. No live
  PostgreSQL/Neon validation, database mutation, migration, push or deployment.

## Operational boundary

The public catalog is fetched online and shared in memory for the current page.
This is not a full offline/PWA mode. Durable guest writes require localStorage
and Web Locks (HTTPS/localhost in supported browsers). Unsupported/blocked/full
storage surfaces a persistent error and keeps the answer retryable. Guest
history stays separate from account history; no automatic upload or merge.

## Owner-approved performance and New-count correction — 2026-10-19

Status: IMPLEMENTED / READY FOR OWNER CHECK. The owner requested fixing the deployed loading audit and
the guest New metric shown as 100 minus 10, then publishing to Git.

- Guest `newCount` is the actual distinct unseen vocabulary count in scope,
  independent of daily goals/limits. `dailyNewRemaining` is the current daily
  allowance clipped to available New. The candidate queue respects that
  allowance and the requested capacity; it excludes learned IDs, never skips
  an offset equal to the total learned count. Previously learned days do not
  consume today's allowance. Due-before-New and scheduler rules remain intact.
- Replace the startup full-content catalog with a public ID/level/membership
  index. Full content is fetched in bounded batches of at most 60 IDs with at
  most two simultaneous batches; browse/collections/search use bounded pages.
- Settings, activity/history, rewards, reset and unsave run locally without
  fetching content. Existing guest storage survives unchanged; cache snapshots
  are reused while writes clone the snapshot and commit under the existing lock.
- Guest collections use 30-row server pages, URL state and cancelable/IME-safe
  search; account collection behavior and authorization remain compatible.
- New public queries retain dataset/enabled predicates and the existing media
  sanitizer; no private identity/progress data enters public responses.
- Acceptance includes 7,311-word budgets, total-versus-daily counts, sparse ID
  selection, offline Settings, bounded requests and authenticated regressions.

Correction verification: 833/833 production web/API/domain tests pass across
63 files (excluding the unrelated untracked development preview). All 27 selected
Chromium E2E pass: guest learning/scale/offline/two-tab/paging, login, source
picker at 320/390/768/1440px and mixed allocations. Web/API typechecks,
changed-file ESLint, pnpm build and strict production UI audit pass. Same-data
payload projection drops 8,140,988 bytes to 263,503 bytes for index + ten Home
details (96.8% less); see the loading-performance-fix QA report. This is not
a live post-deployment latency claim. No direct DB write/migration was run.

## Guest/account dataset parity correction — 2026-10-19

Owner authorized matching the account V2 enabled-dataset queue. Default,
Pathway and All no longer require set membership; explicit collection filters
remain. Scale fixtures now reflect the deployed 7,311 enabled / 6,717 assigned
split. With ten learned, Home reports 7,301 New and 90 daily remaining. A browser
test also learns/saves/restores a word with no sets at all. No data backfill.

Verification: 28/28 guest unit tests; 24/24 Chromium guest, source-picker and
allocation E2E; Web typecheck, focused ESLint, production build and diff checks
pass. Existing Node-version and bundle-size warnings remain. Publication uses
the owner's previously requested TXH/dev/main branches and existing CI pipeline.
