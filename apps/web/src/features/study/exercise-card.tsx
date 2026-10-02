import { useState } from "react";
import type { ExerciseSubmission, VocabularyDto } from "@vocabflow/contracts";
import type { ExerciseInstance } from "./exercise-generator";
import { EXERCISE_TYPE, exerciseSubmissionForOption, normalizeExerciseAnswer, TYPE_WORD_CUE, TYPE_WORD_SUBMISSION } from "./exercise-generator";
import type { PronunciationAudioState } from "./pronunciation-audio";
import { usePronunciationAudio } from "./pronunciation-audio";

export type ExerciseAnswer = {
  optionId: string;
  result: "REMEMBERED" | "FORGOTTEN";
};

export type ExerciseCardProps = {
  exercise: ExerciseInstance;
  vocabulary: VocabularyDto;
  answer: ExerciseAnswer | null;
  saveState: "ready" | "saving" | "feedback" | "save-failed";
  onAnswer: (optionId: string, submission: ExerciseSubmission) => void;
  onAudioFailure: () => void;
  onImageFailure?: () => void;
};

function audioLabel(state: PronunciationAudioState): string {
  if (state === "loading") return "Đang tải phát âm";
  if (state === "playing") return "Tạm dừng phát âm";
  if (state === "ended") return "Nghe lại phát âm";
  if (state === "error") return "Âm thanh không khả dụng";
  return "Nghe phát âm";
}

