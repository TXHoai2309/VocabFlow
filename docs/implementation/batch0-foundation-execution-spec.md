# BATCH 0 Foundation Execution Specification v1.0

- Status: ACCEPTED / FROZEN
- Version: v1.0
- Source baseline: `VocabFlow_BATCH0_Foundation_Execution_Spec_v1.0.docx`
- Canonical format: Markdown
- Last synchronized: 2026-09-08

**VOCABFLOW**

# BATCH 0 Foundation
Execution Specification v1.0

Family Learning MVP

| **Mục** | **Giá trị** |
| --- | --- |
| Status | FROZEN / READY FOR IMPLEMENTATION |
| Scope | TE-01 → TE-13 only |
| Product baseline | VocabFlow Family MVP Product Specification v1.0 |
| Architecture baseline | VocabFlow Technical Architecture v1.0.4 |
| UI baselines | Global Design System v1.0.2 + Feature UI Spec v1.0.1 + User Flow v1 |
| Primary runtime | Cloudflare Worker + Hono + Neon PostgreSQL |
| Execution rule | Stop after BATCH 0; do not begin US-01 automatically |

> **Foundation objective
> **Khóa repository, runtime, database, authentication infrastructure, contracts, testing và CI đủ chắc để bắt đầu product implementation mà không tự ý đổi stack hoặc database safety contract.

# 0. Scope & Frozen Decisions

BATCH 0 chỉ dựng foundation. Không implement Register/Login/Learner/Study business flow, scheduler, review queue hoặc progress UI.

| **Layer** | **Frozen decision** |
| --- | --- |
| Tooling | Node.js 22 LTS; pnpm pinned; TypeScript strict; ESLint |
| Frontend | React + Vite + React Router Declarative Mode + Tailwind |
| Backend | Cloudflare Workers + Hono + Cloudflare Vite Plugin |
| Database | Neon PostgreSQL + Neon HTTP default + Drizzle ORM/Kit |
| Auth | Better Auth + Drizzle adapter |
| Contracts | Zod shared contracts + canonical API error envelope |
| Testing | Vitest + React Testing Library + Workers test env + Playwright |
| CI | GitHub Actions; frozen lockfile; lint/typecheck/test/build/smoke |

• Không đưa Next.js, Supabase, Firebase, D1, Redux/Zustand, Docker, Redis, PWA offline write sync, microservices hoặc AI vào BATCH 0.

• Node 22 là tooling runtime; production API runtime là Cloudflare Workers.

• Mọi thay đổi frozen architecture cần blocker/evidence; package/config adjustment giữ invariant thì không cần mở lại quyết định.

# 1. Execution Order & Batch Gate

```text
TE-01 → TE-02 → TE-03 → TE-04 → TE-05 → TE-06 → TE-07 → TE-08
       → re-verify clean migrations → TE-09 → TE-10 → TE-11 → TE-12 → TE-13 → STOP
```

> **Stop rule
> **Khi TE-13 hoàn tất, Codex phải trả report PASS / FAIL / BLOCKED và dừng. Không tự triển khai US-01.

# 2. TE-01 → TE-13 Execution Specifications

## TE-01 — Initialize pnpm monorepo

**Objective: **Create repository/workspace skeleton.

**Requirements:**

• Git repository hợp lệ; apps/web, apps/api, packages/learning-domain, packages/contracts.

• Commit pnpm-lock.yaml; packageManager pin pnpm version và đồng bộ lockfile.

• Root scripts gọi package scripts được; không circular dependency.

**Acceptance:**

• pnpm install PASS; pnpm install --frozen-lockfile PASS sau khi lockfile tồn tại.

• Workspace packages được pnpm detect; git status chạy được.

## TE-02 — Pin Toolchain + Configure Lint

**Objective: **Make tooling deterministic.

**Requirements:**

• Node.js 22 LTS; .nvmrc = 22; packageManager pin pnpm.

• Shared tsconfig strict; không nới strict chỉ để suppress error.

• Configure ESLint shared cho web/api/packages; root pnpm lint chạy non-interactive.

**Acceptance:**

• Node major = 22; pnpm version đúng pin; pnpm lint PASS; pnpm typecheck PASS.

## TE-03 — React + Vite + Router SPA

**Objective: **Create browser foundation without product screens.

**Requirements:**

• React + Vite + TS + React Router Declarative Mode + Tailwind.

• Minimal root route và nested route phục vụ smoke; deep-link deployment fallback được hỗ trợ.

**Acceptance:**

• web dev chạy; root/nested route render; production build PASS; refresh nested route không deployment 404.

## TE-04 — Hono + Cloudflare Worker same-origin

**Objective: **Create Worker/API foundation.

**Requirements:**

