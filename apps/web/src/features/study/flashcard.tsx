import { useState } from "react";
import type { VocabularyDto } from "@vocabflow/contracts";
import { usePronunciationAudio } from "./pronunciation-audio";
import { DevelopmentExampleAudio, DevelopmentImageNotice, DevelopmentImagePreviews, DevelopmentWordAudio } from "./development-media";
import { ExampleAudio } from "./example-audio";
import { formatPartOfSpeech, formatVocabularyTopic, getVietnameseMeaningPresentation, parseVocabularyExamples } from "../vocabulary/vocabulary-presentation";

export type FlashcardProps = {
  vocabulary: VocabularyDto;
  isFlipped: boolean;
  onFlip: () => void;
};

export function Flashcard({ vocabulary, isFlipped, onFlip }: FlashcardProps) {
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
  const imageUrl = vocabulary.imageUrl?.trim() || null;
  const imageKey = imageUrl ? `${vocabulary.id}:${imageUrl}` : null;
  const imageFailed = imageKey !== null && failedImageKey === imageKey;
  const audio = usePronunciationAudio(vocabulary.audioUrl, vocabulary.word, vocabulary.id);
  const developmentAudio = (vocabulary.developmentMedia?.wordAudio?.length ?? 0) > 0;
  const examples = parseVocabularyExamples(vocabulary.examples);
  const exampleAudio = examples.flatMap((example, index) => {
    const hasPublishedAudio = Boolean(example.audioUrl && /^https:\/\//i.test(example.audioUrl));
    const hasDevelopmentAudio = Boolean(example.exampleKey && vocabulary.developmentMedia?.exampleAudio?.some((item) => item.exampleKey === example.exampleKey));
    return hasPublishedAudio || hasDevelopmentAudio ? [{ example, index, hasPublishedAudio }] : [];
  });
  const partOfSpeech = formatPartOfSpeech(vocabulary.partOfSpeech);
  const meaning = getVietnameseMeaningPresentation(vocabulary);
  const topic = formatVocabularyTopic(vocabulary.topic);
  const pronunciationDetail = [vocabulary.ipa, partOfSpeech].filter(Boolean).join(" · ");

  const audioLabel = audio.state === "loading"
    ? `Đang tải phát âm ${audio.word}`
    : audio.state === "playing"
      ? `Tạm dừng phát âm ${audio.word}`
      : audio.state === "ended"
        ? `Nghe lại phát âm ${audio.word}`
        : audio.state === "error"
          ? `Âm thanh không khả dụng cho ${audio.word}`
          : `Nghe phát âm ${audio.word}`;

  return (
    <div className="flashcard" data-testid="flashcard">
      {developmentAudio ? <DevelopmentWordAudio vocabulary={vocabulary} /> : null}
      {audio.hasAudio && !developmentAudio && audio.state !== "error" ? (
        <div className="flashcard-audio-control">
          <button
            className="auth-retry flashcard-audio-button"
            type="button"
            aria-label={audioLabel}
            aria-busy={audio.state === "loading"}
            data-audio-state={audio.state}
            disabled={audio.state === "loading"}
            onClick={audio.state === "playing" ? audio.pause : audio.play}
          >
            {audio.state === "loading" ? "Đang tải…" : audio.state === "playing" ? "Tạm dừng" : audio.state === "ended" ? "Nghe lại" : "Nghe phát âm"}
          </button>
        </div>
      ) : null}
      {audio.state === "error" && !developmentAudio ? <span className="flashcard-audio-error" role="status">Âm thanh không khả dụng.</span> : null}

      <button
        className={`flashcard-flip${isFlipped ? " is-back" : " is-front"}`}
        type="button"
        aria-label={isFlipped ? "Lật về mặt trước" : "Lật để xem nghĩa"}
        aria-describedby="flashcard-description"
        aria-pressed={isFlipped}
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            onFlip();
          }
        }}
      >
        {!isFlipped ? (
          <span className="flashcard-face flashcard-front">
            <span id="flashcard-description" className="sr-only">Từ tiếng Anh: {vocabulary.word}{pronunciationDetail ? `. ${pronunciationDetail}.` : ""}</span>
            <span className="flashcard-word">{vocabulary.word}</span>
            {pronunciationDetail ? <span className="flashcard-front-meta">{pronunciationDetail}</span> : null}
            <span className="flashcard-hint">Lật thẻ để xem nghĩa</span>
          </span>
        ) : (
          <span className="flashcard-face flashcard-back">
            <span id="flashcard-description" className="sr-only">Từ: {vocabulary.word}. {pronunciationDetail ? `${pronunciationDetail}. ` : ""}{meaning.primaryLabel}: {meaning.primary}.</span>
            <span className="flashcard-back-heading">
              <span className="flashcard-word">{vocabulary.word}</span>
              {pronunciationDetail ? <span className="flashcard-optional">{pronunciationDetail}</span> : null}
            </span>
            <span className="flashcard-meaning-block">
              <span className="flashcard-meaning-label">{meaning.primaryLabel}</span>
              <span className="flashcard-vietnamese" lang="vi">{meaning.primary}</span>
              {meaning.explanation ? <span className="flashcard-definition flashcard-vietnamese-explanation"><span className="flashcard-meaning-label">Giải thích</span><span lang="vi">{meaning.explanation}</span></span> : null}
            </span>
            {vocabulary.definitionEn ? <span className="flashcard-definition"><span className="flashcard-meaning-label">Định nghĩa tiếng Anh</span><span lang="en">{vocabulary.definitionEn}</span></span> : null}
            {examples.length > 0 ? examples.map((example, index) => (
              <span className="flashcard-example" key={`${index}:${example.english}`}>
                <span className="flashcard-example-line"><span className="flashcard-example-language">EN</span><span lang="en">{example.english}</span></span>
                {example.vietnamese ? <span className="flashcard-example-line"><span className="flashcard-example-language">VI</span><span lang="vi">{example.vietnamese}</span></span> : null}
              </span>
            )) : vocabulary.exampleEn ? <span className="flashcard-example"><span className="flashcard-example-line"><span className="flashcard-example-language">EN</span><span lang="en">{vocabulary.exampleEn}</span></span></span> : null}
            {topic ? <span className="flashcard-optional">{topic}</span> : null}
            {imageUrl && !imageFailed ? (
              <img className="flashcard-image" src={imageUrl} alt={`Minh họa cho ${vocabulary.word}`} onError={() => imageKey && setFailedImageKey(imageKey)} />
            ) : null}
            {imageUrl && imageFailed ? <span className="flashcard-image-fallback" role="status">Ảnh minh họa chưa tải được.</span> : null}
            <DevelopmentImageNotice vocabulary={vocabulary} />
            {!imageUrl || imageFailed ? <DevelopmentImagePreviews vocabulary={vocabulary} /> : null}
          </span>
        )}
      </button>

      {isFlipped && exampleAudio.length > 0 ? (
        <section className="flashcard-example-audios" aria-label="Âm thanh câu ví dụ">
          {exampleAudio.map(({ example, index, hasPublishedAudio }) => (
            <div className="flashcard-example-audio-item" key={`${index}:${example.exampleKey ?? example.english}`}>
              <span className="flashcard-example-audio-label">Audio · Ví dụ {index + 1}</span>
              {hasPublishedAudio
                ? <ExampleAudio audioUrl={example.audioUrl} exampleIndex={index} exampleText={example.english} />
                : <DevelopmentExampleAudio vocabulary={vocabulary} exampleKey={example.exampleKey} exampleIndex={index} exampleText={example.english} />}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