export function ExerciseCard({ exercise, vocabulary, answer, saveState, onAnswer, onAudioFailure, onImageFailure }: ExerciseCardProps) {
  const isListening = exercise.exerciseType === EXERCISE_TYPE.LISTENING_CHOICE;
  const isTypeWord = exercise.exerciseType === EXERCISE_TYPE.TYPE_WORD;
  const showsWord = exercise.exerciseType === EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING;
  const hasAudioCue = isListening || (isTypeWord && exercise.cueType === TYPE_WORD_CUE.AUDIO);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typingError, setTypingError] = useState<string | null>(null);
  const [typeSubmitted, setTypeSubmitted] = useState(false);
  const audio = usePronunciationAudio(
    hasAudioCue ? exercise.audioUrl : showsWord ? vocabulary.audioUrl : null,
    showsWord ? vocabulary.word : "",
    exercise.vocabularyId,
    hasAudioCue ? onAudioFailure : undefined
  );

  const submitTypedAnswer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (answer || typeSubmitted || saveState !== "ready") return;
    if (!normalizeExerciseAnswer(typedAnswer)) {
      setTypingError("Nhập câu trả lời trước khi gửi.");
      return;
    }
    setTypingError(null);
    setTypeSubmitted(true);
    onAnswer(TYPE_WORD_SUBMISSION, { type: EXERCISE_TYPE.TYPE_WORD, answer: typedAnswer });
  };

  const canonicalAnswer = exercise.correctAnswer
    ?? exercise.options.find((option) => option.optionId === exercise.correctOptionId)?.label;
  const audioButtonLabel = showsWord ? `${audioLabel(audio.state)} ${vocabulary.word}` : audioLabel(audio.state);
  const exerciseLabel = isListening
    ? "Nghe và chọn"
    : exercise.exerciseType === EXERCISE_TYPE.IMAGE_TO_WORD
      ? "Nhìn hình, chọn từ"
      : isTypeWord
        ? "Gõ từ"
        : "Nhận biết nghĩa";

  return (
    <section className="exercise-card" data-testid="exercise-card" data-exercise-type={exercise.exerciseType}>
      <div className="exercise-header">
        <span className="exercise-type-label">{exerciseLabel}</span>
        {hasAudioCue || showsWord ? (
          <button
            className="auth-retry exercise-audio-button"
            type="button"
            aria-label={audioButtonLabel}
            aria-busy={audio.state === "loading"}
            data-testid="exercise-audio-button"
            disabled={!audio.hasAudio || audio.state === "loading" || audio.state === "error" || Boolean(answer)}
            onClick={audio.state === "playing" ? audio.pause : audio.play}
          >
            {audio.state === "loading" ? "Đang tải…" : audio.state === "playing" ? "Tạm dừng" : audio.state === "ended" ? "Nghe lại" : "Nghe phát âm"}
          </button>
        ) : null}
      </div>

      {exercise.imageUrl ? (
        <img
          className="exercise-image"
          src={exercise.imageUrl}
          alt="Hình ảnh gợi ý cho bài tập từ vựng"
          data-testid="exercise-image"
          onError={onImageFailure ?? onAudioFailure}
        />
      ) : null}

      {showsWord ? (
        <div className="exercise-word-content">
          <h2 className="exercise-word" data-testid="exercise-word">{vocabulary.word}</h2>
          {vocabulary.ipa ? <p className="exercise-ipa">{vocabulary.ipa}</p> : null}
          <p className="exercise-prompt" data-testid="exercise-prompt">Chọn nghĩa đúng của từ này.</p>
        </div>
      ) : (
        <p className="exercise-prompt" data-testid="exercise-prompt">{exercise.prompt}</p>
      )}

      {exercise.cueText ? <p className="exercise-cue" data-testid="exercise-cue">{exercise.cueText}</p> : null}

      {isTypeWord ? (
        <form className="exercise-typing-form" onSubmit={submitTypedAnswer} noValidate>
          <label className="exercise-typing-label" htmlFor="exercise-answer">Từ tiếng Anh</label>
          <input
            id="exercise-answer"
            className="exercise-typing-input"
            type="text"
            autoComplete="off"
            value={typedAnswer}
            disabled={Boolean(answer) || typeSubmitted || saveState !== "ready"}
            aria-invalid={Boolean(typingError)}
            aria-describedby={typingError ? "exercise-typing-error" : undefined}
            onChange={(event) => {
              setTypedAnswer(event.target.value);
              if (typingError) setTypingError(null);
            }}
          />
          {typingError ? <p id="exercise-typing-error" className="exercise-typing-error" role="alert">{typingError}</p> : null}
          <button className="register-submit exercise-submit-button" type="submit" disabled={Boolean(answer) || typeSubmitted || saveState !== "ready" || !normalizeExerciseAnswer(typedAnswer)}>
            Gửi câu trả lời
          </button>
        </form>
      ) : (
        <fieldset className="exercise-options" disabled={Boolean(answer) || saveState !== "ready"}>
          <legend className="sr-only">Các đáp án</legend>
          {exercise.options.map((option, index) => {
            const selected = answer?.optionId === option.optionId;
            const correct = Boolean(answer) && exercise.correctOptionId === option.optionId;
            const incorrect = selected && answer?.result === "FORGOTTEN";
            return (
              <button
                className={`exercise-option${selected ? " is-selected" : ""}${correct ? " is-correct" : ""}${incorrect ? " is-incorrect" : ""}`}
                type="button"
                key={option.optionId}
                aria-pressed={selected}
                aria-label={option.label}
                aria-keyshortcuts={index < 9 ? String(index + 1) : undefined}
                onClick={() => {
                  onAnswer(option.optionId, exerciseSubmissionForOption(exercise, option));
                }}
              >
                <span className="exercise-option-key" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                <span>{option.label}</span>
                {answer && correct ? <span className="exercise-option-state" aria-hidden="true">✓ <small>Đáp án đúng</small></span> : null}
                {incorrect ? <span className="exercise-option-state" aria-hidden="true">× <small>Bạn đã chọn</small></span> : null}
              </button>
            );
          })}
        </fieldset>
      )}

      {answer ? (
        <div className={`exercise-feedback ${answer.result === "REMEMBERED" ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">
          {answer.result === "REMEMBERED"
            ? <><strong>Chính xác!</strong> <span>{showsWord ? <>“{vocabulary.word}” có nghĩa là “{vocabulary.vietnamese}”.</> : <>Đáp án: {canonicalAnswer}</>}</span></>
            : <><strong>Chưa đúng.</strong> <span>Đáp án đúng là {canonicalAnswer}.</span></>}
        </div>
      ) : null}
    </section>
  );
}
