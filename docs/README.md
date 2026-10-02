# VocabFlow Documentation

Thư mục này là entry point cho người phát triển và AI agent làm việc trên
VocabFlow Family MVP. Các tài liệu Markdown bên dưới là dạng canonical dễ đọc,
dễ review và dễ liên kết; các baseline DOCX được lập bản đồ trong
`docs/source-baselines.md`.

## Source of truth precedence

Khi các nguồn có vẻ mâu thuẫn, dùng thứ tự sau:

1. Product Specification
2. Technical Architecture
3. Global Design System
4. Feature UI Specification
5. User Flow
6. Accepted decisions
7. Current User Story contract
8. Accepted implementation evidence
9. Current code and tests

Code không được âm thầm ghi đè product hoặc architecture contract đã được chấp
nhận. Nếu contract không thể triển khai, phải ghi blocker và bằng chứng trước
khi đổi contract hoặc code.

## Mandatory reading order for AI agents

Trước khi triển khai feature, đọc theo thứ tự:

1. `docs/README.md`
2. `docs/product/product-spec.md`
3. `docs/architecture/technical-architecture.md`
4. `docs/design/design-system.md` khi có UI
5. `docs/design/feature-ui-spec.md` khi có feature UI
6. `docs/flow/user-flow.md`
7. `docs/decisions.md`
8. `docs/roadmap.md`
9. User Story hiện hành trong `docs/stories/`
10. `docs/ai-progress.md`

## Document and story status vocabulary

Document and story statuses use the same gate vocabulary:

- `DRAFT`: đang soạn, chưa sẵn sàng để review.
- `READY FOR CONTRACT REVIEW`: owner phải review và chốt contract; chưa được
  phép triển khai.
- `READY FOR IMPLEMENTATION`: dependencies, scope và acceptance criteria đã rõ;
  implementation được phép bắt đầu.
- `IN PROGRESS`: implementation đã bắt đầu.
- `BLOCKED`: có blocker khiến implementation không thể tiếp tục an toàn.
- `ACCEPTED`: implementation và acceptance evidence đã hoàn tất.
- `SUPERSEDED`: bị tài liệu/story mới thay thế, không còn active.
- `ARCHIVED`: tài liệu/story lịch sử, không phải source of truth hiện tại.

**READY FOR CONTRACT REVIEW IS NOT PERMISSION TO IMPLEMENT.** Chỉ
`READY FOR IMPLEMENTATION` mới được vào implementation.

Canonical source documents may preserve a source-native approval label such as
`APPROVED FOR IMPLEMENTATION` in their conversion metadata. That label does not
override the story gate: a story still needs `READY FOR IMPLEMENTATION` before
feature code may start.

## Documentation update rules

- Mỗi meaningful task phải cập nhật `docs/ai-progress.md` ở cuối task.
- User Story hiện hành phải phản ánh status, acceptance evidence và blocker thực tế.
- Thay đổi product, architecture, design hoặc flow chỉ được thực hiện khi
  baseline thực sự đổi và phải cập nhật decision log/changelog phù hợp.
- Không ghi secrets, password, connection string, API key, cookie hoặc token.
- Không xóa acceptance evidence. Tài liệu lịch sử phải được đánh dấu rõ
  `SUPERSEDED` hoặc `ARCHIVED`.
- Link hoạt động phải trỏ tới canonical Markdown; tên DOCX cũ chỉ xuất hiện
  trong source-baseline hoặc ghi chú lịch sử.

## Canonical documents

- [Product Specification](product/product-spec.md)
- [Technical Architecture](architecture/technical-architecture.md)
- [Global Design System](design/design-system.md)
- [Feature UI Specification](design/feature-ui-spec.md)
- [User Flow](flow/user-flow.md)
- [BATCH 0 Foundation Execution Specification](implementation/batch0-foundation-execution-spec.md)
- [BATCH 0 Foundation Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md)
- [Project Decisions](decisions.md)
- [Master Vocabulary V2 Runtime Import Contract](architecture/master-vocabulary-v2-runtime-import-contract.md)
- [Master Vocabulary V2 Phase 2D.1 Hardening and Canary Preparation](architecture/master-vocabulary-v2-phase-2d1-hardening.md)
- [AI Progress and Handoff](ai-progress.md)
- [Roadmap and Batch Index](roadmap.md)
- [Changelog](changelog.md)
- [v1.0.0 Production Release Runbook](releases/v1.0.0-release-runbook.md)
- [Source Baselines](source-baselines.md)
- [User Story System](stories/README.md)

