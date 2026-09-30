import { useState } from "react";
import type { ExerciseSubmission } from "@vocabflow/contracts";
import type { ExerciseInstance } from "./exercise-generator";
import { EXERCISE_TYPE, normalizeExerciseAnswer, TYPE_WORD_CUE, TYPE_WORD_SUBMISSION } from "./exercise-generator";
import type { PronunciationAudioState } from "./pronunciation-audio";
import { usePronunciationAudio } from "./pronunciation-audio";

export type ExerciseAnswer = {
  optionId: string;
  result: "REMEMBERED" | "FORGOTTEN";
};

export type ExerciseCardProps = {
  exercise: ExerciseInstance;
  answer: ExerciseAnswer | null;
  saveState: "ready" | "saving" | "save-failed" | "awaiting-next";
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

export function ExerciseCard({ exercise, answer, saveState, onAnswer, onAudioFailure, onImageFailure }: ExerciseCardProps) {
  const isListening = exercise.exerciseType === EXERCISE_TYPE.LISTENING_CHOICE;
  const isTypeWord = exercise.exerciseType === EXERCISE_TYPE.TYPE_WORD;
  const hasAudioCue = isListening || (isTypeWord && exercise.cueType === TYPE_WORD_CUE.AUDIO);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typingError, setTypingError] = useState<string | null>(null);
  const [typeSubmitted, setTypeSubmitted] = useState(false);
  const audio = usePronunciationAudio(
    hasAudioCue ? exercise.audioUrl : null,
    "",
    exercise.vocabularyId,
    onAudioFailure
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

  return (
    <section className="exercise-card" data-testid="exercise-card" data-exercise-type={exercise.exerciseType}>
      <div className="exercise-header">
        <span className="exercise-type-label">
          {isListening ? "Nghe và chọn" : exercise.exerciseType === EXERCISE_TYPE.IMAGE_TO_WORD ? "Nhìn hình, chọn từ" : isTypeWord ? "Gõ từ" : "Trắc nghiệm"}
        </span>
        {hasAudioCue ? (
          <button
            className="auth-retry exercise-audio-button"
            type="button"
            aria-label={audioLabel(audio.state)}
            aria-busy={audio.state === "loading"}
            data-testid="exercise-audio-button"
            disabled={audio.state === "loading" || audio.state === "error" || Boolean(answer)}
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

      <p className="exercise-prompt" data-testid="exercise-prompt">
        {isListening || isTypeWord || exercise.exerciseType === EXERCISE_TYPE.IMAGE_TO_WORD
          ? exercise.prompt
          : <>Chọn nghĩa đúng của <strong>{exercise.prompt}</strong>.</>}
      </p>

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
          {exercise.options.map((option) => {
            const selected = answer?.optionId === option.optionId;
            const correct = Boolean(answer) && exercise.correctOptionId === option.optionId;
            return (
              <button
                className={`exercise-option${selected ? " is-selected" : ""}${correct ? " is-correct" : ""}`}
                type="button"
                key={option.optionId}
                aria-pressed={selected}
                onClick={() => {
                  const submission: ExerciseSubmission = exercise.exerciseType === EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING
                    ? { type: EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING, answer: option.label }
                    : exercise.exerciseType === EXERCISE_TYPE.LISTENING_CHOICE
                      ? { type: EXERCISE_TYPE.LISTENING_CHOICE, selectedVocabularyId: option.vocabularyId }
                      : { type: EXERCISE_TYPE.IMAGE_TO_WORD, selectedVocabularyId: option.vocabularyId };
                  onAnswer(option.optionId, submission);
                }}
              >
                <span>{option.label}</span>
                {answer && correct ? <span aria-label="Đáp án đúng">✓</span> : null}
              </button>
            );
          })}
        </fieldset>
      )}

      {answer ? (
        <div className={`exercise-feedback ${answer.result === "REMEMBERED" ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">
          {answer.result === "REMEMBERED"
            ? <><span>Chính xác.</span> <span>Đáp án: <strong>{canonicalAnswer}</strong></span></>
            : <>Chưa đúng. Đáp án: <strong>{canonicalAnswer}</strong></>}
          {saveState === "saving" ? <span className="exercise-save-status"> Đang lưu kết quả…</span> : null}
          {saveState === "save-failed" ? <span className="exercise-save-status"> Chưa lưu tiến trình.</span> : null}
        </div>
      ) : null}
    </section>
  );
}
