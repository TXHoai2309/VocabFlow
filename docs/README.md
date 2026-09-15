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
- [AI Progress and Handoff](ai-progress.md)
- [Roadmap and Batch Index](roadmap.md)
- [Changelog](changelog.md)
- [Source Baselines](source-baselines.md)
- [User Story System](stories/README.md)

## Current project state

- BATCH 0 Foundation: `ACCEPTED`.
- Core CI: `PASS`.
- Trusted DB Integration on Neon PostgreSQL 18: `PASS`.
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
- US-09 Flashcard Session UX is `IN PROGRESS`; implementation and local
  acceptance evidence are complete, with owner check pending.
- Documentation/agent-pack work does not implement US-01 or any other feature.
