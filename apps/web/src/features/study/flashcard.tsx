import { useState } from "react";
import type { VocabularyDto } from "@vocabflow/contracts";
import { usePronunciationAudio } from "./pronunciation-audio";
import { DevelopmentExampleAudio, DevelopmentImageNotice, DevelopmentImagePreviews, DevelopmentWordAudio } from "./development-media";
import { ExampleAudio } from "./example-audio";
import { formatPartOfSpeech, formatVocabularyTopic, parseVocabularyExamples } from "../vocabulary/vocabulary-presentation";

export type FlashcardProps = {
  vocabulary: VocabularyDto;
  isFlipped: boolean;
  onFlip: () => void;
};

export function Flashcard({ vocabulary, isFlipped, onFlip }: FlashcardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const audio = usePronunciationAudio(vocabulary.audioUrl, vocabulary.word, vocabulary.id);
  const developmentAudio = (vocabulary.developmentMedia?.wordAudio?.length ?? 0) > 0;
  const examples = parseVocabularyExamples(vocabulary.examples);
  const partOfSpeech = formatPartOfSpeech(vocabulary.partOfSpeech);
  const topic = formatVocabularyTopic(vocabulary.topic);

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
        className="flashcard-flip"
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
            <span id="flashcard-description" className="sr-only">Từ tiếng Anh: {vocabulary.word}</span>
            <span className="flashcard-word">{vocabulary.word}</span>
            <span className="flashcard-hint">Nhấn để xem nghĩa</span>
          </span>
        ) : (
          <span className="flashcard-face flashcard-back">
            <span id="flashcard-description" className="sr-only">Từ: {vocabulary.word}. Nghĩa: {vocabulary.vietnamese}.</span>
            <span className="flashcard-word">{vocabulary.word}</span>
            {vocabulary.ipa || partOfSpeech ? <span className="flashcard-optional">{[vocabulary.ipa, partOfSpeech].filter(Boolean).join(" · ")}</span> : null}
            <span className="flashcard-meaning-label">Nghĩa tiếng Việt</span>
            <span className="flashcard-vietnamese">{vocabulary.vietnamese}</span>
            {vocabulary.definitionEn ? <span className="flashcard-definition"><span className="flashcard-meaning-label">Định nghĩa tiếng Anh</span><span lang="en">{vocabulary.definitionEn}</span></span> : null}
            {examples.length > 0 ? examples.map((example, index) => (
              <span className="flashcard-example" key={`${index}:${example.english}`}>
                <span className="flashcard-example-line"><span className="flashcard-example-language">EN</span><span lang="en">{example.english}</span></span>
                {example.vietnamese ? <span className="flashcard-example-line"><span className="flashcard-example-language">VI</span><span lang="vi">{example.vietnamese}</span></span> : null}
                {example.audioUrl
                  ? <ExampleAudio audioUrl={example.audioUrl} exampleIndex={index} />
                  : <DevelopmentExampleAudio vocabulary={vocabulary} exampleKey={example.exampleKey} />}
              </span>
            )) : vocabulary.exampleEn ? <span className="flashcard-example"><span className="flashcard-example-line"><span className="flashcard-example-language">EN</span><span lang="en">{vocabulary.exampleEn}</span></span></span> : null}
            {topic ? <span className="flashcard-optional">{topic}</span> : null}
            {vocabulary.imageUrl && !imageFailed ? (
              <img className="flashcard-image" src={vocabulary.imageUrl} alt={`Minh họa cho ${vocabulary.word}`} onError={() => setImageFailed(true)} />
            ) : null}
            <DevelopmentImageNotice vocabulary={vocabulary} />
            {!vocabulary.imageUrl || imageFailed ? <DevelopmentImagePreviews vocabulary={vocabulary} /> : null}
            {(!vocabulary.imageUrl || imageFailed) && (vocabulary.developmentMedia?.images?.length ?? 0) === 0
              ? <span className="flashcard-missing-image" role="img" aria-label={`Chưa có hình minh họa cho ${vocabulary.word}`}>Chưa có hình minh họa</span>
              : null}
          </span>
        )}
      </button>
    </div>
  );
}
