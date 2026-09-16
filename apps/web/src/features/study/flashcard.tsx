import { useRef, useState } from "react";
import type { VocabularyDto } from "@vocabflow/contracts";

export type FlashcardProps = {
  vocabulary: VocabularyDto;
  isFlipped: boolean;
  onFlip: () => void;
};

export function Flashcard({ vocabulary, isFlipped, onFlip }: FlashcardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch(() => setAudioUnavailable(true));
  };

  return (
    <>
      <div className="flashcard" data-testid="flashcard">
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

      {vocabulary.audioUrl ? (
        <div className="flashcard-audio-row">
          {audioUnavailable ? (
            <span role="status">Âm thanh không khả dụng.</span>
          ) : (
            <>
              <button className="auth-retry flashcard-audio-button" type="button" onClick={playAudio}>Phát âm thanh</button>
              <audio ref={audioRef} src={vocabulary.audioUrl} preload="none" onError={() => setAudioUnavailable(true)} />
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
