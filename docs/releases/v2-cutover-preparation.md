# V2 cutover preparation — 2026-10-17

## 2026-10-18 — Owner decision and final release candidate

The owner accepts discarding V1 test users, accounts, sessions, learner progress, and review history, and waives a V1 backup for the future cutover. This supersedes the earlier account-continuity and backup prerequisites below. Do not retry V1 SQL after the recorded PostgreSQL `53000` quota failure.

This decision does not authorize deleting the V1 Neon database, Cloudinary V1 assets, or any Production resource. V2 Production starts with no copied auth or learning-history rows; users register through Better Auth. The V2 target remains `silent-sky-84582895 / br-cool-sea-a1ifkf95 / neondb`.

The prior Vercel deployment can be restored as a code action, but V1 database availability is unverified while the project is quota-blocked. A working V1 service or data rollback cannot be promised. Keep all V1 resources retained.

The authorized release candidate uses the V2 Development database for Vercel Preview and withholds uncleared media URLs. At this checkpoint, Production variables, aliases, deployments, Neon data, and Cloudinary resources remain unchanged. Preview verification is required before the owner GO gate.

**CUTOVER_READY=NO.** No Production env/project setting, alias, deployment or
database data was changed by this preparation.

## Existing Production

- CLI user `txhoai2309`; team `to-xuan-hoai-s-projects`; project `vocab-flow`
  (`prj_t1UOe0ORho6DQFtCEQUbkXnTE6Hx`).
- READY deployment `dpl_92xgYMhpa3PtN85ngkeMBBV3pdaK`:
  `https://vocab-flow-6vgfa4f7v-to-xuan-hoai-s-projects.vercel.app`.
- Aliases: `https://vocab-flow-steel.vercel.app` and
  `https://vocab-flow-to-xuan-hoai-s-projects.vercel.app`.
- Deployed commit `17b1c761a97bfd2fbabcdb04fa43478677dbe749`, recorded ref
  `HEAD`; Git integration Production branch `main`. Local branch is `TXH`.
- React/Vite SPA in `dist/client`; Hono + Better Auth Function `api/handler`
  in `sin1`; same-origin `/api` rewrites. No separate backend project needed.
- `DATABASE_URL` and `BETTER_AUTH_SECRET` are Vercel Secrets and cannot be
  retrieved by env pull/API. The deployed code's canonical V1 target is
  `shy-hill-72364426 / br-rough-silence-b3gbqjcb / neondb`. Neon API confirms
  that branch/endpoint. This remains configuration-based inference, not a
  verified live Secret value or SQL readback.

## V1 backup: blocked by actual quota error

Exactly one attempted SQL connection to V1 was rejected before any query:
PostgreSQL `53000`, `Your account or project has exceeded the quota. Upgrade
your plan to increase limits.` No dump/checksum exists and restore is not
verified. No retry loop or paid upgrade was performed.

The ignored local backup runner is prepared to export one repeatable-read,
read-only snapshot for both pg_dump and server-side fingerprints. When V1
access returns, take that single dump/checksum and restore into an isolated
local PostgreSQL 18 environment, comparing schema and table fingerprints.
Cutover and rollback are blocked while V1 rejects connections.

## Prepared code and Production changes

Production target metadata now selects `silent-sky-84582895 /
br-cool-sea-a1ifkf95 / neondb`. V1 IDs are retained as rollback metadata.
Bootstrap checks follow the configured target; no bootstrap/migration ran.
The explicit V2 flag requires consistent Production markers and the exact
staged endpoint with the least-privilege `vocabflow_runtime` role. Inconsistent
targets keep V2 disabled. Local Development behavior is preserved.

The deployed API withholds V2 image/audio URLs and Development media from
nested browse/detail/queue DTOs. Content and auth responses are preserved.
`.vercelignore` now explicitly excludes local secrets/backups, dataset/APKG
workspaces, Python caches and local Docker configuration.

| Production key | Proposed action |
| --- | --- |
| `DATABASE_URL` | Replace with staged V2 runtime role, pooled endpoint; value prepared privately |
| `VOCAB_DATASET_VERSION` | Add `v2` |
| `DATABASE_DRIVER` | Add `neon-http` |
| `VOCABFLOW_ENV`, `DATABASE_ENV` | Retain `production` |
| `EXECUTION_CONTEXT` | Retain `vercel-production` |
| `BETTER_AUTH_URL` | Retain `https://vocab-flow-steel.vercel.app` |
| `BETTER_AUTH_SECRET` | Keep existing Production Secret; copy no Development/test secret |

