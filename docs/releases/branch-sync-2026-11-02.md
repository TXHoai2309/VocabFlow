# TXH/main synchronization — 2026-11-02

The owner authorized cleaning the pending workspace and pushing its intentional
source and documentation to both named branches. US93 is accepted.

## Preserved work

The initial workspace had 262 pending files. Their paths, byte counts and SHA-256
hashes were recorded locally before changes; all 262 paths still exist. Source,
canonical trackers, plans, repository skills, offline editorial tools and release
handoffs are tracked. Environment files, credentials, provider responses,
screenshots, traces, generated reports and one-off execution scripts remain
local and ignored. No vocabulary/media data was deleted or published by cleanup.

The remaining local media path guards and offline tools were retained. The SQL
rehearsal now carries its own synthetic provider inputs instead of depending on
ignored live responses, retaining its localhost/development identity and
rollback-only safeguards. It was not run against a cloud database for this task.

The deployed practice/game/video code, overlapping-subtitle correction, typed
catalog publication changes and migration contents were preserved. Relative to
the previous main, the only application changes are four accepted Node-local
media source/helper/test files; the other additions are tools, trackers and docs.

## Verification

- Root build, typecheck and lint passed; client secret-value and source-map
  scans passed. The existing bundle-size advisory remains non-blocking.
- 48 focused TypeScript tests and eight offline archive safety tests passed.
  Python tooling syntax checks and git diff checks passed.
- All 21 practice/game/video tickets remain done; tracker hashes match Git bytes.
- Scanning all 1,029 tracked files before the final documentation update found
  zero configured secret values and zero private/generated artifacts.
- [Core CI 41386129647](https://github.com/TXHoai2309/VocabFlow/actions/runs/41386129647)
  passed on PR head 76a9198c02021b84b32a8be8a25b40f4ac522fe5, including full
  release tests, build and Playwright production-preview checks.

## Git publication

Commit ff70650 preserves the pending intentional source and docs. Normal merge
76a9198 brought current main into TXH, retaining current features and historical
handoffs. [PR #16](https://github.com/TXHoai2309/VocabFlow/pull/16) merged after
exact-head Core CI passed, producing 849e3b067b5cc84aa613027873a0b883518dd380.
Local TXH, local main, origin/TXH and origin/main were then verified at that same
merge with a clean working tree.

The follow-up containing this report changes documentation only and is pushed
normally to both branches. The CI evidence above belongs to the checked code
head; it is not a claim about a later documentation commit's workflow result.
Other historical branches/worktrees are retained. No force push, reset, history
rewrite, manual production deployment or cloud migration was performed for this
cleanup. Existing automatic main workflows retain their normal behavior; this
report does not claim a new production release.
