# Technical Architecture v1.0.11

- Status: APPROVED FOR IMPLEMENTATION
- Version: v1.0.11
- Source baseline: `VocabFlow_Technical_Architecture_v1.0.4.docx`; this Markdown records the US-25 identity reconciliation, US-26/US-27 vocabulary taxonomy, US-28/US-29 learning-set assignment model, US-30 daily New allowance, US-31 through US-34 exercise interaction layer, US-35/US-36 activity read model, US-39/US-40 rewards and US-41 reviewed catalog activation.
- Canonical format: Markdown
- Last synchronized: 2026-09-22

**VOCABFLOW**

**Technical Architecture v1.0.11**

## US-41 content curation and activation

`config/vocabulary-curation-v1.json` is the reviewed
`VOCABULARY_CURATION_V1` source of truth for the first 220 imported rows. The
manifest stores `(source_dataset, source_record_id, expectedWord)`, explicit
Grade 1–3 labels, canonical topic slugs, ordered learning-set membership and
an activation decision for every row. The allow-list and deterministic
selection policy are kept in `scripts/vocabulary-curation.ts`.

The default `pnpm vocab:curate` path is local, read-only and validates the
source/media gate without opening a database connection. Activation is a
single trusted-CI transaction only: it verifies the existing source row and
both resolved media URLs, enables and grades only manifest rows, upserts the
eleven set definitions/items, and adds the 30 starter topic memberships. It
never inserts `learner_learning_sets`, changes starter identity/content
version, or mutates progress, review events, XP or achievement state. Repeating
the transaction converges to the same state.

## US-39 / US-40 reward layer

The reward layer is downstream from canonical review persistence. `xp_events`
is immutable evidence with unique reward identity; `achievements` is catalog
reference data and `learner_achievements` is an immutable once-only unlock
record. Totals and level are derived at read time. These tables never influence
learner progress, the scheduler, due dates or queue eligibility.

An optional discriminated exercise submission reaches the same canonical review
write. The server verifies selected meaning/identity or typed word against the
target vocabulary, rejects a client result mismatch, and inserts the 5-XP
`EXERCISE_CORRECT` event only alongside a successful correct scheduled review.
Typed input is never persisted. Trusted DB fixture teardown deletes
`learner_achievements` and `xp_events` before their learner parent; the global
achievement catalog is reference data and is not fixture-cleaned.

## US-37 / US-38 progress read models

Weekly/daily analytics derives directly from `review_events.review_date` and
the canonical event fields; current topic progress derives from enabled
vocabulary, active learner learning-set assignments, `vocabulary_topics` and
`learner_progress`. Neither model persists mutable counters. Range buckets use
the existing household-local review-date snapshot and zero-fill occurs after a
single range aggregation. Topic Due is an overlapping current-state subset.

**Family Learning MVP**

| **Status** | APPROVED FOR IMPLEMENTATION; US-25 through US-41 catalog, taxonomy, learning-set, exercise, activity, reward and activation contracts recorded |
| --- | --- |
| **Architecture** | React SPA + Hono API + PostgreSQL |
| **Primary persistence** | Neon PostgreSQL |
| **Decision baseline** | Family MVP Product Spec v1.0 + Tech Stack v1.3 |
| **Verification state** | Acceptance gates verified during implementation |

Mục tiêu: khóa kiến trúc kỹ thuật đủ chi tiết để triển khai Family MVP mà không phải quyết định lại stack, data flow, auth, authorization hoặc cơ chế ghi tiến trình trong lúc code.

# 0. Document Control

| **Mục** | **Giá trị** |
| --- | --- |
| Document | VocabFlow Technical Architecture v1.0.11 |
| Target release | Family MVP / vertical slice đầu tiên |
| Status | APPROVED FOR IMPLEMENTATION |
| Verification status | Architecture Acceptance Gates được xác minh trong quá trình triển khai; sau khi P0 gates PASS có thể đổi trạng thái thành ARCHITECTURE VERIFIED. |
| Product baseline | VocabFlow Family MVP Product Specification v1.0 |
| Tech baseline | React + Vite + TypeScript; Cloudflare Workers + Hono; Neon PostgreSQL; Drizzle; Better Auth |
| Không thuộc v1 | Offline write queue, advanced gamification, R2 bắt buộc, admin CMS, notifications, AI, study_sessions |

# 1. Executive Summary

VocabFlow là web học từ vựng cho một hộ gia đình. Một tài khoản phụ huynh quản lý nhiều learner profile; mỗi learner có tiến trình, review queue và lịch sử review riêng. PostgreSQL là nguồn dữ liệu bền vững. Backend là authority cho scheduler transition và mọi write liên quan đến progress; client chỉ gửi hành động học và expected revision.

> **Architecture invariant**
> Một review chỉ được xem là đã lưu khi backend xác thực user, xác minh learner thuộc household, kiểm tra idempotency/revision, tính scheduler và hoàn tất atomic write vào PostgreSQL.

## 1.1 Architecture goals

- Cho phép các em dùng nhiều thiết bị mà không mất tiến trình.

- Giữ learning-domain độc lập với React, Hono, Drizzle và Neon.

- Chống double-click, retry, cùng reviewId chạy đồng thời và stale update.

- Giữ frontend/backend cùng origin để đơn giản hóa cookie, CORS và deployment.

- Không đưa offline conflict resolution hoặc infrastructure enterprise vào Family MVP.

## 1.2 Non-goals

- Không hỗ trợ offline write queue trong vertical slice đầu.

- Không có teacher/classroom, leaderboard, social, payment hoặc public user-generated content.

- Không tối ưu cho hàng triệu user trong Family MVP.

- Không dùng Next.js/SSR chỉ để chuẩn bị cho SEO tương lai.

# 2. Frozen Technology Stack