## Current project state

- V1.0 production hosting target: **Vercel** (DEC-017); root Vite SPA plus the
  existing Hono API as a same-origin Function. Normal schema releases use the
  protected immutable-SHA workflow in DEC-018; first bootstrap and reviewed
  content operations remain operator-only. Environment protection/secrets
  require owner setup, and this implementation did not run a release. See the
  [V1.0.0 Production Release Runbook](releases/v1.0.0-release-runbook.md).
- BATCH 0 Foundation: `ACCEPTED`.
- Recovery baseline: implementation commit `f17521bd41738db6dd5e8f7f72a170ed08c22bf3`;
  recovery fix commit `60b384dd1f53ca5a5472402292a450190446ba9e`.
- Initial Core CI on that commit: `FAIL` in Unit and component tests because a
  starter-enrichment test read gitignored `local-data/`.
- Initial Trusted DB Integration on that commit: `PASS`.
- Recovery fix: deterministic tracked test fixtures; Core CI run `35434440380`
  and Trusted DB Integration run `35434440386` both passed on the recovery
  commit.
- BATCH 1 Authentication and Family Entry: `ACCEPTED`.
- BATCH 2 Learning Content Foundation is `ACCEPTED`.
- US-01 Parent Registration is `ACCEPTED`.
- US-02 Parent Login is `ACCEPTED`.
- US-03 Learner Profile Creation & Resolution is `ACCEPTED`.
- US-04 Vocabulary Content Seed & Read Foundation is `ACCEPTED`.
- BATCH 3 First Study Experience is `ACCEPTED`.
- US-05 First Real Flashcard is `ACCEPTED`.
- BATCH 4 Learning Scheduler Domain is `ACCEPTED`.
- US-06 Learning Scheduler Domain is `ACCEPTED`.
- US-07 Scheduled Review Write is `ACCEPTED / CLOSED`.
- US-08 Review Queue is `ACCEPTED / CLOSED`.
- US-09 Flashcard Session UX is `ACCEPTED / CLOSED`.
- US-10 Reusable Flashcard Front State is `ACCEPTED / CLOSED`.
- US-11 Flashcard Back Content & Recall Actions is `ACCEPTED / CLOSED`.
- US-12 Audio Pronunciation through US-21 Learner Progress Isolation are
  `ACCEPTED / CLOSED` according to their backfilled story records.
- US-22 Vocabulary List is `IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK
  DEFERRED`.
- US-23 Missing Media / Dataset Vertical Slice and US-24 Reset Learner Progress
  are `ACCEPTED / CLOSED`.
- US-25 Full Vocabulary Catalog is `ACCEPTED / CLOSED`; real migration/import,
  idempotency, Core CI and Trusted DB evidence are recorded in its story.
- US-26 Vocabulary Grade Level and US-27 Vocabulary Topics are
  `IMPLEMENTED / READY FOR OWNER CHECK`; source-honest nullable levels,
  canonical topics, APIs and browse UI are recorded in their stories.
- US-28 through US-40 are `IMPLEMENTED / READY FOR OWNER CHECK` with their
  learning-set, daily-limit, exercise, activity and reward evidence recorded
  in the story index.
- US-41 Content Curation & Activation is `IMPLEMENTED / READY FOR OWNER CHECK`.
  The tracked `VOCABULARY_CURATION_V1` manifest contains 213 owner-refined
  reviewed rows, eleven sets and 30 starter topic mappings. Missing images are
  warnings (not `IMAGE_TO_WORD` eligible); usable audio remains required and
  unusable media still blocks. The default curation command is dry-run-only;
  activation is guarded to trusted CI and does not auto-assign learners or
  mutate learning history.
- US-42 Production Release Automation is `IN PROGRESS`; its workflow is
  implemented but requires GitHub Environment `production` protections and
  owner-configured credentials before the first run.
- Documentation/agent-pack work does not implement US-01 or any other feature.
