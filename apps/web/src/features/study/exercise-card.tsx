import type { ExerciseInstance } from "./exercise-generator";
import { EXERCISE_TYPE } from "./exercise-generator";
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
  onAnswer: (optionId: string) => void;
  onAudioFailure: () => void;
};

function audioLabel(state: PronunciationAudioState): string {
  if (state === "loading") return "Đang tải phát âm";
  if (state === "playing") return "Tạm dừng phát âm";
  if (state === "ended") return "Nghe lại phát âm";
  if (state === "error") return "Âm thanh không khả dụng";
  return "Nghe phát âm";
}

export function ExerciseCard({ exercise, answer, saveState, onAnswer, onAudioFailure }: ExerciseCardProps) {
  const isListening = exercise.exerciseType === EXERCISE_TYPE.LISTENING_CHOICE;
  const audio = usePronunciationAudio(
    isListening ? exercise.audioUrl : null,
    "",
    exercise.vocabularyId,
    onAudioFailure
  );

  return (
    <section className="exercise-card" data-testid="exercise-card" data-exercise-type={exercise.exerciseType}>
      <div className="exercise-header">
        <span className="exercise-type-label">{isListening ? "Listening choice" : "Multiple choice"}</span>
        {isListening ? (
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

      <p className="exercise-prompt" data-testid="exercise-prompt">
        {isListening ? exercise.prompt : <>Chọn nghĩa đúng của <strong>{exercise.prompt}</strong>.</>}
      </p>

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
              onClick={() => onAnswer(option.optionId)}
            >
              <span>{option.label}</span>
              {answer && correct ? <span aria-label="Đáp án đúng">✓</span> : null}
            </button>
          );
        })}
      </fieldset>

      {answer ? (
        <div className={`exercise-feedback ${answer.result === "REMEMBERED" ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">
          {answer.result === "REMEMBERED"
            ? <><span>Chính xác.</span> <span>Đáp án: <strong>{exercise.options.find((option) => option.optionId === exercise.correctOptionId)?.label}</strong></span></>
            : <>Chưa đúng. Đáp án: <strong>{exercise.options.find((option) => option.optionId === exercise.correctOptionId)?.label}</strong></>}
          {saveState === "saving" ? <span className="exercise-save-status"> Đang lưu kết quả…</span> : null}
          {saveState === "save-failed" ? <span className="exercise-save-status"> Chưa lưu tiến trình.</span> : null}
        </div>
      ) : null}
    </section>
  );
}
