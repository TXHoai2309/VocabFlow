import { AccountLearningState } from "./account-learning-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import type { LearnerDto, LearnerVocabularyDto } from "@vocabflow/contracts";
import { useActiveLearner } from "./learner-context-hook";
import { LearnerVocabularyClientError, requestLearnerVocabulary } from "./vocabulary-list-client";
import { usePronunciationAudio } from "../study/pronunciation-audio";
import { DevelopmentExampleAudio, DevelopmentImageNotice, DevelopmentImagePreviews, DevelopmentWordAudio } from "../study/development-media";
import { ExampleAudio } from "../study/example-audio";
import { formatPartOfSpeech, formatVocabularyTopic, parseVocabularyExamples } from "../vocabulary/vocabulary-presentation";
import { requestSavedVocabulary, saveVocabulary, unsaveVocabulary } from "./saved-vocabulary-client";
import { ErrorState, LoadingState } from "../../components/async-states";
import { useToast } from "../../components/toast/toast-context";

type DetailState = "loading" | "ready" | "error";

type DetailIconName =
  | "back"
  | "speaker"
  | "bookmark"
  | "play"
  | "definition"
  | "example"
  | "related"
  | "opposite"
  | "topic"
  | "progress"
  | "study"
  | "calendar"
  | "target"
  | "link"
  | "chevron"
  | "image";

