# US-55 — Development Editorial Staging Preview

- Owner-authorized scope: 2026-10-15; local recovery tooling only.
- Status: IMPLEMENTED / READY FOR OWNER CHECK.
- Dependencies: Development editorial staging schema v2 and its readback-verified recovery bundle.

## Contract

Provide an internal, read-only page at `/dev/staging-preview` to search paged
editorial staging identities and inspect DRAFT Sense fields, validation and
resolution states, effective hashes, candidate version hashes and stored
source provenance. This is a local Development tool, not an Admin CMS or a
learner-facing feature. It never links to Study, Review Scheduler or learner
content routes.

The Vite route exists only while `import.meta.env.DEV` is true. A separate API
process binds only to `127.0.0.1:3003`; it refuses startup unless explicitly
enabled with `VOCABFLOW_STAGING_PREVIEW=1`, local Development environment flags
match, the configured role/database/endpoint match the target, and Neon control
plane metadata confirms project `shy-hill-72364426`, branch
`br-square-grass-b3af0nte`, and endpoint `ep-small-shadow-b3ny4993`. Reads use
PostgreSQL `READ ONLY` repeatable-read transactions against
`vocabflow_editorial_staging` only. There are no mutation routes, SQL inputs,
CORS grants or database credentials in the browser bundle.

The UI uses paged semantic tables, URL-backed search/status/page/selection,
keyboard-accessible controls, a native button group for status filtering,
loading/error/empty states and a bounded detail view. It shows headword, POS, display form, English/Vietnamese definition,
examples/translations, usage notes, DRAFT status, content hash, pending reason,
rights state, candidate versions and stored source provenance. Raw source text
is excluded from the response.

The staging schema does not store per-identity validation findings. The page
must state that limitation and may describe only blockers directly derivable
from stored status/fields; it must not invent missing findings. `EFFECTIVE`
remains a staging identity selection, not editorial approval or publication;
rights remain `UNKNOWN_REVIEW_REQUIRED`.

## Out of scope

- Product Admin CMS, role management, editing, correction, approval or publishing.
- Runtime schema, learner APIs/data, Review Scheduler, Production or database grants.
- Source inventory text or external source fetching.
- Any change to official editorial/release gates.

## Acceptance evidence

- [x] Exact project/branch/endpoint/database/role checked before serving data.
- [x] Database connection executes in read-only repeatable-read transactions; API exposes only fixed staging SELECT queries.
- [x] Production build does not contain the page route or local API path.
- [x] Search, status filtering, paging, detail selection, effective DRAFT fields and pending candidate content work.
- [x] Pending reason is truthful where detailed per-key validation evidence is absent; missing display forms are derived from stored candidates.
- [x] No runtime, learner, Review Scheduler, or staging-write effect; existing runtime and learner table hashes match.
- [x] Typecheck, API checks, and responsive-browser checks pass at 320/390/768/1440px. ESLint was attempted but cannot load because `@babel/core` is absent from the current installed dependency graph; no dependency was installed.
- [x] No commit, push, deploy, or publication action.
