import { useState } from "react";
import { Link } from "react-router";
import type { LearnerVocabularyDto, VocabularyDto } from "@vocabflow/contracts";
import { usePronunciationAudio } from "../study/pronunciation-audio";

export type VocabularyCardItem = Pick<
  VocabularyDto,
  "id" | "word" | "ipa" | "vietnamese" | "imageUrl" | "audioUrl" | "level"
> & { status?: LearnerVocabularyDto["status"] };

type VocabularyIconName = "bookmark" | "speaker" | "image";

function VocabularyIcon({ name }: { name: VocabularyIconName }) {
  const paths: Record<VocabularyIconName, string> = {
    bookmark: "M6 4h12v17l-6-4-6 4z",
    speaker: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13",
    image: "M4 4h16v16H4zM8 10h.01M20 15l-5-5L5 20"
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

function levelLabel(level: VocabularyCardItem["level"]) {
  if (!level) return null;
  return level === "GENERAL" ? "Chung" : `Lớp ${level.slice(-1)}`;
}

function statusLabel(status: NonNullable<VocabularyCardItem["status"]>) {
  return status === "NEW" ? "Chưa học" : status === "LEARNING" ? "Đang học" : "Đã học";
}

export function VocabularyCard({ item, showStatus = false }: { item: VocabularyCardItem; showStatus?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const audio = usePronunciationAudio(item.audioUrl, item.word, item.id);
  const imageUrl = item.imageUrl?.trim();
  const level = levelLabel(item.level);

  return (
    <li className="vocabulary-card-item" data-testid={`vocabulary-row-${item.id}`}>
      <article className="vocabulary-card">
        <Link className="vocabulary-card-link" to={`/vocabulary/${item.id}`} aria-label={`${item.word}${item.ipa ? `, ${item.ipa}` : ""}. ${item.vietnamese}. Xem chi tiết`}>
          <span className="vocabulary-card-thumbnail">
            {imageUrl && !imageFailed ? (
              <img src={imageUrl} alt={`Hình minh họa ${item.word}`} loading="lazy" onError={() => setImageFailed(true)} />
            ) : <VocabularyIcon name="image" />}
          </span>
          {level ? <span className="vocabulary-level-badge">{level}</span> : null}
          <span className="vocabulary-card-copy">
            <strong>{item.word}</strong>
            {item.ipa ? <span className="vocabulary-card-ipa">{item.ipa}</span> : null}
            <span className="vocabulary-card-meaning">{item.vietnamese}</span>
            {showStatus && item.status ? <span className={`vocabulary-card-status vocabulary-card-status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span> : null}
          </span>
        </Link>
        <button className="vocabulary-bookmark-button" type="button" disabled title="Hiện chưa hỗ trợ lưu từng từ" aria-label={`Hiện chưa hỗ trợ lưu từng từ: ${item.word}`}>
          <VocabularyIcon name="bookmark" />
        </button>
        <button
          className="vocabulary-audio-button"
          type="button"
          disabled={!audio.hasAudio || audio.state === "loading" || audio.state === "error"}
          aria-label={`Nghe phát âm ${item.word}`}
          aria-pressed={audio.state === "playing"}
          title={audio.hasAudio ? `Nghe phát âm ${item.word}` : "Chưa có âm thanh phát âm"}
          onClick={() => audio.state === "playing" ? audio.pause() : audio.play()}
        >
          <VocabularyIcon name="speaker" />
        </button>
      </article>
    </li>
  );
}