Project Node setting is `24.x`, while package engines selects major 22 and
overrides the project setting. Vercel manages patch updates; the repo requires
exact `22.23.2`. Local checks use the official checksum-verified binary.
An eventual staged Vercel build must confirm its actual patch. Do not weaken
the build guard. [Official Node selection documentation](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

No remote env update command was executed. Owner approval is required before
any Production env/settings change, deployment or promotion.

## Media and accounts

Private operator samples from staged metadata: JPEG, raw GIF and MP3 returned
HTTP 200, correct MIME, byte length and SHA256; MP3 Range returned 206. These
checks ran locally, not on a new Vercel deployment.

13,977 media assets remain unknown rights; the attestation remains
Development-only. Public media eligible is zero, so deployed V2 responses
withhold those URLs. Private local preview remains available. No rights,
mapping status, Cloudinary upload or deletion was changed.

Staged V2 has no users, accounts, sessions or learner history. Existing V1
credentials therefore cannot automatically log into V2. Owner must choose
fresh registration or separately authorize transfer of legitimate V1 accounts
and history after verified backup. Development test data must remain excluded.

## Release scope and checks

The ignored `release-source-manifest.json` lists 234 committed runtime paths
changed since V1 and hashes each local changed file. It marks 39 local files as
V2 release code. Local-only App preview routes, Vite proxies, package scripts
and authoring/recovery artifacts are excluded from the proposed release delta;
schema files are references, with no migration/import planned.

- Focused tests: **187 PASS**, 10 API/auth/queue/learning-set/guard files.
- API, web and API-entrypoint typechecks: PASS.
- Full workspace typecheck: existing failures in
  `scripts/local-development-postgres.ts` and
  `scripts/resolve-master-v2-development-pending.ts`; neither tool was run or
  included in the release delta.
- `pnpm build` using Node 22.23.2: PASS; client secret-value/source-map scans
  PASS. Client chunk approximately 588 kB minified / 165 kB gzip.
- `pnpm build:production`: correctly stopped by
  `RELEASE_SOURCE_TREE_NOT_CLEAN`. No bypass, commit, push or deployment.

## Cutover and rollback procedure

First restore V1 quota access, verify backup/restore, settle account continuity,
and approve one immutable release commit from the classified source. Apply
only the listed env/settings changes, stage one Production deployment without
assigning domains, smoke-test auth and V2 learning, then promote the exact
tested deployment after owner approval. Keep uncleared media withheld.

Retain the V1 deployment and DB. Pause writes for the cutover smoke window. If
smoke fails, roll back to `dpl_92xgYMhpa3PtN85ngkeMBBV3pdaK`; retain the original
auth Secret/origin and restore V1 DB configuration for future deployments.
Do not restore a dump over live V1. After V2 accepts user writes, rollback needs
an explicit reconciliation decision; V2 history cannot silently move to V1.

Private evidence/config: `.vocabflow-local/vercel-v2-cutover/`. Keep the proposed
env file, Vercel snapshots, backup artifacts and credentials outside Git and
deployment upload. Neon Dev and staged V2 data remain untouched.

## 2026-10-18 Preview build follow-up

The local `pnpm build:production` passed from a clean clone of release commit
`37e9dc0d53c78f1d75c42d3512b6217a5c18954e` with Node 22.23.2 and pnpm 11.17.0.
That exact SHA was pushed only to `v2-release-candidate-20261018`; Vercel
Production branch `main` remained at `17b1c761a97bfd2fbabcdb04fa43478677dbe749`.

The first Vercel Preview failed because Vercel removed 7,652 tracked files under
`vocabflow-dataset/`, as configured by `.vercelignore`, and the source mutation
guard treated those intentional omissions as source changes. The follow-up
guard excludes only that ignored directory and still blocks any modified
deployed source file. Regression tests pass. A new Preview build and end-to-end
Development smoke check remain pending. No Production environment, alias,
deployment, Neon data, or Cloudinary asset was changed.
