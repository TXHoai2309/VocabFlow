import type { VocabularyDto } from "@vocabflow/contracts";
import { developmentExampleAudioItems } from "./development-example-audio";

type DevelopmentMedia = NonNullable<VocabularyDto["developmentMedia"]>;
type MediaItem = NonNullable<DevelopmentMedia["wordAudio"]>[number];
type DevelopmentMediaSource = Pick<VocabularyDto, "word" | "developmentMedia" | "contentHash" | "masterSenseIdentity">;

function statusLabel(status: MediaItem["reviewStatus"]) {
  return status === "ACCEPTED_MAPPING" ? "Đã xác nhận mapping" : status === "AMBIGUOUS" ? "Nhiều phương án — cần chọn" : "PROPOSED — chưa kiểm duyệt";
}

export function DevelopmentWordAudio({ vocabulary }: { vocabulary: DevelopmentMediaSource }) {
  const items = vocabulary.developmentMedia?.wordAudio ?? [];
  if (items.length === 0) return null;

  if (items.every((item) => item.originType === "GENERATED_EDITORIAL_LOCAL_PREVIEW")) {
    return <section className="editorial-local-preview-audio" aria-label={`Phát âm nguồn cho ${vocabulary.word}`}>
      <p className="editorial-local-preview-note">Phát âm · Bản thử local</p>
      {items.map((item) => <div key={item.mediaSha256}>
        <audio controls preload="none" src={item.url} aria-label={`Nghe ${vocabulary.word}`} />
        <details className="editorial-local-preview-evidence">
          <summary>Thông tin bản thu</summary>
          <p>{item.pronunciation} · {statusLabel(item.reviewStatus)} · quyền sử dụng chưa xác minh</p>
          <small>{item.sourceNoteIdentity} · SHA256 {item.mediaSha256}</small>
        </details>
      </div>)}
    </section>;
  }

  return (
    <section className="development-media-audio" aria-label={`Phát âm nguồn cho ${vocabulary.word}`}>
      <p className="development-media-notice">Media nguồn Development · quyền sử dụng chưa xác minh</p>
      {items.map((item, index) => (
        <div className="development-media-audio-item" key={`${item.mediaSha256}:${index}`}>
          <div className="development-media-audio-copy">
            <strong>{item.pronunciation || `Phát âm ${index + 1}`}</strong>
            <span>{statusLabel(item.reviewStatus)}</span>
            <small>{item.sourceNoteIdentity} · SHA256 {item.mediaSha256.slice(0, 12)}…</small>
          </div>
          <audio controls preload="none" src={item.url} aria-label={`Nghe ${vocabulary.word}, ${item.pronunciation || `phương án ${index + 1}`}`}>
            Trình duyệt không hỗ trợ phát audio.
          </audio>
        </div>
      ))}
    </section>
  );
}

export function DevelopmentExampleAudio({ vocabulary, exampleKey, exampleIndex, exampleText }: { vocabulary: DevelopmentMediaSource; exampleKey?: string; exampleIndex: number; exampleText: string }) {
  const items = developmentExampleAudioItems(vocabulary, exampleKey, exampleIndex, exampleText);
  if (items.length === 0) return null;
  return (
    <div className="development-media-example-audio">
      {items.map((item, index) => (
        <div key={`${item.mediaSha256}:${index}`}>
          <p className={item.originType === "GENERATED_EDITORIAL_LOCAL_PREVIEW" ? "editorial-local-preview-note" : "development-media-notice"}>Audio khớp câu ví dụ · quyền sử dụng chưa xác minh</p>
          <audio controls preload="none" src={item.url} aria-label={`Nghe câu ví dụ ${exampleIndex + 1}: ${exampleText}${items.length > 1 ? `, phương án ${index + 1}` : ""}`} />
        </div>
      ))}
    </div>
  );
}

export function DevelopmentImageNotice({ vocabulary }: { vocabulary: Pick<VocabularyDto, "word" | "imageUrl" | "masterSenseIdentity" | "imageMediaStatus" | "developmentMedia"> }) {
  // Public media is already authorized/sanitized by the server. A Master ID
  // alone is not evidence that a published image is a Development preview.
  if (!vocabulary.developmentMedia) return null;
  if (!vocabulary.masterSenseIdentity || !vocabulary.imageUrl) return null;
  const status = vocabulary.imageMediaStatus === "ACCEPTED_MAPPING" ? "Đã xác nhận mapping"
    : vocabulary.imageMediaStatus === "AMBIGUOUS" ? "Nhiều phương án — cần chọn"
      : "PROPOSED — chưa kiểm duyệt";
  const image = vocabulary.developmentMedia?.images?.find((item) => item.url === vocabulary.imageUrl);
  return (
    <span className={image?.originType === "GENERATED_EDITORIAL_LOCAL_PREVIEW" ? "editorial-local-preview-note" : "development-media-notice"} title={image ? `${image.sourceNoteIdentity} · SHA256 ${image.mediaSha256}` : undefined}>
      Media nguồn Development · {status} · quyền chưa xác minh
    </span>
  );
}

export function DevelopmentImagePreviews({ vocabulary }: { vocabulary: Pick<VocabularyDto, "word" | "developmentMedia"> }) {
  const images = vocabulary.developmentMedia?.images ?? [];
  if (images.length === 0) return null;
  return (
    <div className="development-media-image-list" aria-label={`Ảnh đề xuất cho ${vocabulary.word}`}>
      {images.map((image, index) => (
        <figure key={`${image.mediaSha256}:${index}`}>
          <img src={image.url} alt={`Ảnh nguồn đề xuất ${index + 1} cho ${vocabulary.word}`} loading="lazy" />
          <figcaption>
            {statusLabel(image.reviewStatus)} · quyền chưa xác minh<br />
            <small>{image.sourceNoteIdentity} · SHA256 {image.mediaSha256.slice(0, 12)}…</small>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
