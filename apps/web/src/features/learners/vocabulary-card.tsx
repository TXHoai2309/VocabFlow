import { useState } from "react";
import { Link } from "react-router";
import type { LearnerVocabularyDto, VocabularyDto } from "@vocabflow/contracts";
import { usePronunciationAudio } from "../study/pronunciation-audio";
import { DevelopmentImageNotice, DevelopmentWordAudio } from "../study/development-media";
import { formatInferredMetadataLabel, formatPartOfSpeech, formatVocabularyTopic, getPrimaryVietnameseMeaning } from "../vocabulary/vocabulary-presentation";

export type VocabularyCardItem = Pick<
  VocabularyDto,
  | "id" | "word" | "ipa" | "partOfSpeech" | "vietnamese" | "imageUrl" | "audioUrl" | "level" | "topic"
  | "sourceMeaningVi" | "rightsStatus" | "developmentMedia" | "masterSenseIdentity" | "imageMediaStatus" | "cefr" | "tags" | "metadataEvidence"
> & { status?: LearnerVocabularyDto["status"] };

type VocabularyIconName = "bookmark" | "speaker" | "image";

function VocabularyIcon({ name, filled = false }: { name: VocabularyIconName; filled?: boolean }) {
  const paths: Record<VocabularyIconName, string> = {
    bookmark: "M6 4h12v17l-6-4-6 4z",
    speaker: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13",
    image: "M4 4h16v16H4zM8 10h.01M20 15l-5-5L5 20"
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d={paths[name]} fill={filled ? "currentColor" : "none"} />
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

function formattedSavedDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function VocabularyCard({ item, showStatus = false, showTopic = false, variant = "card", isSaved = false, isSaving = false, bookmarkDisabled = false, savedAt, onToggleSaved }: {
  item: VocabularyCardItem;
  showStatus?: boolean;
  showTopic?: boolean;
  variant?: "card" | "row";
  isSaved?: boolean;
  isSaving?: boolean;
  bookmarkDisabled?: boolean;
  savedAt?: string | null;
  onToggleSaved?: (item: VocabularyCardItem) => void;
}) {
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
  const audio = usePronunciationAudio(item.audioUrl, item.word, item.id);
  const imageUrl = item.imageUrl?.trim();
  const imageKey = imageUrl ? `${item.id}:${imageUrl}` : null;
  const imageFailed = imageKey !== null && failedImageKey === imageKey;
  const level = levelLabel(item.level);
  const partOfSpeech = formatPartOfSpeech(item.partOfSpeech);
  const topic = formatVocabularyTopic(item.topic);
  const meaning = getPrimaryVietnameseMeaning(item);
  const inferredLabels = item.metadataEvidence?.filter((evidence) => evidence.status === "INFERRED_REVIEWABLE").map((evidence) => ({
    key: `${evidence.dimension}:${evidence.code}`,
    label: formatInferredMetadataLabel(evidence.label ?? evidence.code, evidence.dimension),
    dimension: evidence.dimension === "SUBTOPIC" ? "Tiểu chủ đề" : evidence.dimension === "DOMAIN" ? "Miền dùng" : "Chủ đề"
  }));
  const inferredTags = item.tags?.filter((tag) => tag.startsWith("topic-inferred:") || tag.startsWith("domain-inferred:")) ?? [];

  return (
    <li className={`vocabulary-card-item${variant === "row" ? " is-row" : ""}`} data-testid={`vocabulary-row-${item.id}`}>
      <article className={`vocabulary-card${variant === "row" ? " is-row" : ""}${imageUrl ? imageFailed ? " has-image-fallback" : " has-image" : " is-text-first"}${level ? " has-level" : ""}`}>
        <Link className="vocabulary-card-link" to={`/vocabulary/${item.id}`} aria-label={`${item.word}${item.ipa ? `, ${item.ipa}` : ""}. ${meaning}. Xem chi tiết`}>
          {imageUrl && !imageFailed ? <span className="vocabulary-card-thumbnail">
            <img src={imageUrl} alt={`Hình minh họa ${item.word}`} loading="lazy" onError={() => imageKey && setFailedImageKey(imageKey)} />
          </span> : imageUrl ? <span className="vocabulary-card-image-fallback" role="img" aria-label={`Ảnh minh họa ${item.word} chưa tải được`}><VocabularyIcon name="image" /></span> : null}
          {level ? <span className="vocabulary-level-badge">{level}</span> : null}
          <span className="vocabulary-card-copy">
            <strong>{item.word}</strong>
            {item.ipa || partOfSpeech ? <span className="vocabulary-card-ipa">{[item.ipa, partOfSpeech].filter(Boolean).join(" · ")}</span> : null}
            <span className="vocabulary-card-meaning-label">Nghĩa tiếng Việt</span>
            <span className="vocabulary-card-meaning">{meaning}</span>
            {showStatus && item.status ? <span className={`vocabulary-card-status vocabulary-card-status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span> : null}
            {showTopic && topic ? <span className="vocabulary-card-topic">{topic}</span> : null}
            {item.masterSenseIdentity && item.cefr ? <span className="vocabulary-card-topic">CEFR {item.cefr}</span> : null}
            {inferredLabels?.length ? inferredLabels.map((evidence) => (
              <span className="vocabulary-card-metadata-suggestion" key={evidence.key}>
                {evidence.dimension} gợi ý · {evidence.label}
              </span>
            )) : inferredTags.map((tag) => (
              <span className="vocabulary-card-metadata-suggestion" key={tag}>
                {formatVocabularyTopic(tag)}
              </span>
            ))}
          </span>
        </Link>
        {variant === "row" && savedAt ? <span className="vocabulary-card-saved-date">Đã lưu {formattedSavedDate(savedAt)}</span> : null}
        {(item.developmentMedia?.wordAudio?.length ?? 0) === 0 ? <button
          className={`vocabulary-bookmark-button${isSaved ? " is-saved" : ""}`}
          type="button"
          disabled={bookmarkDisabled || isSaving || !onToggleSaved}
          aria-label={`${isSaved ? "Bỏ lưu" : "Lưu"} từ ${item.word}`}
          aria-pressed={isSaved}
          aria-busy={isSaving}
          title={isSaved ? `Bỏ lưu ${item.word}` : `Lưu ${item.word}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSaved?.(item);
          }}
        >
          <VocabularyIcon name="bookmark" filled={isSaved} />
        </button> : null}
        {(item.developmentMedia?.wordAudio?.length ?? 0) > 0 ? (
          <details className="vocabulary-card-development-audio">
            <summary aria-label={`Chọn phát âm nguồn cho ${item.word}`}><VocabularyIcon name="speaker" /></summary>
            <DevelopmentWordAudio vocabulary={item} />
          </details>
        ) : null}
        {item.masterSenseIdentity ? <DevelopmentImageNotice vocabulary={item} /> : null}
        {audio.hasAudio && audio.state !== "error" ? <button
          className="vocabulary-audio-button"
          type="button"
          disabled={audio.state === "loading"}
          aria-label={audio.state === "playing" ? `Tạm dừng phát âm ${item.word}` : `Nghe phát âm ${item.word}`}
          aria-pressed={audio.state === "playing"}
          title={audio.state === "playing" ? `Tạm dừng phát âm ${item.word}` : `Nghe phát âm ${item.word}`}
          onClick={() => audio.state === "playing" ? audio.pause() : audio.play()}
        >
          <VocabularyIcon name="speaker" />
        </button> : audio.state === "error" ? <span className="vocabulary-card-audio-error" role="status">Âm thanh không khả dụng</span> : null}
      </article>
    </li>
  );
}