function DetailIcon({ name, className, filled = false }: { name: DetailIconName; className?: string; filled?: boolean }) {
  const paths: Record<DetailIconName, string> = {
    back: "M15 18 9 12l6-6M20 12H4",
    speaker: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13",
    bookmark: "M6 4h12v17l-6-4-6 4z",
    play: "m8 5 12 7-12 7z",
    definition: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
    example: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z",
    related: "M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7m2.7 6.4a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7",
    opposite: "m16 3 4 4-4 4M4 7h16M8 21l-4-4 4-4m12 4H4",
    topic: "M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 8h18",
    progress: "M4 19V10m5 9V5m5 14v-7m5 7V3M2 21h20",
    study: "M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5",
    calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z",
    target: "M12 2v4m0 12v4M2 12h4m12 0h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
    link: "M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7m2.7 6.4a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7",
    chevron: "m9 18 6-6-6-6",
    image: "M4 4h16v16H4zM8 10h.01M20 15l-5-5L5 20"
  };

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill={name === "play" || (name === "bookmark" && filled) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

function statusLabel(status: LearnerVocabularyDto["status"]) {
  return status === "LEARNING" ? "Đang học" : status === "MASTERED" ? "Đã thành thạo" : "Từ mới";
}

function levelLabel(level: LearnerVocabularyDto["level"]) {
  if (!level) return null;
  return level === "GENERAL" ? "Chung" : `Lớp ${level.slice(-1)}`;
}

function formatReviewDate(value: string | null) {
  if (!value) return "Chưa có lịch ôn";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Chưa có lịch ôn";
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(year, month - 1, day));
}

function detailErrorMessage(error: unknown) {
  if (error instanceof LearnerVocabularyClientError && (error.status === 401 || error.code === "UNAUTHORIZED")) {
    return "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
  }
  if (error instanceof LearnerVocabularyClientError && (error.status === 403 || error.code === "HOUSEHOLD_ACCESS_DENIED")) {
    return "Không thể xem từ vựng của bạn.";
  }
  return "Không thể tải chi tiết từ vựng lúc này. Vui lòng thử lại.";
}

export function VocabularyDetailPage() {
  const { activeLearner } = useActiveLearner();
  const { vocabularyId } = useParams();
  if (!activeLearner) {
    return <AccountLearningState />;
  }
  const id = vocabularyId && /^\d+$/.test(vocabularyId) ? Number(vocabularyId) : NaN;
  return <VocabularyDetailExperience key={`${activeLearner.id}:${vocabularyId ?? "missing"}`} activeLearner={activeLearner} vocabularyId={id} />;
}

function VocabularyDetailExperience({ activeLearner, vocabularyId }: { activeLearner: LearnerDto; vocabularyId: number }) {
  const toast = useToast();
  const hasValidVocabularyId = Number.isSafeInteger(vocabularyId) && vocabularyId > 0;
  const [state, setState] = useState<DetailState>(hasValidVocabularyId ? "loading" : "ready");
  const [vocabulary, setVocabulary] = useState<LearnerVocabularyDto | null>(null);
  const [allVocabulary, setAllVocabulary] = useState<LearnerVocabularyDto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [savedVocabularyState, setSavedVocabularyState] = useState<"loading" | "ready" | "error">("loading");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mutationInFlight = useRef(false);

  const loadVocabulary = useCallback(async () => {
    setState("loading");
    setVocabulary(null);
    setAllVocabulary([]);
    setMessage(null);
    if (!Number.isSafeInteger(vocabularyId) || vocabularyId < 1) {
      setState("ready");
      return;
    }
    try {
      const response = await requestLearnerVocabulary(activeLearner.id);
      setAllVocabulary(response);
      setVocabulary(response.find((item) => item.id === vocabularyId) ?? null);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(detailErrorMessage(error));
    }
  }, [activeLearner.id, vocabularyId]);

  const loadSavedVocabulary = useCallback(async () => {
    setSavedVocabularyState("loading");
    try {
      const saved = await requestSavedVocabulary(activeLearner.id);
      setIsSaved(saved.some((entry) => entry.vocabulary.id === vocabularyId));
      setSavedVocabularyState("ready");
    } catch {
      setSavedVocabularyState("error");
    }
  }, [activeLearner.id, vocabularyId]);

  const toggleSaved = useCallback(async (item: LearnerVocabularyDto) => {
    if (savedVocabularyState !== "ready" || mutationInFlight.current) return;
    const wasSaved = isSaved;
    mutationInFlight.current = true;
    setIsSaving(true);
    setIsSaved(!wasSaved);
    try {
      const response = wasSaved
        ? await unsaveVocabulary(activeLearner.id, item.id)
        : await saveVocabulary(activeLearner.id, item.id);
      if (response.saved === wasSaved) throw new Error("INVALID_RESPONSE");
      toast.success(wasSaved ? "Đã bỏ khỏi Yêu thích" : "Đã thêm vào Yêu thích");
    } catch {
      setIsSaved(wasSaved);
      toast.error("Không thể cập nhật Yêu thích. Vui lòng thử lại.");
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  }, [activeLearner.id, isSaved, savedVocabularyState, toast]);

  useEffect(() => {
    let cancelled = false;
    if (!hasValidVocabularyId) return () => { cancelled = true; };
    void requestLearnerVocabulary(activeLearner.id, undefined, vocabularyId)
      .then((response) => {
        if (cancelled) return;
        setAllVocabulary(response);
        setVocabulary(response.find((item) => item.id === vocabularyId) ?? null);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMessage(detailErrorMessage(error));
        setState("error");
      });
    return () => { cancelled = true; };
  }, [activeLearner.id, hasValidVocabularyId, vocabularyId]);

  useEffect(() => {
    let cancelled = false;
    if (!hasValidVocabularyId) return () => { cancelled = true; };
    void requestSavedVocabulary(activeLearner.id)
      .then((saved) => {
        if (cancelled) return;
        setIsSaved(saved.some((entry) => entry.vocabulary.id === vocabularyId));
        setSavedVocabularyState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setSavedVocabularyState("error");
      });
    return () => { cancelled = true; };
  }, [activeLearner.id, hasValidVocabularyId, vocabularyId]);

  return (
    <main className="vocabulary-detail-page" aria-label="Chi tiết từ vựng">
      <header className="vocabulary-detail-topbar">
        <Link className="vocabulary-detail-back" to="/vocabulary" aria-label="Quay lại Từ vựng">
          <DetailIcon name="back" />
        </Link>
        <nav className="vocabulary-detail-breadcrumb" aria-label="Đường dẫn">
          <Link to="/vocabulary">Từ vựng</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Chi tiết từ vựng</span>
        </nav>
      </header>

      {state === "loading" ? <LoadingState className="vocabulary-detail-state" label="Đang tải chi tiết từ vựng…" pattern="detail" testId="vocabulary-detail-loading" /> : null}
      {state === "error" ? (
        <ErrorState className="vocabulary-detail-error" title="Không thể tải từ vựng này" description={message ?? "Vui lòng thử lại."} onRetry={() => void loadVocabulary()} testId="vocabulary-detail-error" />
      ) : null}
      {state === "ready" && !vocabulary ? (
        <section className="vocabulary-detail-missing" data-testid="vocabulary-detail-not-found" role="status">
          <h1 id="vocabulary-detail-title">Không tìm thấy từ vựng</h1>
          <p>Từ này không có trong danh sách học tập hiện tại của bạn.</p>
          <Link className="vocabulary-detail-primary-link" to="/vocabulary">Về danh sách từ vựng</Link>
        </section>
      ) : null}
      {state === "ready" && vocabulary ? (
        <VocabularyDetailContent
          vocabulary={vocabulary}
          allVocabulary={allVocabulary}
          isSaved={isSaved}
          isSaving={isSaving}
          savedVocabularyState={savedVocabularyState}
          onToggleSaved={() => void toggleSaved(vocabulary)}
          onRetrySaved={() => void loadSavedVocabulary()}
        />
      ) : null}
    </main>
  );
}

function VocabularyDetailContent({ vocabulary, allVocabulary, isSaved, isSaving, savedVocabularyState, onToggleSaved, onRetrySaved }: {
  vocabulary: LearnerVocabularyDto;
  allVocabulary: LearnerVocabularyDto[];
  isSaved: boolean;
  isSaving: boolean;
  savedVocabularyState: "loading" | "ready" | "error";
  onToggleSaved: () => void;
  onRetrySaved: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const audio = usePronunciationAudio(vocabulary.audioUrl, vocabulary.word, vocabulary.id);
  const hasDevelopmentAudio = (vocabulary.developmentMedia?.wordAudio?.length ?? 0) > 0;
  const examples = parseVocabularyExamples(vocabulary.examples);
  const relatedWords = vocabulary.topic
    ? allVocabulary.filter((item) => item.id !== vocabulary.id && item.topic?.trim().toLocaleLowerCase() === vocabulary.topic?.trim().toLocaleLowerCase()).slice(0, 3)
    : [];
  const level = levelLabel(vocabulary.level);
  const partOfSpeech = formatPartOfSpeech(vocabulary.partOfSpeech);
  const topic = formatVocabularyTopic(vocabulary.topic);
  const mediaRightsPending = vocabulary.rightsStatus === "UNKNOWN_REVIEW_REQUIRED";
  const audioUnavailableMessage = mediaRightsPending
    ? "Phát âm chưa khả dụng; quyền media nguồn đang chờ xác minh."
    : "Chưa có tệp phát âm";
  const imageUnavailableMessage = mediaRightsPending
    ? "Hình ảnh chưa khả dụng; quyền media nguồn đang chờ xác minh."
    : "Chưa có hình minh họa";
  const audioLabel = audio.state === "playing" ? `Tạm dừng phát âm ${vocabulary.word}`
    : audio.state === "ended" ? `Nghe lại phát âm ${vocabulary.word}`
      : audio.state === "error" ? `Âm thanh không khả dụng cho ${vocabulary.word}`
      : `Nghe phát âm ${vocabulary.word}`;

  return (
    <div className="vocabulary-detail-layout">
      <div className="vocabulary-detail-primary-column">
        <section className="vocabulary-detail-hero" aria-labelledby="vocabulary-detail-title">
          <div className="vocabulary-detail-hero-copy">
            <div className="vocabulary-detail-word-row">
              {!hasDevelopmentAudio && audio.hasAudio && audio.state !== "error" ? <button
                className="vocabulary-detail-speaker"
                type="button"
                aria-label={audioLabel}
                aria-busy={audio.state === "loading"}
                disabled={audio.state === "loading"}
                onClick={audio.state === "playing" ? audio.pause : audio.play}
              >
                <DetailIcon name="speaker" />
              </button> : null}
              <div className="vocabulary-detail-word-copy">
                <h1 id="vocabulary-detail-title">{vocabulary.word}</h1>
                {vocabulary.ipa || partOfSpeech ? <p className="vocabulary-detail-ipa">{[vocabulary.ipa, partOfSpeech].filter(Boolean).join(" · ")}</p> : null}
              </div>
            </div>

            <div className="vocabulary-detail-badges" aria-label="Thông tin từ vựng">
              {topic ? <span className="vocabulary-detail-badge vocabulary-detail-badge-topic">{topic}</span> : null}
              {level ? <span className="vocabulary-detail-badge vocabulary-detail-badge-level">{level}</span> : null}
              <span className="vocabulary-detail-badge vocabulary-detail-badge-status">{statusLabel(vocabulary.status)}</span>
            </div>

            <div className="vocabulary-detail-meaning-block">
              <span className="vocabulary-detail-meaning-label">{vocabulary.sourceMeaningVi ? "Nghĩa tiếng Việt theo nguồn" : "Nghĩa của sense đang học"}</span>
              <p className="vocabulary-detail-meaning">{vocabulary.sourceMeaningVi ?? vocabulary.vietnamese}</p>
              {vocabulary.sourceMeaningVi && vocabulary.sourceMeaningVi.trim() !== vocabulary.vietnamese.trim() ? <>
                <span className="vocabulary-detail-meaning-label">Nghĩa của sense đang học</span>
                <p className="vocabulary-detail-meaning">{vocabulary.vietnamese}</p>
              </> : null}
            </div>
            <div className="vocabulary-detail-actions">
              {!hasDevelopmentAudio && audio.hasAudio && audio.state !== "error" ? <button
                className="vocabulary-detail-action vocabulary-detail-action-primary"
                type="button"
                disabled={audio.state === "loading"}
                aria-busy={audio.state === "loading"}
                onClick={audio.state === "playing" ? audio.pause : audio.play}
              >
                <DetailIcon name="speaker" />
                {audio.state === "loading" ? "Đang tải…" : audio.state === "playing" ? "Tạm dừng" : audio.state === "ended" ? "Nghe lại" : "Nghe phát âm"}
              </button> : !hasDevelopmentAudio && !audio.hasAudio ? <span className="vocabulary-detail-audio-unavailable">{audioUnavailableMessage}</span> : null}
              <button
                className={`vocabulary-detail-action vocabulary-detail-action-secondary${isSaved ? " is-saved" : ""}`}
                type="button"
                disabled={savedVocabularyState !== "ready" || isSaving}
                aria-label={`${isSaved ? "Bỏ lưu" : "Lưu"} từ ${vocabulary.word}`}
                aria-pressed={isSaved}
                aria-busy={isSaving || savedVocabularyState === "loading"}
                title={isSaved ? `Bỏ lưu ${vocabulary.word}` : `Lưu ${vocabulary.word}`}
                onClick={onToggleSaved}
              >
                <DetailIcon name="bookmark" filled={isSaved} />
                {isSaved ? "Đã lưu" : "Lưu từ"}
              </button>
              <Link className="vocabulary-detail-action vocabulary-detail-action-secondary" to="/study/setup">
                <DetailIcon name="play" />
                Bắt đầu học
              </Link>
            </div>
            {hasDevelopmentAudio ? <DevelopmentWordAudio vocabulary={vocabulary} /> : null}
            {savedVocabularyState === "error" ? <p className="vocabulary-detail-save-error" role="alert">Không thể tải trạng thái từ đã lưu. <button type="button" onClick={onRetrySaved}>Thử lại</button></p> : null}
            {audio.state === "error" ? <p className="vocabulary-detail-audio-error" role="status">Âm thanh không khả dụng lúc này.</p> : null}
          </div>

          <div className="vocabulary-detail-image-panel">
            {vocabulary.imageUrl && !imageFailed ? (
              <img src={vocabulary.imageUrl} alt={`Minh họa cho từ ${vocabulary.word}`} onError={() => setImageFailed(true)} />
            ) : (
              <div className="vocabulary-detail-image-placeholder" role="img" aria-label={`${imageUnavailableMessage} ${vocabulary.word}`}>
                <DetailIcon name="image" />
                <span>{imageUnavailableMessage}</span>
              </div>
            )}
            <DevelopmentImageNotice vocabulary={vocabulary} />
            {!vocabulary.imageUrl || imageFailed ? <DevelopmentImagePreviews vocabulary={vocabulary} /> : null}
          </div>
        </section>

        <div className="vocabulary-detail-content-grid">
          <DetailCard icon="definition" title="Định nghĩa tiếng Anh" className="vocabulary-detail-definition">
            {vocabulary.definitionEn ? <p lang="en">{vocabulary.definitionEn}</p> : <p className="vocabulary-detail-empty-copy">Chưa có định nghĩa chi tiết cho từ này.</p>}
          </DetailCard>

          <DetailCard icon="example" title="Ví dụ" className="vocabulary-detail-examples">
            {examples.length > 0 ? (
              <ol className="vocabulary-detail-example-list">
                {examples.map((example, index) => (
                  <li key={`${index}:${example.english}`}>
                    <span className="vocabulary-detail-example-line">
                      <span className="vocabulary-detail-example-language">EN</span>
                      <span lang="en">{example.english}</span>
                    </span>
                    {example.vietnamese ? <span className="vocabulary-detail-example-line">
                      <span className="vocabulary-detail-example-language">VI</span>
                      <span lang="vi" className="vocabulary-detail-example-translation">{example.vietnamese}</span>
                    </span> : null}
                    {example.audioUrl
                      ? <ExampleAudio audioUrl={example.audioUrl} exampleIndex={index} />
                      : <DevelopmentExampleAudio vocabulary={vocabulary} exampleKey={example.exampleKey} />}
                  </li>
                ))}
              </ol>
            ) : vocabulary.exampleEn ? (
              <ol className="vocabulary-detail-example-list">
                <li><span lang="en">{vocabulary.exampleEn}</span></li>
              </ol>
            ) : <p className="vocabulary-detail-empty-copy">Chưa có câu ví dụ cho từ này.</p>}
          </DetailCard>

          <DetailCard icon="related" title="Từ đồng nghĩa" className="vocabulary-detail-synonyms">
            <p className="vocabulary-detail-empty-copy">Chưa có dữ liệu từ đồng nghĩa.</p>
          </DetailCard>

          <DetailCard icon="opposite" title="Từ trái nghĩa" className="vocabulary-detail-antonyms">
            <p className="vocabulary-detail-empty-copy">Chưa có dữ liệu từ trái nghĩa.</p>
          </DetailCard>

          <DetailCard icon="topic" title="Chủ đề liên quan" className="vocabulary-detail-topics">
            {topic ? <span className="vocabulary-detail-topic-chip">{topic}</span> : <p className="vocabulary-detail-empty-copy">Từ này chưa được gắn chủ đề.</p>}
          </DetailCard>
        </div>
      </div>

      <aside className="vocabulary-detail-aside" aria-label="Thông tin học tập liên quan">
        <section className="vocabulary-detail-card vocabulary-detail-progress" aria-labelledby="vocabulary-detail-progress-title">
          <h2 id="vocabulary-detail-progress-title"><DetailIcon name="progress" />Tiến trình học từ này</h2>
          <div className="vocabulary-detail-progress-item">
            <DetailIcon name="study" />
            <div><span>Trạng thái</span><strong>{statusLabel(vocabulary.status)}</strong></div>
          </div>
          <div className="vocabulary-detail-progress-item">
            <DetailIcon name="calendar" />
            <div><span>Ôn tập tiếp theo</span><strong>{formatReviewDate(vocabulary.nextReviewDate)}</strong></div>
          </div>
          <div className="vocabulary-detail-progress-note">
            <DetailIcon name="target" />
            <p>Số lượt học và độ thành thạo riêng của từ này chưa có trong dữ liệu hiện tại.</p>
          </div>
        </section>

        <section className="vocabulary-detail-card vocabulary-detail-related-card" aria-labelledby="vocabulary-detail-related-title">
          <h2 id="vocabulary-detail-related-title"><DetailIcon name="link" />Từ liên quan</h2>
          {relatedWords.length > 0 ? (
            <ul className="vocabulary-detail-related-list">
              {relatedWords.map((item) => (
                <li key={item.id}>
                  <Link className="vocabulary-detail-related-item" to={`/vocabulary/${item.id}`}>
                    <RelatedWordImage key={item.imageUrl ?? "no-image"} imageUrl={item.imageUrl} word={item.word} />
                    <span className="vocabulary-detail-related-copy">
                      <strong>{item.word}</strong>
                      {item.ipa ? <small>{item.ipa}</small> : null}
                      {levelLabel(item.level) ? <small>{levelLabel(item.level)}</small> : null}
                    </span>
                    <DetailIcon name="chevron" className="vocabulary-detail-chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vocabulary-detail-empty-copy">Chưa có từ liên quan trong cùng chủ đề.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

function RelatedWordImage({ imageUrl, word }: { imageUrl: string | null; word: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="vocabulary-detail-related-image">
      {imageUrl && !failed
        ? <img src={imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
        : <DetailIcon name="image" />}
      <span className="sr-only">{imageUrl && !failed ? `Hình minh họa cho ${word}` : `Chưa có hình minh họa cho ${word}`}</span>
    </span>
  );
}

function DetailCard({ icon, title, className, children }: { icon: DetailIconName; title: string; className: string; children: React.ReactNode }) {
  return (
    <section className={`vocabulary-detail-card ${className}`}>
      <h2><DetailIcon name={icon} />{title}</h2>
      {children}
    </section>
  );
}
