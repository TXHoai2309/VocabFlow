# WORKER_09 — Câu giao tiếp đầu tiên

Đọc `common.md`, `coordination.json`, rồi ticket `.scratch/editorial-refresh-20261028/issues/09-first-utterances-module.md`. Mục tiêu là mô-đun giao tiếp đơn giản có ngữ cảnh, không biến toàn bộ câu thành từ vựng mới.

Owned root: `vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket09-draft-r0001/`.

1. Audit ví dụ của Sense, lexical phrase và utterance như ba trường hợp khác nhau. Đề xuất identity/progress/placement của câu giao tiếp, cách tham chiếu Sense có sẵn khi đúng nghĩa và quan hệ với các presentation của ticket07. Bản dịch hoặc dùng lại câu ở nhiều bộ không tự nhân bản tiến độ.
2. Soạn nhóm thử khoảng12câu hoàn chỉnh trong vài tình huống gần gũi (chào hỏi, cảm ơn, xin giúp đỡ hoặc xin nhắc lại). Đây là quy mô draft. Mỗi mục có communicativeGoal, context, English exact text, bản Việt tự nhiên, speaker/response khi cần, locale Anh Mỹ và lý do phù hợp người mới học. Mẫu có chỗ trống phải tách itemType/activity/audio policy riêng; không đọc ký hiệu chỗ trống như câu hoàn chỉnh.
3. Đối chiếu toàn kho và nguồn đã ghim để ghi reuse/exact-meaning candidates. Với lexical phrase chưa rõ, ghi pending thay vì tính ngay là từ mới. Soạn `item-contract.md`, `draft-items-r0001.json`, `source-and-dedup.json`, `media-specs.json`, `integration-proposal.md`. Mỗi audio gắn exact sentence/activity/revision; ảnh chỉ khi giúp hiểu tình huống, có thể OMIT. Chưa sinh ảnh/audio.
4. Trước handoff, kiểm tra tính tự nhiên của câu và bản dịch, ngữ cảnh, exact-text audio binding, schema/unique refs, reuse evidence và cách đếm. Đếm utterance items riêng với genuinely new lexical Senses; không cộng12câu thành12từ mới vào600.

Completion: có nhóm tình huống review được, JSON kiểm tra được, phương án scope/progress itemType riêng, và `handoff.json` theo common.md. Các thay đổi dùng chung được đề xuất cho điều phối; ticket09 toàn phần còn phần tích hợp sau khi thống nhất hợp đồng.