• Hono trên Cloudflare Worker; Cloudflare Vite Plugin; /api/* Worker; SPA/static same origin.

• GET /api/health trả deterministic JSON 200; unknown /api/* trả API 404, không fall through index.html.

**Acceptance:**

• /api/health PASS; same-origin local/preview PASS; production build PASS; không tạo Node production server.

## TE-05 — Neon PostgreSQL connectivity

**Objective: **Establish safe dev/test DB connectivity.

**Requirements:**

• Neon HTTP default; DB access qua infrastructure module; secrets server-only.

• Local chỉ dùng verified development target; trusted DB integration chỉ dùng verified test target.

**Acceptance:**

• SELECT 1/equivalent trên dedicated dev/test Neon PASS; missing config fail rõ; không leak database secret frontend.

## TE-06 — Drizzle + Migration Pipeline

**Objective: **Establish migration infrastructure under the official identity contract.

**Requirements:**

• Drizzle ORM/Kit PostgreSQL; committed migration directory; generate/migrate/check commands.

• Official clean migration: trusted metadata bootstrap → identity-provision → verified identity v1 → empty application schema → migrate 0→latest.

• db:reset chỉ reset explicit application schema allowlist và giữ nguyên vocabflow_meta/environment_identity.

• Migration role chỉ SELECT identity metadata; không được sửa protected identity.

**Acceptance:**

• Fresh verified test branch flow PASS; reset giữ identity; migrate 0→latest lần hai PASS.

• Concurrent identity-provision test PASS; production database không được dùng.

## TE-07 — Environment & Secrets

**Objective: **Define fail-closed configuration boundary.

**Requirements:**

• VOCABFLOW_ENV và DATABASE_ENV ∈ development|test|production và phải bằng nhau.

• Execution contexts: local-development, ci-test, cloudflare-production; context phải match markers.

• Test integration bắt buộc NEON_TEST_DATABASE_URL; không fallback DATABASE_URL.

• .env.example placeholder only; DATABASE_URL, NEON_TEST_DATABASE_URL, BETTER_AUTH_SECRET không VITE_*.

**Acceptance:**

• Environment guard matrix PASS; frontend build không chứa giá trị secret; missing/invalid/mismatch fail fast.

## TE-08 — Better Auth Foundation

**Objective: **Configure auth infrastructure only.

**Requirements:**

• Better Auth + Drizzle adapter; Better Auth owns user/session/account/verification; mount /api/auth/*.

• Không tạo duplicate custom auth tables; không làm auth UI.

• Sau auth migrations phải chạy lại official clean migration verification từ fresh verified test branch.

**Acceptance:**

• Auth server initializes; auth schema migration tồn tại; /api/auth/* mounting works; clean migration after auth PASS.

## TE-09 — Shared Contracts & API Errors

**Objective: **Create contract boundary.

**Requirements:**

• packages/contracts dùng Zod; web/api import shared DTO mà không phụ thuộc Worker internals.

• Canonical error envelope: { error: { code, message, details? } }; không raw stack/database error production.

• Seed code set: UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR, NOT_FOUND, IDEMPOTENCY_CONFLICT, STALE_REVISION, INTERNAL_ERROR.

**Acceptance:**

• Sample shared contract imported by web+api; invalid input/error test PASS.

## TE-10 — Vitest + React Testing Library

**Objective: **Establish unit/component tests.

**Requirements:**

• Vitest + DOM environment + setup; root test command; at least one pure unit and one React behavior test.

**Acceptance:**

• Tests PASS locally and non-interactively; behavior-focused React Testing Library usage.

## TE-11 — Worker/API Integration Tests

**Objective: **Test Hono/Worker routing.

**Requirements:**

• Workers-compatible test setup; no unrelated Node production server.

• Test /api/health 200 + expected JSON; unknown /api route → API 404, not SPA HTML.

**Acceptance:**

• Worker/API integration tests PASS in clean execution.

## TE-12 — Playwright Production-Preview Smoke

**Objective: **Establish browser E2E infrastructure.

**Requirements:**

• Build first; run smoke against production-like/Cloudflare-compatible preview, not dev-only HMR.

• Open root, navigate nested SPA route, refresh nested route, test /api/health and unknown /api 404.

**Acceptance:**

• pnpm build PASS; Chromium headless smoke PASS; SPA deep-link + API routing PASS.

## TE-13 — GitHub Actions CI

**Objective: **Create foundation quality gate.

**Requirements:**

• Checkout → Node 22 → pinned pnpm → pnpm install --frozen-lockfile → lint → typecheck → tests → build → install Chromium → Playwright smoke.

• pull_request core checks run without DB secret; fork/untrusted PR receives no DB secret and does not use pull_request_target.

• Trusted main/internal DB job uses NEON_TEST_DATABASE_URL only; serialize shared mutable test branch with concurrency lock.

**Acceptance:**

• Core CI PASS. DB job reports PASS / SKIPPED_NO_TEST_DATABASE_SECRET / FAIL explicitly.

# 3. Environment & Execution Context Contract

Environment marker và execution context là hai lớp khác nhau. Equality của marker không đủ để chứng minh context hoặc database target.

| **Execution context** | **Required markers** | **Allowed DB variable** | **Database target** |
| --- | --- | --- | --- |
| local-development | development / development | DATABASE_URL | Verified development allowlist target |
| ci-test | test / test | NEON_TEST_DATABASE_URL | Verified dedicated/disposable test target |
| cloudflare-production | production / production | DATABASE_URL | Verified production target |

• Mọi combination khác fail fast. local shell không được tự chứng minh cloudflare-production chỉ bằng env string.

• CI test thiếu NEON_TEST_DATABASE_URL: trước khi DB job bắt đầu → SKIPPED_NO_TEST_DATABASE_SECRET; nếu job đã bắt đầu → FAIL. Không fallback.

• Target allowlist đến từ committed non-secret/protected configuration độc lập với connection secret.

• Secret values không log, không VITE_*, không xuất hiện trong client bundle.

## 3.1 Central environment validator

> validateEnvironment({
>   executionContext,
>   environment,
>   expectedDatabaseTarget,
>   verifiedDatabaseTarget,
>   operation,
>   invocation
> })

Validator phải fail-closed khi context, marker, DB variable, target identity hoặc operation permission không xác minh được.

| **Operation** | **Development** | **CI Test** | **Production BATCH 0** |
| --- | --- | --- | --- |
| worker-start / db-connect | Allowed on verified dev | DB runner only as needed | Allowed runtime on verified prod |
| identity-provision | Explicit only | Explicit only | Out of scope |
| db-migrate | Explicit | Explicit | Out of scope |
| db-reset | Explicit dev only | Explicit test only | Forbidden |
| db-seed | Explicit/controlled | Explicit/controlled | Out of scope |
| integration-test | Optional local | Allowed trusted test target | Forbidden |

# 4. Database Target Identity & Ownership

Expected DatabaseTarget và Verified DatabaseTarget phải được so sánh; connection URL tự nó không phải security boundary.

```text
type DatabaseTarget = {
  environment: "development" | "test" | "production";
  provider: "neon";
  projectId: string;
  branchId: string;
  identityVersion: 1;
};
```

BATCH 0 dùng trusted control-plane/provider evidence để bootstrap target identity, sau đó runtime/tooling đọc canonical metadata trong database.

## 4.1 Protected identity metadata

> vocabflow_meta.environment_identity
> 
> id SMALLINT PRIMARY KEY CHECK (id = 1)
> environment TEXT NOT NULL
> provider TEXT NOT NULL CHECK (provider = 'neon')
> project_id TEXT NOT NULL
> branch_id TEXT NOT NULL
> identity_version INTEGER NOT NULL
> created_at TIMESTAMPTZ NOT NULL

• Canonical state có đúng một row id=1; BATCH 0 hỗ trợ identity_version=1.

• Missing/malformed/unsupported/mismatch → FAIL/BLOCKED; normal provisioning không auto-repair.

## 4.2 Role model: 4 roles + 1 one-shot credential

| **Principal** | **Role / permission boundary** |
| --- | --- |
| vocabflow_identity_owner | NOLOGIN protected owner; NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS. |
| vocabflow_identity_provision | USAGE schema + SELECT/INSERT canonical identity only; no owner membership/escalation. |
| vocabflow_migration | SELECT identity + app-schema migration privileges only; cannot create/write/drop protected metadata. |
| vocabflow_runtime | SELECT identity + minimum app runtime privileges; cannot migrate/reset/provision. |
| vocabflow_identity_bootstrap | One-shot trusted DDL credential: create owner/schema/table/constraints, transfer ownership, grant/revoke, then disable/drop/rotate. |

• PUBLIC không được CREATE trong vocabflow_meta; no default privilege cho phép runtime/migration/provision role tự động ghi protected objects.

• Provision/migration/runtime role đều phải bị DENIED khi SET ROLE vocabflow_identity_owner.

## 4.3 Identity bootstrap & concurrency

```text
Fresh verified dev/test branch
  ↓
trusted Bootstrap DDL credential
  ↓
create owner + vocabflow_meta + canonical table/constraints
  ↓
transfer ownership + revoke/public hardening
  ↓
disable/drop/rotate bootstrap credential
  ↓
identity-provision explicit
  ↓
verify canonical id=1 / identity v1
  ↓
db:migrate
```

• Concurrent identity-provision phải dùng transaction-safe coordination (advisory lock + singleton PK/CHECK là recommended) và không UPDATE mismatch.

• Two concurrent provision calls trên fresh verified target → exactly one row; cả hai resolve cùng canonical identity.

# 5. Clean Migration & Reset Contract

```text
Official clean migration definition
Fresh verified Neon dev/test branch + trusted metadata bootstrap + identity-provision + verified identity v1 + empty application schema → Drizzle migrations 0→latest.
```

```text
identity-provision
→ verify identity
→ application schema empty
→ migrate 0→latest
→ verify latest
→ db:reset application schema only
→ verify vocabflow_meta + identity unchanged
→ migrate 0→latest again
→ PASS
```

• db:migrate không tạo/fix/overwrite identity. Identity missing → DATABASE_IDENTITY_NOT_PROVISIONED / fail closed.

• db:reset dùng explicit application schema allowlist; không DROP DATABASE, không DROP/TRUNCATE/DELETE/ALTER vocabflow_meta identity, không broad CASCADE có thể chạm protected metadata.

• Production migration execution OUT OF SCOPE BATCH 0; không thêm ci-release trong foundation.

## 5.1 Required permission tests

| **Principal** | **Positive** | **Must be DENIED** |
| --- | --- | --- |
| Identity Provision | SELECT; legitimate first INSERT id=1 | UPDATE, DELETE, TRUNCATE, ALTER, DROP, CREATE in vocabflow_meta, SET ROLE owner |
| Migration | SELECT identity | INSERT, UPDATE, DELETE, TRUNCATE, ALTER, DROP, CREATE in vocabflow_meta, SET ROLE owner |
| Runtime | SELECT identity | INSERT, UPDATE, DELETE, TRUNCATE, ALTER, DROP, CREATE in vocabflow_meta, SET ROLE owner |

# 6. CI Trust & Database Job Policy

| **Trigger** | **Core CI** | **Database integration** |
| --- | --- | --- |
| pull_request | Required: frozen install, lint, typecheck, unit/component/Worker tests, build, Playwright smoke | No secret for untrusted/fork PR; may skip |
| trusted internal PR | Same core CI | May run with NEON_TEST_DATABASE_URL |
| push main | Same core CI | Run when test secret configured; failure is regression |
| production release | Core/release validation | Must have latest trusted DB integration PASS before release |

• Không dùng pull_request_target để execute untrusted code với secrets.

• Shared mutable test branch dùng GitHub Actions concurrency group; disposable branch phải unique per run và cleanup không ảnh hưởng run khác.

• DB status chính xác: PASS / SKIPPED_NO_TEST_DATABASE_SECRET / FAIL. SKIPPED không tương đương PASS và không đủ release.

# 7. Cross-cutting Definition of Done

| **Area** | **DoD** |
| --- | --- |
| Repository | Git repo hợp lệ; lockfile committed; frozen install PASS |
| Static quality | pnpm lint PASS; pnpm typecheck PASS |
| Tests | Unit + React component + Worker/API + environment guard + permission/concurrency tests PASS |
| Build/preview | pnpm build PASS; Playwright production-preview smoke PASS |
| Routing | /api/health 200; unknown /api/* API 404; nested SPA refresh không 404 |
| Database | Verified dev/test target; identity bootstrap/provision PASS; clean migration + reset + remigrate PASS |
| Security | No committed secrets; no client bundle secret leak; role escalation/protected metadata writes denied |
| Architecture | Same-origin Worker/SPA; Better Auth ownership đúng; Neon HTTP default; no forbidden stack additions |
| Scope | Không implement US-01 trở đi |

# 8. Final Report Contract

Codex phải trả report sau TE-13 và dừng:

• Status TE-01 → TE-13: PASS / FAIL / BLOCKED.

• Files created/changed grouped by task.

• Exact commands executed.

• Lint/typecheck/test/build/Playwright results.

• Environment guard tests: PASS / FAIL.

• Database target validation: PASS / FAIL / BLOCKED.

• Clean migration: PASS / FAIL / NOT_RUN.

• DB integration job: PASS / SKIPPED_NO_TEST_DATABASE_SECRET / FAIL.

• Secret leak check: PASS / FAIL.

• Any architecture deviations / unresolved warnings / technical debt.

• git status.

• Final verdict: BATCH 0 FOUNDATION: PASS or BLOCKED.

# 9. Freeze Statement

> **BATCH 0 FOUNDATION — FROZEN / READY FOR IMPLEMENTATION
> **Foundation decisions, Database & CI Environment Strategy, Database Identity Ownership Runbook và Clean Migration Contract trong tài liệu này là execution baseline. Chỉ mở lại khi implementation cung cấp blocker/evidence kỹ thuật cụ thể.