| **Layer** | **Decision** | **Vai trò** |
| --- | --- | --- |
| Tooling | Node.js 22 LTS + pnpm | Build, scripts, CI, workspace |
| Workspace | pnpm monorepo | Chia sẻ domain/contracts giữa web và API |
| Frontend | React + Vite + TypeScript strict | SPA học từ vựng |
| Routing | React Router - Declarative Mode | Client-side routing |
| UI | Tailwind + shadcn/ui + Radix + Lucide | Design system và primitives |
| Backend | Cloudflare Workers + Hono | Same-origin API /api/* |
| Database | Neon PostgreSQL | Persistent source of truth |
| Database layer | Drizzle ORM + Drizzle Kit | Schema, query, migrations |
| Driver | Neon HTTP mặc định | Non-interactive/atomic DB operations |
| Auth | Better Auth + Drizzle adapter | Parent authentication |
| Validation | Zod | Request/response/dataset contracts |
| Client cache | IndexedDB + Dexie (incremental) | Vocabulary/settings/recent snapshot |
| Testing | Vitest + RTL + Workers env + Playwright | Unit, integration, E2E |
| Deployment | Cloudflare Workers + Static Assets | FE + API cùng origin |
| Media | Provider-neutral manifest/map; Cloudinary hiện tại, R2 là lựa chọn tương lai | Ảnh/audio ngoài DB; DB chỉ lưu URL/key |

> **Stack change rule**
> Không đổi framework, database hoặc auth provider trừ khi có blocker được chứng minh bằng spike/test. “Có thể cần sau này” không phải lý do đổi stack.

# 3. System Context & Deployment Topology

```text
                         Browser
                           |
                    React / Vite SPA
                           |
               +-----------+-----------+
               |                       |
          Local UI/cache            /api/*
          IndexedDB/Dexie              |
                                       v
                               Cloudflare Worker
                                     Hono
                                       |
                            +----------+----------+
                            |                     |
                       Better Auth           VocabFlow API
                            |                     |
                            +----------+----------+
                                       |
                                     Drizzle
                                       |
                                 Neon PostgreSQL
```

## 3.1 Same-origin routing

| **Path** | **Handler** | **Quy tắc** |
| --- | --- | --- |
| /api/auth/* | Better Auth via Hono | Worker xử lý trước |
| /api/* | Hono API | Worker xử lý trước |
| /media/*, hashed assets | Cloudflare Static Assets | Versioned/cache immutable khi phù hợp |
| /* navigation | React SPA | SPA fallback về index.html |

## 3.2 Cloudflare configuration requirements

- Dùng Cloudflare Vite Plugin để local runtime gần production.

- SPA fallback cấu hình `single-page-application`.

- Worker ưu tiên Web APIs; Node.js 22 là tooling runtime, không phải server runtime đầy đủ.

- Pin compatibility_date; chỉ bật nodejs_compat khi dependency yêu cầu và đã test.

- Trusted origins/cookie configuration phải có cho production domain và localhost development.

# 4. Repository & Module Boundaries

```text
vocabflow/
├─ apps/
│  ├─ web/                  React/Vite SPA
│  └─ api/                  Hono Worker
├─ packages/
│  ├─ learning-domain/      scheduler, date, session rules, domain types
│  └─ contracts/            Zod schemas + shared API DTOs
├─ drizzle/
│  ├─ migrations/
│  └─ seed/
├─ scripts/
│  └─ validate-dataset.ts
├─ pnpm-workspace.yaml
├─ package.json
└─ pnpm-lock.yaml
```

## 4.1 Dependency rules

| **Module** | **Được phụ thuộc** | **Không được phụ thuộc** |
| --- | --- | --- |
| learning-domain | TypeScript standard library | React, Hono, Drizzle, Neon, Better Auth |
| contracts | Zod + domain enums/types | UI framework, DB implementation |
| web | domain, contracts, API client, UI libs | Drizzle schema/Neon trực tiếp |
| api | domain, contracts, Drizzle, Better Auth | React components |
| db/schema | Drizzle pg-core | React/browser APIs |

> **Boundary rule**
> Frontend không gọi Neon/Drizzle trực tiếp. Learning-domain không biết storage nằm ở đâu. API không tin state transition do client gửi lên.

# 5. Data Architecture

## 5.1 Runtime source of truth

PostgreSQL là runtime source of truth cho account, household, learner, vocabulary runtime content, learner progress và review history.

- JSON dataset là source artifact để validate/version/seed, không phải runtime database song song.

- Ảnh/audio nằm ngoài PostgreSQL; DB chỉ lưu URL/key.

- IndexedDB chỉ là cache và không được quyết định canonical progress.

- `vocabularies.id` là canonical application/database identity. External source
  identity nằm riêng ở `source_dataset` và `source_record_id`.

- Legacy/starter rows có thể để hai source field NULL; imported rows dùng một
  dataset identifier ổn định và source record number gốc.

- `learner_progress.vocabulary_id` và `review_events.vocabulary_id` luôn tham
  chiếu `vocabularies.id`, không tham chiếu external source ID.

## 5.2 Ownership boundary

| **Table** | **Ownership** | **Purpose** |
| --- | --- | --- |
| user / session / account / verification | Better Auth | Authentication/session lifecycle |
| households | VocabFlow | Đơn vị gia đình + timezone |
| household_members | VocabFlow | Liên kết auth user với household và role |
| learner_profiles | VocabFlow | Hồ sơ từng em nhỏ |
| vocabularies | VocabFlow | Runtime vocabulary content and nullable source-honest level |
| topics | VocabFlow | Enabled canonical topic catalog and source provenance |
| vocabulary_topics | VocabFlow | Normalized vocabulary-to-topic many-to-many mapping |
| learning_sets | VocabFlow | Enabled curated learning-set catalog and stable ordering |
| learning_set_items | VocabFlow | Ordered many-to-many vocabulary membership |
| learner_learning_sets | VocabFlow | Household-authorized learner/set assignment state |
| learner_progress | VocabFlow | Canonical state hiện tại của learner/từ |
| review_events | VocabFlow | Immutable history + idempotency snapshot |

## 5.3 Schema contract - exact types and nullability

Better Auth schema không được chép lại thủ công trong tài liệu. Bảng dưới đây chỉ khóa các bảng VocabFlow sở hữu; tên/type của auth tables theo schema generated bởi Better Auth version đã pin.

| **Table / column** | **PostgreSQL type** | **Null / default** | **Notes** |
| --- | --- | --- | --- |
| households.id | uuid | PK, NOT NULL | Stable household id |
| households.primary_owner_user_id | text | NOT NULL, UNIQUE | FK -> Better Auth user.id; race barrier cho default household bootstrap |
| households.name | text | NOT NULL | Tên hiển thị |
| households.timezone | text | NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' | IANA timezone |
| households.created_at / updated_at | timestamptz | NOT NULL DEFAULT now() | Audit timestamps |
| household_members.household_id | uuid | NOT NULL | FK -> households.id |
| household_members.user_id | text | NOT NULL | FK -> Better Auth user.id |
| household_members.role | household_role | NOT NULL DEFAULT OWNER | OWNER \| PARENT |
| household_members.created_at | timestamptz | NOT NULL DEFAULT now() | Membership audit |
| learner_profiles.id | uuid | PK, NOT NULL | Learner id |
| learner_profiles.household_id | uuid | NOT NULL | FK -> households.id |
| learner_profiles.display_name | text | NOT NULL | Tên bé |
| learner_profiles.avatar_key | text | NULL | Optional |
| learner_profiles.daily_new_word_limit | integer | NOT NULL DEFAULT 10; CHECK 0..100 | Daily virtual-New allowance |
| learner_profiles.daily_learning_goal | integer | NOT NULL DEFAULT 10; CHECK 1..100 | Daily unique-reviewed vocabulary target |
| learner_profiles.enabled | boolean | NOT NULL DEFAULT true | Soft delete/disable |
| learner_profiles.created_at / updated_at | timestamptz | NOT NULL DEFAULT now() | Audit timestamps |

| **Table / column** | **PostgreSQL type** | **Null / default** | **Notes** |
| --- | --- | --- | --- |
| vocabularies.id | integer | PK, NOT NULL, generated by default as identity | Canonical application/database identity; starter IDs 1–30 are historical and preserved |
| vocabularies.word | text | NOT NULL | English word |
| vocabularies.ipa | text | NULL | Optional |
| vocabularies.vietnamese | text | NOT NULL | Nghĩa Việt |
| vocabularies.definition_en / example_en | text | NULL | Optional content |
| vocabularies.image_url / audio_url | text | NULL | Media URL/key, không lưu binary |
| vocabularies.topic | text | NULL | Optional grouping |
| vocabularies.level | vocabulary_level | NULL | GRADE_1..GRADE_5 or GENERAL; no default or inferred classification |
| vocabularies.enabled | boolean | NOT NULL DEFAULT false | Bật theo seed/set |
| vocabularies.content_version | integer | NOT NULL DEFAULT 1 | >= 1 |
| vocabularies.source_dataset | text | NULL | Stable external dataset identifier; NULL for legacy/starter rows |
| vocabularies.source_record_id | integer | NULL | Original record ID within `source_dataset`; never the DB primary key |
| vocabularies.created_at / updated_at | timestamptz | NOT NULL DEFAULT now() | Audit timestamps |
| learner_progress.learner_id | uuid | NOT NULL | FK -> learner_profiles.id |
| learner_progress.vocabulary_id | integer | NOT NULL | FK -> vocabularies.id |
| learner_progress.status | learning_status | NOT NULL DEFAULT NEW | NEW \| LEARNING \| MASTERED |
| learner_progress.consecutive_correct | bigint | NOT NULL DEFAULT 0 | CHECK 0 <= value <= Number.MAX_SAFE_INTEGER |
| learner_progress.interval_days | bigint | NOT NULL DEFAULT 0 | CHECK 0 <= value <= Number.MAX_SAFE_INTEGER |
| learner_progress.first_learned_date | date | NULL | Household-local calendar date |
| learner_progress.last_reviewed_date | date | NULL | Household-local calendar date |
| learner_progress.next_review_date | date | NULL | NULL = not scheduled |
| learner_progress.total_correct / total_incorrect | bigint | NOT NULL DEFAULT 0 | CHECK 0 <= value <= Number.MAX_SAFE_INTEGER |
| learner_progress.revision | bigint | NOT NULL DEFAULT 0 | Optimistic locking; 0 <= value <= Number.MAX_SAFE_INTEGER |
| learner_progress.updated_at | timestamptz | NOT NULL DEFAULT now() | Audit timestamp |

| **Table / column** | **PostgreSQL type** | **Null / default** | **Notes** |
| --- | --- | --- | --- |
| review_events.household_id | uuid | PK component, NOT NULL | Server-owned FK -> households.id; derived from authorized learner ownership; not client-authored |
| review_events.review_id | uuid | PK component, NOT NULL | Canonical client idempotency key within one household namespace; not globally unique |
| review_events.request_fingerprint | text | NOT NULL | Canonical payload hash; excludes reviewId and householdId |
| review_events.learner_id | uuid | NOT NULL | FK -> learner_profiles.id |
| review_events.vocabulary_id | integer | NOT NULL | FK -> vocabularies.id |
| review_events.result | review_result | NOT NULL | REMEMBERED \| FORGOTTEN |
| review_events.previous_status / new_status | learning_status | NOT NULL | Transition snapshot |
| review_events.previous_interval / new_interval | bigint | NOT NULL | Transition snapshot; 0 <= value <= Number.MAX_SAFE_INTEGER |
| review_events.expected_revision / resulting_revision | bigint | NOT NULL | Concurrency snapshot; 0 <= value <= Number.MAX_SAFE_INTEGER |
| review_events.review_date | date | NOT NULL | Derived from household timezone |
| review_events.reviewed_at | timestamptz | NOT NULL DEFAULT now() | Actual event instant |
| review_events.response_payload | jsonb | NOT NULL | Canonical response for idempotent retry |
| review_events.created_at | timestamptz | NOT NULL DEFAULT now() | Audit timestamp |

| **Table / column** | **PostgreSQL type** | **Null / default** | **Notes** |
| --- | --- | --- | --- |
| topics.id | integer | PK, NOT NULL, generated by default as identity | Canonical topic identity |
| topics.slug | text | NOT NULL, UNIQUE | Stable API/UI slug |
| topics.name / description | text | NOT NULL | Human-readable catalog copy |
| topics.sort_order | integer | NOT NULL | Non-negative deterministic browse order |
| topics.enabled | boolean | NOT NULL DEFAULT true | Disabled topics are absent from browse APIs |
| topics.source_topic | text | NULL, UNIQUE when present | Exact raw source topic value; NULL for manually authored topics |
| vocabulary_topics.vocabulary_id | integer | PK component, NOT NULL | FK -> vocabularies.id, cascade on vocabulary maintenance delete |
| vocabulary_topics.topic_id | integer | PK component, NOT NULL | FK -> topics.id, cascade on topic maintenance delete |

| **Table / column** | **PostgreSQL type** | **Null / default** | **Notes** |
| --- | --- | --- | --- |
| learning_sets.id | integer | PK, NOT NULL, generated by default as identity | Stable internal set identity |
| learning_sets.slug | text | NOT NULL, UNIQUE | Stable API/UI identifier |
| learning_sets.name / description | text | NOT NULL | Curated product copy |
| learning_sets.grade | vocabulary_level | NULL | Optional explicit curation label; never inferred from imported rows |
| learning_sets.enabled | boolean | NOT NULL DEFAULT true | Disabled sets are absent from catalog and queue eligibility |
| learning_sets.sort_order | integer | NOT NULL, CHECK >= 0 | Deterministic catalog order |
| learning_set_items.learning_set_id | integer | PK component, NOT NULL | FK -> learning_sets.id, cascade when a set is removed |
| learning_set_items.vocabulary_id | integer | PK component, NOT NULL | FK -> vocabularies.id, no cascade that can remove content/history |
| learning_set_items.sort_order | integer | NOT NULL, CHECK >= 0 | Per-set vocabulary order |
| learner_learning_sets.learner_id | uuid | PK component, NOT NULL | FK -> learner_profiles.id |
| learner_learning_sets.learning_set_id | integer | PK component, NOT NULL | FK -> learning_sets.id |
| learner_learning_sets.active | boolean | NOT NULL DEFAULT true | Assignment toggle used by queue eligibility |
| learner_learning_sets.created_at / updated_at | timestamptz | NOT NULL DEFAULT now() | Assignment audit timestamps |

## 5.4 Enumerations

| **Enum** | **Allowed values** | **Rule** |
| --- | --- | --- |
| learning_status | NEW, LEARNING, MASTERED | Stored progress state |
| review_result | REMEMBERED, FORGOTTEN | Only client learning action accepted |
| household_role | OWNER, PARENT | No ADMIN/TEACHER/CHILD_USER in Family MVP |
| vocabulary_level | GRADE_1, GRADE_2, GRADE_3, GRADE_4, GRADE_5, GENERAL | Nullable on vocabularies; source data may remain unclassified |

## 5.5 Constraints & indexes

| **Object** | **Constraint / Index** | **Lý do** |
| --- | --- | --- |
| learner_progress | UNIQUE (learner_id, vocabulary_id) | Một canonical progress record/từ/learner |
| learner_progress | INDEX (learner_id, next_review_date) | Review queue |
| learner_progress | revision >= 0 AND revision <= Number.MAX_SAFE_INTEGER | Optimistic locking within the JavaScript safe-integer domain |
| review_events | PRIMARY KEY (household_id, review_id) | Household-scoped idempotency; review_id is not globally unique |
| review_events | INDEX (learner_id, reviewed_at) | Dashboard/history |
| review_events | INDEX (learner_id, vocabulary_id, reviewed_at) | History từng từ |
| vocabularies | UNIQUE (source_dataset, source_record_id) | Idempotent source reconciliation; nullable legacy fields remain allowed |
| topics | UNIQUE (slug), UNIQUE (source_topic) | Stable canonical topic identity and exact source mapping |
| vocabulary_topics | PRIMARY KEY (vocabulary_id, topic_id) | Prevent duplicate membership and support many topics per vocabulary |
| learning_sets | UNIQUE (slug), INDEX (enabled, sort_order, id) | Stable curated catalog and deterministic browse |
| learning_set_items | PRIMARY KEY (learning_set_id, vocabulary_id), INDEX (learning_set_id, sort_order, vocabulary_id) | Prevent duplicate membership and preserve per-set order |
| learner_learning_sets | PRIMARY KEY (learner_id, learning_set_id), INDEX (learner_id, active, learning_set_id) | One assignment state per learner/set and efficient queue eligibility |
| households | UNIQUE (primary_owner_user_id) | Chống hai bootstrap đồng thời tạo hai default household cho cùng owner |
| household_members | UNIQUE (household_id, user_id) | Membership duy nhất |
| FKs | Explicit ON DELETE behavior | Tránh cascade mất lịch sử ngoài ý muốn |

## 5.6 Foreign keys & delete policy

- learner_profiles: soft delete bằng enabled=false; không cascade history khi thao tác bình thường.

- vocabularies: enabled=false thay vì xóa nếu đã có progress/history.

- learner_progress/review_events: không bị xóa bởi UI thông thường.

- learning_set_items may be removed with its parent set, but never deletes
  vocabulary. learner_learning_sets may be removed or toggled without touching
  learner_progress or review_events.

- Reset progress là action riêng có confirmation.

- FK delete action được chọn explicit (RESTRICT/NO ACTION cho dữ liệu lịch sử); hard delete chỉ dành cho maintenance hậu MVP.

Scheduler counters, intervals and revision snapshots use PostgreSQL `BIGINT` so
valid JavaScript safe integers above the PostgreSQL `INTEGER` range remain
persistable. The application logical domain remains `0 <= value <=
Number.MAX_SAFE_INTEGER` (`9007199254740991`) where applicable; `BIGINT` does
not authorize arbitrary 64-bit application values. Values returned from BIGINT
storage must be range-checked before conversion to JavaScript numbers, with no
silent precision loss.

The revision boundary is fail-closed: virtual `NEW` starts at revision `0`, a
successful first write persists revision `1`, and an existing revision `N`
advances to `N + 1`. `Number.MAX_SAFE_INTEGER - 1` may advance successfully to
`Number.MAX_SAFE_INTEGER`; a write whose current revision is already
`Number.MAX_SAFE_INTEGER` fails before scheduler execution or persistence can
produce an unsafe resulting revision. The pure scheduler remains
revision-unaware.

## 5.7 Sparse progress model & virtual NEW state

Family MVP dùng sparse progress: không tạo sẵn learner_progress cho mọi learner x vocabulary. Một từ chưa từng được review được biểu diễn bằng việc không có row progress; backend map trạng thái vắng row thành virtual NEW state.

```text
Virtual NEW state:
  status = NEW
  consecutiveCorrect = 0
  intervalDays = 0
  revision = 0
  firstLearnedDate = null
  lastReviewedDate = null
  nextReviewDate = null
  totalCorrect = 0
  totalIncorrect = 0
```

- Không pre-create ~2.000 progress rows mỗi learner. Row chỉ được materialize khi scheduled review đầu tiên được persist.

- GET progress/review queue phải coi missing row là NEW, không coi là lỗi dữ liệu.

- UNIQUE (learner_id, vocabulary_id) là race barrier khi hai first-review request cố tạo progress cùng lúc.

- Schema vẫn cho phép learning_status=NEW, nhưng normal write path tạo row đầu tiên trực tiếp ở scheduler result (LEARNING); default NEW chỉ là safe default/migration compatibility.

# 6. Authentication, Household Bootstrap & Authorization

## 6.1 Auth ownership

```text
Better Auth owns:
  user
  session
  account
  verification

VocabFlow owns:
  households
  household_members
  learner_profiles
  vocabularies
  learner_progress
  review_events
```

- Better Auth schema được generate bằng adapter chính thức của version đã pin.

- Better Auth schema và VocabFlow schema đi vào cùng Drizzle migration history.

- Không tự định nghĩa bảng `accounts` riêng gây trùng nghĩa với Better Auth `account`.

## 6.2 Household bootstrap flow

```text
Parent signup
    |
    v
Better Auth creates user + session
    |
    v
POST /api/bootstrap   (idempotent + race-safe)
    |
    v
Atomic DB bootstrap
    1. INSERT households(primary_owner_user_id, name, timezone)
       ... ON CONFLICT (primary_owner_user_id)
       -> resolve canonical household
    2. INSERT household_members(household_id, user_id, OWNER)
       ... ON CONFLICT (household_id, user_id) DO NOTHING
    |
    v
Return canonical household -> create/select learner
```

- `POST /api/bootstrap` phải idempotent cả tuần tự lẫn đồng thời: không dùng SELECT-then-INSERT làm race barrier. UNIQUE (households.primary_owner_user_id) + INSERT ... ON CONFLICT bảo đảm cùng một parent chỉ có một default household; UNIQUE (household_id, user_id) bảo đảm chỉ một OWNER membership tương ứng.

- Family MVP giả định một household chính cho parent mới; multi-household UI để sau.

- Timezone là property của household, không lấy client date làm authority cho scheduler.

## 6.3 Household authorization invariant

```text
session.user.id
      |
      v
household_members
      |
      v
household_id
      |
      v
learner_profiles.household_id
      |
      +-- match --> ALLOW
      +-- mismatch --> 403
```

> **P0 security invariant**
> Mọi API learner-scoped phải authorize ownership ở server. Biết learnerId không bao giờ đủ để đọc hoặc ghi progress.

## 6.4 Required negative tests

- Parent A không thể GET progress của Learner B thuộc Household B.

- Parent A không thể POST review cho Learner B.

- Parent A không thể lấy review queue/dashboard của Household B.

- Không session -> 401; có session nhưng không ownership -> 403.

- Hai POST /api/bootstrap đồng thời cho cùng parent -> một household, một OWNER membership, cả hai response cùng householdId.

# 7. Vocabulary Content Pipeline

```text
Source JSON / converted dataset
          |
          v
validate source identity, required fields and media references
          |
          +-- FAIL: missing/invalid source ID, duplicate source identity,
          |         missing word/Vietnamese, malformed representable fields
          +-- WARN: duplicate normalized word, missing optional fields/media
          |
          v
catalog plan: INSERT / UPDATE / SKIP by (source_dataset, source_record_id)
          |
          v
explicit --apply transaction (default is read-only dry run)
          |
          +-- new rows receive generated vocabularies.id and enabled=false
          +-- starter IDs 1–30 and learner history are not rewritten
          |
          v
vocabularies table + vocabulary_topics -> GET /api/vocabulary,
GET /api/topics and GET /api/topics/:topicId/vocabulary

US-41 reviewed activation (separate, trusted-CI-only command)
          |
          v
VOCABULARY_CURATION_V1 manifest + source/media gate
          |
          +-- exact source identity/expected word check
          +-- explicit grade/topic/set metadata
          +-- enable only manifest rows; preserve all other imported rows
          +-- upsert set items; do not create learner assignments
          +-- assert no progress/review/XP/achievement mutation
          |
          v
enabled vocabulary + learning-set membership -> existing queue/assignment APIs
```

US-26/US-27 taxonomy rules:

- `vocabularies.level` is nullable. The current imported source has no grade
  metadata, so the importer does not infer or assign a level. US-41 assigns a
  level only through its reviewed manifest; all other imported rows remain
  NULL.
- The raw legacy `vocabularies.topic` value remains preserved for source
  compatibility; canonical browse membership is stored in `topics` and
  `vocabulary_topics`.
- Migration `0006_sticky_risque.sql` seeds the 17 exact source topic values and
  maps imported rows by exact source topic. Starter rows without source topic
  remain unmapped.
- Topic browse returns enabled vocabulary only, in `vocabularies.id ASC`, and
  never reads or writes learner progress. Scheduler and review queue selection
  remain unchanged by taxonomy.

US-41 activation rules:

- The 220-row manifest is the only authority allowed to enable imported rows;
  source identity and expected word must match exactly.
- A selected row must have one resolved uploaded image and one resolved
  uploaded audio asset. Missing or unusable media aborts activation.
- Eleven ordered sets are upserted, but no learner assignment is created. The
  existing parent assignment API remains the only assignment boundary.
- The transaction snapshots starter rows, assignments, progress, review
  events, XP events and achievement rows and fails if any protected state
  changes. It is idempotent and trusted-CI-only.

US-28/US-29 learning-set and assignment rules:

- Migration `0007_modern_mysterio.sql` seeds five explicit compatibility sets.
  The `starter-vocabulary` set contains all 30 enabled starter rows. US-41
  adds eleven reviewed sets through the activation tool; imported rows outside
  its manifest remain disabled and are not inferred or bulk-enabled.
- `GET /api/learning-sets` and `GET /api/learning-sets/:id` expose enabled sets
  and enabled vocabulary in deterministic set-item order.
- Existing learners are assigned the compatibility set during migration; the
  learner-create SQL path assigns it to new learners. No queue fallback is used
  when an assignment is absent.
- Queue eligibility is `v.enabled = true` plus an `EXISTS` membership through an
  active learner assignment and enabled set. This is a set union and therefore
  deduplicates vocabulary present in multiple sets before due/new selection.
- Assignment authorization reuses household learner ownership. Unassigning
  removes only the assignment row; progress and review events remain canonical
  and reappear when the set is assigned again.

US-30 daily New allowance rules:

- `learner_profiles.daily_new_word_limit` is an integer from 0 through 100,
  defaulting to 10 for existing rows through migration and for new learners in
  the canonical learner-create statement.
- Queue admission counts distinct current `learner_progress` rows where
  `first_learned_date = householdLocalDate(now, household.timezone)`. It does
  not count review events, reinforcement or repeated review submissions.
- Queue output remains Due first. Due is never reduced by the daily New limit;
  the existing 20-Due / 10-New session selection caps remain separate.
- New eligibility remains enabled vocabulary plus an active assigned enabled
  learning set plus no current learner progress. Duplicate set membership is
  still deduplicated by the existing `EXISTS` predicate.
- Review materialization repeats the allowance check in the atomic write and
  takes a PostgreSQL transaction advisory lock keyed to the learner. This
  closes the obvious concurrent first-write bypass while keeping queue reads
  non-reserved and read-only.
- Reset deletes current progress but preserves immutable review events. Because
  consumption uses current progress lifecycle dates, reset makes those words
  virtual New again without treating old history as current progress.

## 6.7 Learner daily settings API

`GET /api/learners/:learnerId/settings` and
`PATCH /api/learners/:learnerId/settings` are authorized through the canonical
household learner ownership helper. The canonical response contains both
`dailyNewWordLimit` (0..100) and `dailyLearningGoal` (1..100). PATCH accepts one
or both strict integer fields and returns the saved canonical values;
cross-household access returns 403 and malformed values return 400.

## 6.8 Daily activity and streak read model (US-35 / US-36)

`GET /api/learners/:learnerId/activity-summary` is a read-only, authorized
learner activity endpoint. It resolves today's date with the household IANA
timezone and aggregates only persisted `review_events`, selecting
`review_date` and `COUNT(DISTINCT vocabulary_id)` grouped by date. The daily
goal is derived as `reviewedUnique >= dailyLearningGoal`; no mutable completion
flag is stored.

An active day has at least one successful persisted review event. Current streak
ends today when today is active, otherwise may end yesterday while today remains
unfinished. Longest streak is the maximum consecutive run of distinct persisted
review dates. The endpoint derives both values in memory from one grouped date
query, so reinforcement and repeated reviews cannot create extra vocabulary or
streak days. Reset and learning-set unassignment do not remove the source
history.

## 7.1 Data quality gates

| **Check** | **Severity** | **Behavior** |
| --- | --- | --- |
| Missing id / word / Vietnamese meaning | FAIL | Block seed/CI |
| Duplicate id | FAIL | Block seed/CI |
| Invalid enabled/contentVersion | FAIL | Block seed/CI |
| Duplicate normalized word | WARN | Review manually |
| Missing IPA | WARN | Card vẫn hoạt động |
| Missing audio | WARN | Disable audio control; never synthesize a fallback |
| Missing image | WARN | Ẩn image region |
| Missing example/definition | ACCEPT | Ẩn optional section |

## 7.2 Vocabulary update rule

```text
JSON source update
   |
   v
validate and resolve source/media identity
   |
   v
reconcile by (source_dataset, source_record_id)
   |
   +-- new source row -> generated DB id, enabled=false
   +-- text/media changed -> contentVersion++
   +-- existing enabled row -> preserve enabled state
   +-- progress/history preserved; no starter matching by normalized word
```

# 8. Learning Domain & Scheduler

Scheduler là pure function trong `packages/learning-domain`; backend dùng kết quả đó để persist canonical state. Server tự xác định calendar date từ household.timezone tại thời điểm review.

| **Consecutive correct** | **Interval** | **Status** |
| --- | --- | --- |
| 0 / forgotten | 1 ngày | LEARNING |
| 1 | 1 ngày | LEARNING |
| 2 | 3 ngày | LEARNING |
| 3 | 7 ngày | LEARNING |
| 4 | 14 ngày | MASTERED |
| 5+ | 30 ngày | MASTERED |

## 8.1 Scheduler rules

- REMEMBERED: tăng consecutiveCorrect và chọn interval theo bảng.

- FORGOTTEN: consecutiveCorrect=0, interval=1, status=LEARNING.

- MASTERED + FORGOTTEN: rớt về LEARNING.

- Review quá hạn: không cộng bonus ngày trễ.

- reviewDate/nextReviewDate dùng calendar date theo household.timezone; reviewedAt dùng timestamptz.

- Client không gửi newStatus/nextReviewDate để server tin trực tiếp.

## 8.2 NEW state transitions

Trạng thái NEW là domain state của từ chưa có tiến trình. Với sparse progress, NEW thường là virtual state do row chưa tồn tại. Scheduled review đầu tiên phải có transition rõ ràng:

```text
NEW + REMEMBERED
  -> status = LEARNING
  -> consecutiveCorrect = 1
  -> intervalDays = 1
  -> firstLearnedDate = today
  -> nextReviewDate = today + 1 day
  -> totalCorrect = 1, totalIncorrect = 0

NEW + FORGOTTEN
  -> status = LEARNING
  -> consecutiveCorrect = 0
  -> intervalDays = 1
  -> firstLearnedDate = today
  -> nextReviewDate = today + 1 day
  -> totalCorrect = 0, totalIncorrect = 1
```

- First scheduled review luôn materialize progress row; không có case review thành công mà row vẫn giữ NEW.

- Reinforcement evaluation sau FORGOTTEN trong cùng session là session-local feedback và không gọi POST /api/reviews; chỉ scheduled evaluation được persist/advance scheduler.

## **8.3 Session limits (product rule)**

```text
Daily session:
  due words: max 20
  new words: max 10
  max unique words: 30

If due >= 20: 20 due, 0 new
If due < 20: all due + up to 10 new
If due == 0: up to 10 new
```

## 8.4 Review Queue: due words + new words

Review Queue được tạo ở backend theo household timezone và luôn scoped theo learner hiện tại. Due words bắt buộc lọc `learner_progress.learner_id = :learnerId`; new words dùng LEFT JOIN chỉ với progress của chính learner đó.

```text
Due words:
  SELECT ...
  FROM learner_progress
  JOIN vocabularies
    ON vocabularies.id = learner_progress.vocabulary_id
  WHERE learner_progress.learner_id = :learnerId
    AND learner_progress.next_review_date <= :today
    AND vocabularies.enabled = true
  ORDER BY learner_progress.next_review_date ASC, vocabularies.id ASC
  LIMIT 20

New words (sparse progress):
  SELECT ...
  FROM vocabularies
  LEFT JOIN learner_progress
    ON learner_progress.vocabulary_id = vocabularies.id
   AND learner_progress.learner_id = :learnerId
  WHERE vocabularies.enabled = true
    AND learner_progress.vocabulary_id IS NULL
  ORDER BY vocabularies.id ASC
  LIMIT 10
```

- Due priority: nếu due >= 20 thì không lấy new; nếu 0 < due < 20 thì lấy tất cả due (tối đa 20) + tối đa 10 new; nếu due = 0 thì tối đa 10 new.

- The 10-New selection cap is also bounded by
  `max(0, daily_new_word_limit - consumedToday)`. `consumedToday` is the
  distinct current-progress lifecycle count for the household-local date; the
  progress summary's global New count is not changed.

- Ordering của new words phải deterministic để reload/retry không đổi ngẫu nhiên tập từ trong cùng dữ liệu/version.

# 9. Review Write Architecture

> **Critical path**
> POST /api/reviews là write path quan trọng nhất: authentication + authorization + idempotency + optimistic locking + atomic persistence phải cùng đúng.

## 9.1 Client request contract

```text
POST /api/reviews

{
  "reviewId": "uuid",
  "learnerId": "uuid",
  "vocabularyId": 123,
  "result": "REMEMBERED",
  "expectedRevision": 4
}
```

`householdId` is intentionally absent from this request. The server derives it
from the authenticated user's membership and authorized learner ownership;
the client cannot author or override it. `reviewId` and `learnerId` are
validated and canonicalized UUIDs. `reviewId` is unique only within the
derived household namespace, so the same canonical review ID may be persisted
independently by another household.

## 9.2 Read/compute/write boundary

```text
A. Read / compute in Worker
   1. Authenticate session
   2. Authorize learner -> household
   3. Pre-check (household_id, reviewId) in the authorized household
      - same fingerprint -> 200 canonical response, NO scheduler or mutation
      - different fingerprint -> 409 IDEMPOTENCY_CONFLICT, no mutation
   4. Read learner_progress by (learnerId, vocabularyId)
      - row exists -> use canonical stored progress
      - row missing -> construct virtual NEW state, revision = 0
   5. Verify expectedRevision against stored/virtual revision
   6. Resolve today from household.timezone
   7. Run scheduler in Worker

B. Atomic write in PostgreSQL
   Existing progress branch:
      conditional UPDATE WHERE revision = expectedRevision
      + INSERT review_event from successful update

   First-review sparse branch:
      allowed only when row missing AND expectedRevision = 0
      INSERT learner_progress with scheduler result
      + INSERT review_event from successful insert
      UNIQUE (learner_id, vocabulary_id) protects concurrent first review
      review_events PRIMARY KEY (household_id, review_id) protects scoped
      idempotency; a matching reviewId in another household is not a conflict

   Both branches:
      progress + event commit together or neither commits
```

Concurrent race nuance: hai Worker có thể cùng tính scheduler trước khi optimistic/race barrier phân thắng bại. Requirement là chỉ một canonical transition/event được persist. Với existing progress, revision chỉ cho một write thắng; với sparse first review, UNIQUE (learner_id, vocabulary_id) chỉ cho một insert thắng. Sau khi phát hiện cùng `(household_id, reviewId)` và fingerprint đã commit, request thua trả 200 canonical result và không persist/re-evaluate thêm; cùng household với fingerprint khác trả 409 IDEMPOTENCY_CONFLICT; không có event trong authorized household và progress đã tiến lên thì trả 409 STALE_REVISION. Event cùng reviewId thuộc household khác là observationally absent và không tham gia phân loại race.

## 9.3 Atomic write invariant

> **Atomicity**
> learner_progress và review_events hoặc cùng commit, hoặc cùng không thay đổi. Nếu insert event fail (kể cả duplicate PRIMARY KEY (household_id, review_id) trong cùng household namespace), progress update phải rollback hoặc race được reclassify an toàn. Event cùng reviewId ở household khác không tạo duplicate conflict trong scope hiện tại.

```text
WITH updated_progress AS (
  -- Existing row only
  UPDATE learner_progress
  SET ...schedulerResult...,
      revision = revision + 1,
      updated_at = NOW()
  WHERE learner_id = :learnerId
    AND vocabulary_id = :vocabularyId
    AND revision = :expectedRevision
  RETURNING ...
),
inserted_progress AS (
  -- Sparse first review only
  INSERT INTO learner_progress (...)
  SELECT ...schedulerResult...
  WHERE :expectedRevision = 0
    AND NOT EXISTS (
      SELECT 1 FROM learner_progress
      WHERE learner_id = :learnerId
        AND vocabulary_id = :vocabularyId
    )
  ON CONFLICT (learner_id, vocabulary_id) DO NOTHING
  RETURNING ...
),
written_progress AS (
  SELECT * FROM updated_progress
  UNION ALL
  SELECT * FROM inserted_progress
),
inserted_event AS (
  INSERT INTO review_events (...)
  SELECT ... FROM written_progress
  RETURNING ...
)
SELECT ...canonical response...;
```

Implementation preference: Neon HTTP driver + một atomic SQL statement/CTE hoặc database function. CTE ở trên là shape kiến trúc, không phải migration SQL đóng băng. P0 requirement là cả existing-update branch và sparse-first-insert branch đều chỉ insert review_event khi progress write thành công; duplicate `(household_id, review_id)` trong cùng namespace phải rollback toàn statement hoặc được reclassify an toàn. WebSocket interactive transaction chỉ xem xét nếu atomic HTTP write không đủ.

## 9.4 Complete idempotency semantics

| **Condition** | **HTTP** | **Server behavior** |
| --- | --- | --- |
| reviewId mới trong authorized household + canonical/virtual revision đúng | 201 | Existing row: update; missing row + expectedRevision=0: insert sparse progress; cả hai atomic với event |
| reviewId đã tồn tại trong authorized household + cùng fingerprint | 200 | Không chạy scheduler, không mutate progress, không thêm event; return stored response_payload |
| reviewId đã tồn tại trong authorized household + payload khác | 409 | IDEMPOTENCY_CONFLICT; không chạy scheduler và không mutate progress |
| Atomic update = 0; recheck thấy same household/reviewId/fingerprint | 200 | Concurrent retry thắng ở request khác; return stored canonical result |
| Progress write = 0; recheck không thấy event trong authorized household | 409 | STALE_REVISION (bao gồm losing first-review race với reviewId khác); client reload state |
| Cùng reviewId chỉ tồn tại ở household khác | 201 hoặc tiếp tục phân loại theo scope hiện tại | Observationally absent; không replay, không conflict và không disclose event/fingerprint/learner |
| No session | 401 | Reject |
| Learner không thuộc household | 403 | Reject |

## 9.5 Request fingerprint

`requestFingerprint` được tính từ đúng bốn trường canonical: `learnerId` +
`vocabularyId` + `result` + `expectedRevision`. `reviewId`, `householdId`,
`reviewDate`, `reviewedAt`, timezone, scheduler output, resulting revision,
response payload và mọi server timestamp đều bị loại khỏi fingerprint.
Canonical UUID normalization occurs before fingerprinting and persistence
comparison. Different review IDs therefore keep the same semantic fingerprint
when the four payload fields are unchanged, while a different learner ID (or
any other included field) produces a different fingerprint. `response_payload`
lưu canonical result của lần commit để retry sau này trả đúng response lịch sử
ngay cả khi learner đã học tiếp.

# 10. API Surface v1

| **Method** | **Endpoint** | **Purpose** | **Auth** |
| --- | --- | --- | --- |
| * | /api/auth/* | Better Auth routes | Public/session lifecycle |
| POST | /api/bootstrap | Idempotent household bootstrap | Authenticated parent |
| GET | /api/learners | Learners trong household | Parent |
| POST | /api/learners | Tạo learner | Parent |
| GET | /api/vocabulary?level=... | Enabled vocabulary/set slice; optional canonical level filter | Household context |
| GET | /api/learners/:id/vocabulary?level=... | Enabled learner-scoped vocabulary with progress; optional level filter | Household-owned |
| GET | /api/topics | Enabled canonical topic catalog | Authenticated parent |
| GET | /api/topics/:topicId/vocabulary | Enabled vocabulary mapped to one topic | Authenticated parent |
| GET | /api/learning-sets | Enabled curated learning-set catalog | Authenticated parent |
| GET | /api/learning-sets/:id | Ordered enabled vocabulary for one set | Authenticated parent |
| GET | /api/learners/:id/learning-sets | Set catalog with learner assignment state | Household-owned |
| PUT | /api/learners/:id/learning-sets/:setId | Idempotently assign/reactivate a set | Household-owned |
| DELETE | /api/learners/:id/learning-sets/:setId | Remove one learner/set assignment | Household-owned |
| GET | /api/learners/:id/progress | Canonical progress | Household-owned |
| GET | /api/learners/:id/review-queue | Due + sparse new words, deterministic order | Household-owned |
| POST | /api/reviews | Submit idempotent review | Household-owned |
| GET | /api/learners/:id/summary | Minimal parent summary | Household-owned |
| GET | /api/learners/:id/activity-summary | Daily goal and derived streak activity | Household-owned |

## 10.1 Error envelope

```text
{
  "error": {
    "code": "STALE_REVISION",
    "message": "Progress changed. Reload canonical state.",
    "details": { "currentRevision": 5 }
  }
}
```

- Error code phải ổn định/testable; frontend không parse message text để quyết định logic.

- Không trả stack trace/database error thô ra client.

- 409 stale revision cung cấp currentRevision hoặc endpoint reload canonical state.

# 11. Client State & Cache Policy

| **Data** | **Canonical source** | **Client behavior** |
| --- | --- | --- |
| Auth session | Better Auth/backend | Cookie/session state |
| Learners | PostgreSQL | Fetch + short-lived UI cache |
| Vocabulary | PostgreSQL/runtime API | Dexie optional sau vertical slice |
| Progress | PostgreSQL | Recent snapshot only |
| Review write | Backend | Success mới hiển thị Saved |
| Settings UI | Client/Dexie | Có thể local-only |

## 11.1 Failure behavior

- POST review fail -> hiển thị `Chưa lưu tiến trình` + Retry.

- Retry cùng action phải reuse cùng reviewId.

- Không âm thầm tạo offline write queue trong MVP.

- 409 STALE_REVISION -> reload canonical progress rồi tiếp tục.

- 409 IDEMPOTENCY_CONFLICT -> coi là lỗi client/logic; không tự retry bằng cùng reviewId.

# 12. Media Architecture

MVP phục vụ ảnh/audio qua provider-neutral manifest keys và mapped URLs; hiện
tại Cloudinary là provider đã được upload/verified. Neon chỉ lưu URL/key, không
lưu binary. The catalog importer reuses the generated manifest/map and never
re-uploads media.

```text
/media/v1/images/<key>.webp
/media/v1/audio/<key>.mp3
```

- File versioned/hash cache immutable khi phù hợp.

- Missing image không làm card hỏng; vùng ảnh được ẩn.

- Audio dùng URL đã resolve từ media map; thiếu/hỏng thì disable control.
  Không dùng SpeechSynthesis và không phát minh fallback audio.

- Chuyển sang R2 khi asset volume/deploy time/caching trở thành vấn đề.

## 12.1 Exercise interaction layer (US-31 / US-32)

Exercises are a learner interaction layer over the already admitted review
queue. The explicit `/study/exercises` route uses deterministic client-side
generation because the current API already exposes the complete queue DTO and
the canonical review endpoint is the only learning write boundary. The correct
option identity is held in controller state and is not rendered as an
answer-key attribute before submission; this is not intended as anti-cheat
infrastructure.

- `MULTIPLE_CHOICE_MEANING` uses one English prompt and four Vietnamese
  options. Normalized duplicate/blank/self/multi-sense-overlap candidates are
  excluded; fewer than three safe distractors means Flashcard fallback.
- `LISTENING_CHOICE` requires a non-blank `audioUrl` and four unique English
  options. Missing or insufficient media means Flashcard fallback. Playback
  uses the existing one-active-audio cleanup boundary; broken media is
  non-destructive and never creates a Forgotten review.
- A selected exercise answer maps explicitly to the existing
  `REMEMBERED`/`FORGOTTEN` review result. `POST /api/reviews` remains the
  server-authoritative path for authorization, scheduler, revision,
  idempotency, progress and review-event persistence.
- No `exercise_progress`, exercise interval, exercise streak or parallel
  mastery state is introduced. Queue eligibility, daily New allowance,
  learning-set filters, reinforcement and summary metrics remain unchanged.

## 12.2 Image and typing exercises (US-33 / US-34)

The same interaction layer now supports `IMAGE_TO_WORD` and `TYPE_WORD`.
Exercise selection still happens after canonical queue admission. The default
route preserves the existing audio-first/listening and meaning behavior while
Learner Home exposes deterministic image and typing preferences through the
same `/study/exercises` route.

- `IMAGE_TO_WORD` requires a nonblank `imageUrl` and three safe English
  distractors. Options are normalized-unique, nonblank, non-self and stable;
  the image alt label is neutral and the target is not placed in prompt or
  metadata outside the candidate options.
- `TYPE_WORD` selects a safe cue in deterministic order: Vietnamese meaning,
  usable image, usable audio, then a definition/example that does not directly
  contain the answer. NFKC, outer trim and case-insensitive comparison are
  used; meaningful internal spaces remain meaningful and spelling is strict.
- A failed image or optional cue follows one explicit fallback transition to a
  safer cue/type and then Flashcard if needed. Media failure never creates a
  review event or a `FORGOTTEN` result, and fallback state prevents cycles.
- Both types use the existing review request with the existing `reviewId` and
  `expectedRevision`; the canonical API remains responsible for authorization,
  CAS, idempotency, scheduler and learner-progress persistence. Raw typing and
  keyboard events are not persisted. No DB schema or learner-progress schema
  change is required.

## 12.3 Daily goal and learning streak activity (US-35 / US-36)

Daily goal progress is `COUNT(DISTINCT review_events.vocabulary_id)` for the
learner and current household-local `review_date`. It counts both
`REMEMBERED` and `FORGOTTEN` successful events, including reinforcement only
once per vocabulary; idempotent replay does not add a row. Active streak days
use the same persisted local dates, with current streak allowed to continue
from yesterday when today is not active. Activity is learner-scoped and does
not depend on current queue eligibility, daily New allowance, review accuracy,
or materialized learner progress.

The event's persisted `review_date` is the historical local-date identity. A
later household timezone change does not rebucket old events; only new events
use the current timezone. This is an explicit MVP limitation.

# 13. Security, Privacy & Operational Safety

## 13.1 Security baseline

- Password/session do Better Auth quản lý; không tự triển khai password flow.

- Learner PIN nếu thêm sau chỉ là profile selector, không thay parent auth boundary.

- Mọi learner-scoped query bắt buộc household authorization.

- Review-event idempotency is tenant-scoped: a canonical `reviewId` belonging
  to another household is observationally absent to the current authorized
  household. It cannot cause replay, `IDEMPOTENCY_CONFLICT`, or disclosure of
  event existence, payload, fingerprint or learner data; different households
  may persist the same canonical `reviewId` independently.

- Không log password, session token, raw cookie hoặc secret.

- Secrets chỉ nằm trong Cloudflare/CI secret store.

- Zod validate input tại API boundary.

## 13.2 Minimal observability

- Structured log cho review failures, 401/403, 409 conflict, seed/migration errors.

- Log reviewId và error code nhưng không log auth secrets.

- Theo dõi API error rate/latency cơ bản; chưa cần full APM.

# 14. Testing Strategy

| **Layer** | **Tool** | **Must-test** |
| --- | --- | --- |
| learning-domain | Vitest | NEW transitions; 1→3→7→14→30; forgotten reset; timezone date rules |
| contracts | Vitest + Zod | DTO/errors |
| DB/service | Vitest | sparse first insert, unique race, atomic write, revision/idempotency |
| Worker/API | Workers test env | auth/authz + bootstrap concurrency + review 201/200/409/401/403 |
| React UI | RTL | flashcard + loading/error states |
| Browser E2E | Playwright | login → learner → review → reload/login |
| Security E2E | Playwright/API | Cross-household read/write blocked |

## 14.1 P0 E2E scenarios

- Parent login -> learner -> review -> reload/logout-login -> progress đúng trên Neon.

- Double-click/retry cùng reviewId không tạo hai events.

- Hai request khác reviewId cùng expectedRevision: chỉ một request commit; request còn lại 409.

- Hai request cùng reviewId chạy đồng thời: tối đa một transition/event được persist; request còn lại trả canonical result (thường 200) sau khi nhận diện event đã commit.

- Household authorization chặn cross-household read/write.

- Refresh SPA route không 404.

- Learner chưa có progress row: first REMEMBERED và first FORGOTTEN đều tạo progress + review_event đúng, không trả 409 giả.

- Hai first-review request khác reviewId cùng expectedRevision=0: một insert thắng, request còn lại 409 STALE_REVISION; không duplicate progress/event.

- Review Queue: due query bắt buộc filter learnerId + enabled vocabulary; new words dùng LEFT JOIN missing progress scoped theo learnerId và ordering ổn định theo vocabulary id.

# 15. CI/CD & Environment Strategy

```text
PR / Push
   |
   v
pnpm install --frozen-lockfile
   +--> dataset validation
   +--> lint + typecheck
   +--> unit/integration/Worker tests
   +--> build
   +--> Playwright E2E

Production release
   1. Build/test artifact
   2. Apply forward-compatible Neon migration
   3. Deploy Cloudflare Worker + assets
   4. Smoke test
   5. Roll back Worker if smoke fails
```

## 15.1 Environment rules

| **Environment** | **Database** | **Purpose** |
| --- | --- | --- |
| Local / Development | Verified Neon development branch | Development + explicit seed/migrate on verified dev target |
| CI Test (trusted DB job) | Verified dedicated/disposable Neon test branch | Identity provision + clean migration + DB integration |
| Production | Verified production Neon branch | Family runtime; no destructive reset/test |

- Không chạy destructive seed lên production.

- Migration được commit vào repo; production schema chỉ thay đổi qua approved release migration. BATCH 0 chỉ validate dev/test migrations; production migration execution nằm ngoài BATCH 0.

- Better Auth + VocabFlow application schema dùng cùng Drizzle migration history. Database identity metadata trong vocabflow_meta được bootstrap/provision riêng và không thuộc application migrations.

- Node/pnpm versions được pin.

## 15.2 BATCH 0 environment & database identity invariant

• BATCH 0 tách execution context khỏi environment marker. local-development chỉ hợp lệ với development/development; ci-test chỉ hợp lệ với test/test; cloudflare-production chỉ hợp lệ với production/production. Marker thiếu, sai enum hoặc mismatch phải fail fast.

• Test DB integration chỉ được dùng NEON_TEST_DATABASE_URL trên verified test target; tuyệt đối không fallback sang DATABASE_URL. Fork/untrusted PR không nhận database secret và không dùng pull_request_target để chạy code chưa tin cậy với secret.

• Database target không được suy luận từ connection-string hostname. Expected target lấy từ trusted allowlist; actual target được xác minh bằng trusted provider/control-plane evidence khi bootstrap và bằng canonical database-side identity metadata ở runtime/tooling.

• Protected metadata nằm tại vocabflow_meta.environment_identity với singleton id=1 và identity_version=1. Runtime/migration chỉ SELECT; application reset không được xóa hoặc sửa vocabflow_meta.

• Ownership model: vocabflow_identity_owner (NOLOGIN protected owner), vocabflow_identity_provision (SELECT+INSERT canonical identity), vocabflow_migration (SELECT identity + application migration privileges), vocabflow_runtime (SELECT identity + minimum app runtime privileges), và một one-shot bootstrap DDL credential. Các role thường đều NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOREPLICATION/NOBYPASSRLS và không được SET ROLE owner.

• Full operational runbook, permission matrix, concurrency test và CI status contract được khóa trong BATCH 0 Foundation Execution Spec. Architecture này chỉ khóa invariant; implementation không được nới lỏng boundary.

# 16. Migration, Deployment & Rollback Rules

- Schema change luôn có Drizzle migration; không chỉnh production table thủ công.

- Migration production phải forward-compatible với Worker version đang chạy trước deploy.

- Ưu tiên additive change: thêm nullable/default-compatible column trước; tighten constraint ở release sau nếu cần.

- Tránh DROP COLUMN, breaking RENAME hoặc enum-breaking change trong cùng release với code phụ thuộc mới.

- Nếu Worker deploy lỗi sau migration, rollback Worker phải vẫn chạy được với schema mới.

- Vocabulary update giữ stable primary id; content change tăng contentVersion; removed content dùng enabled=false.

## 16.1 Safe migration sequence

```text
Release N
  build/test
      |
      v
  forward-compatible migration
      |
      v
  deploy Worker
      |
      v
  smoke test
      |
      +-- PASS -> complete
      +-- FAIL -> rollback Worker (schema remains compatible)

Destructive cleanup/tightening, nếu cần, thực hiện ở release sau.
```

## 16.2 BATCH 0 clean migration contract

**Official clean migration definition:**

Fresh verified Neon development/test branch
  ↓
trusted bootstrap DDL
  ↓
identity-provision (canonical id=1, identity_version=1)
  ↓
verify database identity against trusted allowlist
  ↓
empty application schema
  ↓
Drizzle migrations 0 → latest
  ↓
db:reset application schema only
  ↓
verify vocabflow_meta + identity unchanged
  ↓
Drizzle migrations 0 → latest again → PASS

• db:migrate không tự tạo, tự sửa hoặc overwrite identity metadata; identity missing/malformed/mismatch phải fail closed.

• identity-provision là explicit trusted operation; concurrent provisioning phải race-safe và resolve đúng một canonical row, không UPDATE mismatch.

• db:reset chỉ thao tác explicit application schema allowlist; DROP DATABASE, DROP vocabflow_meta hoặc broad destructive scope có thể chạm protected metadata đều bị cấm.

• Production migration execution không thuộc BATCH 0. Production release migration vẫn phải forward-compatible theo các rule bên dưới và được định nghĩa/triển khai ở release phase.

# 17. Implementation Sequence & Vertical Slice

| **Step** | **Deliverable** | **Exit gate** |
| --- | --- | --- |
| **0** | Monorepo + CI + Cloudflare/Neon connectivity | Build/deploy skeleton PASS |
| **1** | Drizzle migrations + Better Auth | Parent register/login PASS |
| **2** | Bootstrap household + learner + authz | Concurrent bootstrap one-household + cross-household 403 PASS |
| **3** | Seed 20-30 vocabulary | Real content query PASS |
| **4** | Render one real Flashcard | Optional media handling PASS |
| **5** | Scheduler package + exhaustive unit tests | NEW + existing state transitions PASS |
| **6** | POST /api/reviews | Sparse first review + idempotency + revision + atomic write PASS |
| **7** | Cloud persistence milestone | Review survives reload/logout-login PASS |
| **8** | Review Queue | Due + sparse new LEFT JOIN + stable order PASS |
| **9** | Flashcard session UX | 20 due + 10 new rules |
| **10** | Minimal parent progress | Basic summary per learner |

```text
Architecture milestone
Step 7 là mốc xác nhận kiến trúc: parent login → learner → review → cloud write → logout/reload → canonical progress vẫn chính xác. Chỉ sau khi PASS mới mở rộng UX/cache.
```

# 18. Architecture Acceptance Gates

| **Gate** | **Requirement** |
| --- | --- |
| **A1** | Frontend + API cùng Cloudflare origin; SPA deep links hoạt động. |
| **A2** | Better Auth quản lý auth tables; không có auth schema cạnh tranh. |
| **A3** | Household bootstrap idempotent và race-safe: hai request đồng thời tạo tối đa một default household + một OWNER membership và trả cùng canonical householdId. |
| **A4** | Cross-household authorization có automated test. |
| **A5** | Vocabulary runtime content đến từ PostgreSQL; sparse new words được chọn bằng LEFT JOIN missing progress với deterministic order. |
| **A6** | Scheduler pure function có NEW + REMEMBERED/FORGOTTEN transitions, existing-state rules và timezone tests. |
| **A7** | POST /api/reviews có reviewId, expectedRevision và hỗ trợ sparse first review khi row chưa tồn tại + expectedRevision=0. |
| **A8** | Existing UPDATE hoặc sparse INSERT progress + review_event là atomic; failure/duplicate event rollback toàn operation. |
| **A9** | Duplicate/concurrent review submissions persist tối đa một canonical state transition và một review_event. Khi reviewId đã tồn tại, retry resolve về canonical result; không persist transition lần hai. |
| **A10** | Concurrent different reviewId cùng revision (kể cả first review revision=0): một commit, một STALE_REVISION. |
| **A11** | Progress tồn tại sau reload/logout-login. |
| **A12** | Không có offline write queue trong vertical slice. |
| **A13** | Clean migration reproducible trên verified dev/test target: trusted identity metadata được bootstrap/provision trước, application schema rỗng migrate 0→latest, db:reset giữ nguyên vocabflow_meta/identity, rồi migrate 0→latest lại PASS. |
| **A14** | Rollback Worker vẫn tương thích với migration đã apply. |
| **A15** | CI chạy validation, lint, typecheck, tests, build và E2E. |

# 19. Deferred Decisions

| **Deferred item** | **Trigger để xem xét** |
| --- | --- |
| Dexie progress cache sâu hơn | Core cloud flow ổn; UX cần cache/offline snapshot |
| Offline write queue | Có requirement mất mạng + conflict policy rõ |
| Neon WebSocket driver | Interactive transaction thật sự cần và atomic HTTP write không đủ |
| Cloudflare R2 | Media volume/deploy time/caching trở thành vấn đề |
| study_sessions | Cần duration/resume/per-session analytics |
| Learner PIN | Nhiều em dùng chung thiết bị và cần tránh chọn nhầm |
| Advanced parent dashboard | Core learning loop ổn qua self-use |
| Admin CMS | Seed script không còn đủ cho content maintenance |

# 20. Known Risks

| **Risk** | **Impact** | **Mitigation** |
| --- | --- | --- |
| Dataset/media license chưa rõ | Block commercial/public reuse | Family MVP nội bộ; audit trước commercial launch |
| Auth/provider version drift | Migration/config break | Pin versions + migration tests |
| Concurrent review edge cases | Progress sai | reviewId + revision + sparse unique constraint + atomic write + race tests |
| Timezone misconfiguration | Wrong due dates | Household IANA timezone + server-derived calendar date |
| Media thiếu/hỏng | Card UX lỗi | Optional media handling + validation |
| Cloud/provider policy thay đổi | Operational risk | PostgreSQL chuẩn + backups/exports + abstraction vừa đủ |

# Appendix A. Official Reference Basis

• Cloudflare Workers Static Assets: [https://developers.cloudflare.com/workers/static-assets/](https://developers.cloudflare.com/workers/static-assets/)

• Cloudflare Vite Plugin: [https://developers.cloudflare.com/workers/vite-plugin/](https://developers.cloudflare.com/workers/vite-plugin/)

• Cloudflare SPA routing: [https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)

• Drizzle + Neon: [https://orm.drizzle.team/docs/connect-neon](https://orm.drizzle.team/docs/connect-neon)

• Better Auth Drizzle Adapter: [https://better-auth.com/docs/adapters/drizzle](https://better-auth.com/docs/adapters/drizzle)

• Better Auth Hono Integration: [https://better-auth.com/docs/integrations/hono](https://better-auth.com/docs/integrations/hono)

• Neon Serverless Driver: [https://neon.com/docs/serverless/serverless-driver](https://neon.com/docs/serverless/serverless-driver)

# Appendix B. Approval Statement

> TECHNICAL ARCHITECTURE v1.0.11 — APPROVED FOR IMPLEMENTATION
> Từ thời điểm tài liệu này được chấp nhận, triển khai phải bám architecture invariants, sparse progress/virtual NEW model, learner-scoped review queue, race-safe household bootstrap, schema constraints, household authorization, review write/idempotency contract, database identity ownership boundary và clean migration contract ở trên. Acceptance Gates được xác minh trong implementation; mọi thay đổi kiến trúc cần blocker/evidence kỹ thuật cụ thể.
