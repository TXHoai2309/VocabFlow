import { useState } from "react";
import type { VocabularyDto } from "@vocabflow/contracts";
import { usePronunciationAudio } from "./pronunciation-audio";

export type FlashcardProps = {
  vocabulary: VocabularyDto;
  isFlipped: boolean;
  onFlip: () => void;
};

export function Flashcard({ vocabulary, isFlipped, onFlip }: FlashcardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const audio = usePronunciationAudio(vocabulary.audioUrl, vocabulary.word, vocabulary.id);

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
      {audio.hasAudio ? (
        <div className="flashcard-audio-control">
          <button
            className="auth-retry flashcard-audio-button"
            type="button"
            aria-label={audioLabel}
            aria-busy={audio.state === "loading"}
            data-audio-state={audio.state}
            disabled={audio.state === "loading" || audio.state === "error"}
            onClick={audio.state === "playing" ? audio.pause : audio.play}
          >
            {audio.state === "loading" ? "Đang tải…" : audio.state === "playing" ? "Tạm dừng" : audio.state === "ended" ? "Nghe lại" : "Nghe phát âm"}
          </button>
          {audio.state === "error" ? <span className="flashcard-audio-error" role="status">Âm thanh không khả dụng.</span> : null}
        </div>
      ) : null}

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
            {vocabulary.ipa ? <span className="flashcard-optional">{vocabulary.ipa}</span> : null}
            <span className="flashcard-vietnamese">{vocabulary.vietnamese}</span>
            {vocabulary.definitionEn ? <span className="flashcard-optional">{vocabulary.definitionEn}</span> : null}
            {vocabulary.exampleEn ? <span className="flashcard-example">{vocabulary.exampleEn}</span> : null}
            {vocabulary.topic ? <span className="flashcard-optional">{vocabulary.topic}</span> : null}
            {vocabulary.imageUrl && !imageFailed ? (
              <img className="flashcard-image" src={vocabulary.imageUrl} alt={`Minh họa cho ${vocabulary.word}`} onError={() => setImageFailed(true)} />
            ) : null}
          </span>
        )}
      </button>
    </div>
  );
}
