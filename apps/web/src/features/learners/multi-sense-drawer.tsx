import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { LearnerVocabularyBrowseItem } from "@vocabflow/contracts";
import type { GroupedVocabularyItem } from "./grouped-vocabulary";
import { usePronunciationAudio } from "../study/pronunciation-audio";
import { formatPartOfSpeech, getVietnameseMeaningPresentation } from "../vocabulary/vocabulary-presentation";

type MultiSenseDrawerProps = {
  group: GroupedVocabularyItem | null;
  onClose: () => void;
  savedIds: Set<number>;
  savingIds: Set<number>;
  bookmarkDisabled: boolean;
  onToggleSaved?: (item: LearnerVocabularyBrowseItem) => void;
};

export function MultiSenseDrawer({
  group,
  onClose,
  savedIds,
  savingIds,
  bookmarkDisabled,
  onToggleSaved
}: MultiSenseDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Audio for the primary pronunciation
  const audio = usePronunciationAudio(
    group?.primaryItem.audioUrl ?? null,
    group?.headword ?? "",
    group?.primaryItem.id ?? 0
  );

  // Close on Escape key
  useEffect(() => {
    if (!group) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [group, onClose]);

  // Focus trap / initial focus on close button when opened
  useEffect(() => {
    if (group) {
      closeButtonRef.current?.focus();
    }
  }, [group]);

  if (!group) return null;

  // Group senses by part of speech
  const sensesByPos = new Map<string, LearnerVocabularyBrowseItem[]>();
  for (const sense of group.senses) {
    const pos = formatPartOfSpeech(sense.partOfSpeech) ?? "Từ loại khác";
    if (!sensesByPos.has(pos)) {
      sensesByPos.set(pos, []);
    }
    sensesByPos.get(pos)!.push(sense);
  }

  const imageUrl = group.primaryItem.imageUrl;

  return (
    <div
      className="multi-sense-drawer-overlay"
      data-testid="multi-sense-drawer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        className="multi-sense-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="multi-sense-drawer-title"
        data-testid="multi-sense-drawer"
      >
        <header className="multi-sense-drawer-header">
          <div className="multi-sense-drawer-title-row">
            <div className="multi-sense-drawer-heading">
              <h2 id="multi-sense-drawer-title">{group.headword}</h2>
              {group.primaryItem.ipa ? (
                <span className="multi-sense-drawer-ipa">{group.primaryItem.ipa}</span>
              ) : null}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              className="multi-sense-drawer-close"
              aria-label="Đóng bảng chi tiết nghĩa"
              data-testid="multi-sense-drawer-close"
              onClick={onClose}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="multi-sense-drawer-meta-row">
            <span className="multi-sense-drawer-badge" data-testid="multi-sense-drawer-count">
              {group.senseCount} nét nghĩa
            </span>
            {group.partOfSpeechLabels.length > 0 ? (
              <span className="multi-sense-drawer-pos-summary">
                {group.partOfSpeechLabels.join(" · ")}
              </span>
            ) : null}

            {audio.hasAudio && audio.state !== "error" ? (
              <button
                type="button"
                className="multi-sense-drawer-audio"
                aria-label={audio.state === "playing" ? `Tạm dừng phát âm ${group.headword}` : `Nghe phát âm ${group.headword}`}
                onClick={() => (audio.state === "playing" ? audio.pause() : audio.play())}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" />
                </svg>
                <span>{audio.state === "playing" ? "Đang phát…" : "Phát âm"}</span>
              </button>
            ) : null}
          </div>
        </header>

        <div className="multi-sense-drawer-body">
          {imageUrl ? (
            <div className="multi-sense-drawer-media">
              <img src={imageUrl} alt={`Minh họa cho từ ${group.headword}`} loading="lazy" />
            </div>
          ) : null}

          <div className="multi-sense-drawer-senses-list">
            {Array.from(sensesByPos.entries()).map(([posLabel, senses]) => (
              <section key={posLabel} className="multi-sense-pos-group">
                <h3 className="multi-sense-pos-heading">
                  <span className="multi-sense-pos-pill">{posLabel}</span>
                  <span className="multi-sense-pos-count">{senses.length} nghĩa</span>
                </h3>

                <ul className="multi-sense-cards-list">
                  {senses.map((sense, index) => {
                    const meaning = getVietnameseMeaningPresentation(sense);
                    const isSaved = savedIds.has(sense.id);
                    const isSaving = savingIds.has(sense.id);

                    return (
                      <li key={sense.id} className="multi-sense-card-item" data-testid={`drawer-sense-${sense.id}`}>
                        <div className="multi-sense-card-header">
                          <span className="multi-sense-index">#{index + 1}</span>
                          {sense.cefr ? (
                            <span className="multi-sense-cefr">CEFR {sense.cefr}</span>
                          ) : null}
                          {onToggleSaved ? (
                            <button
                              type="button"
                              className={`multi-sense-bookmark-button${isSaved ? " is-saved" : ""}`}
                              disabled={bookmarkDisabled || isSaving}
                              aria-label={`${isSaved ? "Bỏ lưu" : "Lưu"} nghĩa này`}
                              title={isSaved ? "Bỏ lưu nghĩa này" : "Lưu nghĩa này"}
                              onClick={() => onToggleSaved(sense)}
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 4h12v17l-6-4-6 4z" />
                              </svg>
                            </button>
                          ) : null}
                        </div>

                        <div className="multi-sense-meaning-block">
                          <span className="multi-sense-meaning-label">{meaning.primaryLabel}</span>
                          <p className="multi-sense-meaning-primary">{meaning.primary}</p>
                          {meaning.explanation ? (
                            <p className="multi-sense-meaning-explanation">
                              <em>Giải thích:</em> {meaning.explanation}
                            </p>
                          ) : null}
                        </div>

                        <div className="multi-sense-card-footer">
                          <Link
                            to={`/vocabulary/${sense.id}`}
                            className="multi-sense-detail-link"
                            onClick={onClose}
                          >
                            <span>Xem chi tiết & câu ví dụ</span>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <footer className="multi-sense-drawer-footer">
          <Link to="/study/setup" className="multi-sense-drawer-study-action" onClick={onClose}>
            Bắt đầu học từ này
          </Link>
          <button type="button" className="multi-sense-drawer-close-action" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}
