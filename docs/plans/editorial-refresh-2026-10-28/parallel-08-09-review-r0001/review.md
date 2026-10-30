# Coordinator review — tickets08/09

Verified both handoffs without rewriting their outputs:08 has14artifacts and6input pins;09 has13artifacts and6input pins. Re-ran08validator:120PASS. Re-ran09validator:14PASS and12invalid mutations rejected. No provider/DB/runtime work.

**08 changes required (C08-01, P1).** All12activities put the answer in `instructionVi` before the listening-choice response. Example: “Nghe tên chữ A, rồi chọn cặp chữ đúng.” Sound instructions also expose glyph/IPA/anchor. The contract says to withhold cues, but `cueBeforeAnswer=false` does not cover instructionVi. Move teaching explanation to a post-answer field and keep the pre-answer instruction neutral. Cover screen readers and other delivered metadata in the display projection. Add negative cases; schema/hash checks alone do not catch this pedagogical defect.

**09 draft content reviewed.** Read all12target sentences, translations and contexts. No blocking wording issue identified in this scope. Context-specific “Excuse me.” and “You're welcome.” remain distinct from lexical/component Sense meanings. Self-recall is not free-speech grading or proof of speaking ability. Audio, canonical identity and final runtime acceptance remain open.

A-name and A-sound require separate activity progress; utterances have their own typed progress owner, and words inside sentences receive no automatic progress. The two drafts currently use different envelopes/hash algorithms; retain these originals and map through an explicit shared adapter proposal rather than pretending schemas already match. New vocabulary additions remain0.

Next parallel work:08revision2fix;09offline compatibility/negative fixtures. Read their new prompts in this folder. Shared schema/persistence integration stays with this chat after comparison. Both full tickets remain in-progress for contract/integration/media; neither is DONE.
