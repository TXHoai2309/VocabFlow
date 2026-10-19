import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { PublicLearningIndex, LearnerVocabularyBrowseResponse } from "@vocabflow/contracts";
import { CollectionDetailView, type CollectionKind } from "../learners/collection-detail-view";
import { ErrorState, LoadingState } from "../../components/async-states";
import { publicCardVocabulary, requestPublicBrowse, requestPublicLearningIndex } from "./public-learning-client";
import { readGuestState, type GuestState } from "./guest-store";

export function GuestCollectionPage({ kind, id }: { kind: CollectionKind; id: number }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [state, setState] = useState<GuestState | null>(null);
  const [index, setIndex] = useState<PublicLearningIndex | null>(null);
  const [result, setResult] = useState<LearnerVocabularyBrowseResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBusy(true); setError(false);
      void Promise.all([
        requestPublicLearningIndex(),
        requestPublicBrowse(new URLSearchParams({ page: String(page), pageSize: "30", ...(query ? { q: query } : {}), [kind === "topic" ? "topicId" : "learningSetId"]: String(id) }), controller.signal)
      ]).then(([nextIndex, nextPage]) => {
        if (controller.signal.aborted) return;
        setState(readGuestState()); setIndex(nextIndex); setResult(nextPage); setBusy(false);
        if (page > nextPage.totalPages) setParams((current) => { current.set("page", String(nextPage.totalPages)); return current; }, { replace: true });
      }).catch(() => { if (!controller.signal.aborted) { setError(true); setBusy(false); } });
    }, query ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [id, kind, page, query, retry, setParams]);
  if (error) return <main className="collection-detail-page"><ErrorState title="Không thể tải nội dung này" description="Vui lòng thử lại." onRetry={() => setRetry((value) => value + 1)} /></main>;
  if (!index || !result || !state) return <main className="collection-detail-page"><LoadingState label="Đang tải nội dung…" pattern="cards" /></main>;
  const collection = (kind === "topic" ? index.topics : index.learningSets).find((item) => item.id === id);
  if (!collection) return <main className="collection-detail-page"><p role="status">Nội dung này hiện không khả dụng.</p><Link to={kind === "topic" ? "/topics" : "/learning-sets"}>Quay lại danh sách</Link></main>;
  const items = result.vocabulary.map((word) => ({ ...publicCardVocabulary(word), status: state.progress[word.id]?.status ?? "NEW" as const }));
  const learnedCount = collection.vocabularyIds.filter((wordId) => state.progress[wordId]).length;
  const masteredCount = collection.vocabularyIds.filter((wordId) => state.progress[wordId]?.status === "MASTERED").length;
  return <CollectionDetailView kind={kind} title={collection.name} description={collection.description}
    level={kind === "learning-set" ? index.learningSets.find((set) => set.id === id)?.grade ?? null : null} items={items} progressTotal={collection.vocabularyIds.length}
    learnedCount={learnedCount} masteredCount={masteredCount} directStudyScope studyReady
    studyHref={`/study/setup?${kind === "topic" ? "topicId" : "learningSetId"}=${id}`}
    paging={{ page, totalPages: result.totalPages, totalCount: result.total, query, busy,
      onQueryChange: (value) => setParams((current) => { if (value) current.set("q", value); else current.delete("q"); current.delete("page"); return current; }, { replace: true }),
      onPageChange: (value) => setParams((current) => { current.set("page", String(value)); return current; }) }} />;
}
