# US-58 — Public guest learning

Status: IMPLEMENTED / READY FOR OWNER CHECK (owner authorized implementation in chat, 2026-10-19).

The owner reprioritized guest access for the initial public phase. Visitors can
study without registering. A dismissible recommendation explains registration
and device-local persistence. Existing account authorization remains intact.

Acceptance criteria:
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
