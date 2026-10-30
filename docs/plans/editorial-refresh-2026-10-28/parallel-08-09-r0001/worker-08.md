# WORKER_08 — Chữ cái, tên chữ và âm

Đọc `common.md`, `coordination.json`, rồi ticket `.scratch/editorial-refresh-20261028/issues/08-letter-and-sound-module.md`. Mục tiêu là một mô-đun chữ/âm có mô hình đúng, trước khi làm rộng26chữ.

Owned root: `vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket08-draft-r0001/`.

1. Audit luồng item/progress hiện tại: chỉ ra vì sao chữ A, tên chữ /eɪ/ và hoạt động nghe một âm không phải Sense mạo từ `a`. Đề xuất thực thể letter, activity và pronunciation binding; nêu rõ grain của progress, identity/revision và khả năng dùng lại media.
2. Đề xuất một nhóm thử khoảng6chữ, giải thích cách chọn và mở rộng tới26chữ. Đây là quy mô draft, chưa khẳng định chương trình học. Với mỗi chữ: uppercase/lowercase, mục tiêu hoạt động tên chữ hoặc âm, locale Anh Mỹ theo pilot hiện có, biểu diễn ngữ âm có nguồn, hướng dẫn tiếng Việt, cue và tiêu chí trả lời. Chữ nhiều âm cần chọn rõ một hoạt động; âm phụ âm và tên chữ có target audio riêng. Ghi hoạt động cần thu âm chuyên biệt nếu TTS chỉ đọc ra tên chữ.
3. Soạn `item-contract.md`, `draft-items-r0001.json`, `source-and-dedup.json`, `media-specs.json`, `integration-proposal.md`. Media specs dùng draftItemRef/activityRef và exact payload dự kiến, để image/TTS worker sau này đọc cùng JSON. Đánh giá ảnh nào giúp học và ảnh nào nên OMIT; chưa sinh ảnh/audio.
4. Trước handoff, kiểm tra schema/unique refs, tách letter-name vs sound targets, source pins, đường dẫn và cách tính số lượng. Không cộng letter/sound activities vào600từ mới. Ghi quyết định cần điều phối chốt, không tự bịa phoneme/provider ID hay canonical UUID.

Completion: có một nhóm thử đủ chi tiết để review, JSON kiểm tra được, phương án scope/progress cho itemType riêng, và `handoff.json` theo common.md. Ticket08 toàn phần vẫn chờ phần tích hợp sau khi thống nhất hợp đồng.
