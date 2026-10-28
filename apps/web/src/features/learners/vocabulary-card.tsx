import { useState } from "react";
import { Link } from "react-router";
import type { LearnerVocabularyDto, VocabularyDto } from "@vocabflow/contracts";
import { usePronunciationAudio } from "../study/pronunciation-audio";
import { formatPartOfSpeech, formatVocabularyTopic, getVietnameseMeaningPresentation } from "../vocabulary/vocabulary-presentation";

export type VocabularyCardItem = Pick<
  VocabularyDto,
  | "id" | "word" | "ipa" | "partOfSpeech" | "vietnamese" | "imageUrl" | "audioUrl" | "level" | "topic"
  | "sourceMeaningVi" | "shortMeaningVi" | "shortMeaningStatus" | "rightsStatus" | "developmentMedia" | "masterSenseIdentity" | "imageMediaStatus" | "cefr" | "tags" | "metadataEvidence"
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

export function VocabularyCard({
  item,
  senses,
  onOpenSenses,
  showStatus = false,
  showTopic = false,
  variant = "card",
  isSaved = false,
  isSaving = false,
  bookmarkDisabled = false,
  savedAt,
  onToggleSaved
}: {
  item: VocabularyCardItem;
  senses?: VocabularyCardItem[];
  onOpenSenses?: (item: VocabularyCardItem) => void;
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
  const meaning = getVietnameseMeaningPresentation(item);
  const uniquePosLabels = senses && senses.length > 1
    ? Array.from(new Set(senses.map((s) => formatPartOfSpeech(s.partOfSpeech)).filter((s): s is string => Boolean(s))))
    : [];

  return (
    <li className={`vocabulary-card-item${variant === "row" ? " is-row" : ""}`} data-testid={`vocabulary-row-${item.id}`}>
      <article className={`vocabulary-card${variant === "row" ? " is-row" : ""}${imageUrl ? imageFailed ? " has-image-fallback" : " has-image" : " is-text-first"}${level ? " has-level" : ""}`}>
        <Link className="vocabulary-card-link" to={`/vocabulary/${item.id}`} aria-label={`${item.word}${item.ipa ? `, ${item.ipa}` : ""}. ${meaning.primary}. Xem chi tiết`}>
          {imageUrl && !imageFailed ? <span className="vocabulary-card-thumbnail">
            <img src={imageUrl} alt={`Hình minh họa ${item.word}`} loading="lazy" onError={() => imageKey && setFailedImageKey(imageKey)} />
          </span> : imageUrl ? <span className="vocabulary-card-image-fallback" role="img" aria-label={`Ảnh minh họa ${item.word} chưa tải được`}><VocabularyIcon name="image" /></span> : null}
          {level ? <span className="vocabulary-level-badge">{level}</span> : null}
          <span className="vocabulary-card-copy">
            <strong>{item.word}</strong>
            {senses && senses.length > 1 ? (
              <span className="vocabulary-card-senses-badge" data-testid={`senses-badge-${item.id}`}>
                {senses.length} nét nghĩa{uniquePosLabels.length > 0 ? ` · ${uniquePosLabels.join(", ")}` : ""}
              </span>
            ) : null}
            {item.ipa || partOfSpeech ? <span className="vocabulary-card-ipa">{[item.ipa, partOfSpeech].filter(Boolean).join(" · ")}</span> : null}
            <span className="vocabulary-card-meaning">{meaning.primary}</span>
            {showStatus && item.status ? <span className={`vocabulary-card-status vocabulary-card-status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span> : null}
            {showTopic && topic ? <span className="vocabulary-card-topic">{topic}</span> : null}
            {item.masterSenseIdentity && item.cefr ? <span className="vocabulary-card-topic vocabulary-card-cefr">CEFR {item.cefr}</span> : null}

          </span>
        </Link>
        {variant === "row" && savedAt ? <span className="vocabulary-card-saved-date">Đã lưu {formattedSavedDate(savedAt)}</span> : null}
            {senses && senses.length > 1 && onOpenSenses ? (
              <button
                type="button"
                className="vocabulary-card-senses-trigger"
                aria-label={`Xem tất cả ${senses.length} nét nghĩa của từ ${item.word}`}
                data-testid={`senses-trigger-${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenSenses(item);
                }}
              >
                <span>Xem {senses.length} nghĩa</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ) : null}
        {<button
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
        </button>}
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
