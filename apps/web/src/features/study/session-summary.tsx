import { Link } from "react-router";
import type { StudyScope } from "./study-queue";
import { formatStudyDuration, type StudySessionResult } from "./study-session-result";

function studySetupHref(scope: StudyScope | null) {
  const params = new URLSearchParams();
  if (scope?.type === "topic" || scope?.type === "learning-set") {
    params.set(scope.type === "topic" ? "topicId" : "learningSetId", String(scope.id));
  }
  if (scope?.type === "saved") params.set("saved", "1");
  const query = params.toString();
  return query ? `/study/setup?${query}` : "/study/setup";
}

function Metric({ icon, label, value, unit, tone }: { icon: string; label: string; value: string | number; unit?: string; tone: string }) {
  return (
    <article className={`study-summary-metric ${tone}`}>
      <span className="study-summary-metric-icon" aria-hidden="true">{icon}</span>
      <div>
        <h3>{label}</h3>
        <p><strong>{value}</strong>{unit ? <span> {unit}</span> : null}</p>
      </div>
    </article>
  );
}

export function SessionSummary({ result, scope, streak, onReviewWrong }: {
  result: StudySessionResult;
  scope: StudyScope | null;
  streak: number | null;
  onReviewWrong: () => void;
}) {
  const wrongCount = result.wrongItems.length;
  const continueHref = studySetupHref(scope);

  return (
    <section className="study-session-summary" data-testid="study-session-summary" aria-labelledby="study-summary-title">
      <header className="study-summary-hero">
        <span className="study-summary-hero-icon" aria-hidden="true">✓</span>
        <div className="study-summary-hero-copy">
          <p className="study-summary-eyebrow">BUỔI HỌC HOÀN TẤT</p>
          <h2 id="study-summary-title">Bạn đã hoàn thành buổi học!</h2>
          <p>Làm tốt lắm! Hãy tiếp tục duy trì thói quen học từ vựng.</p>
          <span className="study-summary-answered" data-testid="summary-answered-total">{result.correct + result.incorrect} / {result.total} câu đã hoàn thành</span>
        </div>
        <span className="study-summary-hero-spark" aria-hidden="true">✦</span>
      </header>

      <section className="study-summary-metrics" aria-label="Kết quả buổi học">
        <Metric icon="✓" label="Đúng" value={result.correct} unit="từ" tone="is-success" />
        <Metric icon="×" label="Sai" value={result.incorrect} unit="từ" tone="is-danger" />
        <Metric icon="▧" label="Từ mới" value={result.newCount} unit="từ" tone="is-primary" />
        <Metric icon="↻" label="Từ đã ôn" value={result.reviewCount} unit="từ" tone="is-warning" />
      </section>

      <section className="study-summary-secondary-metrics" aria-label="Thời lượng và ôn tập">
        {result.completedAt !== null ? <Metric icon="◷" label="Thời gian học" value={formatStudyDuration(result.startedAt, result.completedAt)} tone="is-neutral" /> : null}
        <Metric icon="↻" label="Cần ôn lại" value={wrongCount} unit="từ" tone="is-warning" />
        {streak !== null ? <Metric icon="♨" label="Chuỗi ngày" value={streak} unit="ngày" tone="is-blue" /> : null}
      </section>

      {wrongCount === 0 ? (
        <p className="study-summary-all-correct" role="status"><span aria-hidden="true">✓</span> Bạn không có từ nào trả lời sai trong buổi học này.</p>
      ) : (
        <section className="study-summary-wrong" aria-labelledby="study-summary-wrong-title">
          <div className="study-summary-section-heading">
            <span className="study-summary-section-icon" aria-hidden="true">↻</span>
            <div>
              <h3 id="study-summary-wrong-title">Các từ cần ôn lại</h3>
              <p>Những từ bạn trả lời chưa đúng trong buổi học này.</p>
            </div>
          </div>
          <ul className="study-summary-wrong-list">
            {result.wrongItems.map(({ item, learnerAnswer, correctAnswer }) => (
              <li key={item.vocabulary.id}>
                <article className="study-summary-wrong-row">
                  {item.vocabulary.imageUrl
                    ? <img className="study-summary-word-image" src={item.vocabulary.imageUrl} alt={item.vocabulary.word} loading="lazy" />
                    : <span className="study-summary-word-image-placeholder" aria-hidden="true">▧</span>}
                  <div className="study-summary-word">
                    <Link to={`/vocabulary/${item.vocabulary.id}`}>{item.vocabulary.word}</Link>
                    {item.vocabulary.ipa ? <span>{item.vocabulary.ipa}</span> : null}
                  </div>
                  <div className="study-summary-answer"><span>Nghĩa của từ</span><strong>{item.vocabulary.vietnamese}</strong></div>
                  {learnerAnswer ? <div className="study-summary-answer"><span>Câu trả lời của bạn</span><strong>{learnerAnswer}</strong></div> : null}
                  {correctAnswer ? <div className="study-summary-answer"><span>Đáp án đúng</span><strong>{correctAnswer}</strong></div> : null}
                  <span className="study-summary-wrong-badge"><span aria-hidden="true">×</span> Trả lời sai</span>
                  <span className="study-summary-row-chevron" aria-hidden="true">›</span>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className={`study-summary-actions${wrongCount > 0 ? " has-wrong-words" : ""}`} aria-label="Hành động sau buổi học">
        {wrongCount > 0 ? <button className="study-summary-button is-primary" type="button" onClick={onReviewWrong}><span aria-hidden="true">↻</span> Ôn từ sai <span aria-hidden="true">→</span></button> : null}
        <Link className={`study-summary-button ${wrongCount === 0 ? "is-primary" : "is-secondary"}`} to={continueHref}><span aria-hidden="true">▶</span> Học tiếp <span aria-hidden="true">→</span></Link>
        <Link className={`study-summary-button ${wrongCount === 0 ? "is-secondary" : "is-tertiary"}`} to="/"><span aria-hidden="true">⌂</span> Về trang chủ</Link>
      </nav>
      <p className="study-summary-retention-note">Kết quả này chỉ được giữ trong phiên hiện tại.</p>
    </section>
  );
}
