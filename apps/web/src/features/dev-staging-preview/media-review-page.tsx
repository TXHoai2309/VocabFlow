import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

type MediaKind = "ILLUSTRATION_IMAGE" | "WORD_PRONUNCIATION_AUDIO" | "EXAMPLE_SENTENCE_AUDIO";
type Tab = "images" | "word-audio" | "example-audio" | "rights";
type TargetExample = {
  proposalKey: string;
  headword: string;
  partOfSpeech: string;
  meaningVi: string;
  definitionEn: string;
  contentFingerprint: string;
  exampleKey: string;
  index: number;
  en: string;
  vi: string;
  textClassification: "EXACT_TEXT_MATCH" | "SAFE_NORMALIZED_MATCH" | "DIFFERENT_SENTENCE" | "UNRESOLVED";
};
type TargetSense = {
  proposalKey: string;
  headword: string;
  partOfSpeech: string;
  meaningVi: string;
  definitionEn: string;
  contentFingerprint: string;
  editorialStatus: string;
  examples: Array<{ exampleKey: string; index: number; en: string; vi: string }>;
};
type ReviewItem = {
  mappingKey: string;
  mediaSha256: string;
  mediaKind: MediaKind;
  sourceFilename: string;
  sourceArchiveEntry: string | null;
  sourceNoteIdentity: { sourceRecordId: string; sourceNoteGuid: string; recordEvidenceSha256: string };
  source: { word: string; ipa: string; pos: string; meaning: string; example: string };
  targetLexemeIdentity: string | null;
  lexemePronunciationProfile: null | {
    lexemeIdentity: string;
    referenceCount: number;
    sourceNoteCount: number;
    posClasses: string[];
    pronunciationForms: Array<{ ipa: string; sourceIpaSha256: string | null; sourceNotes: Array<{ sourceRecordId: string | null; sourceNoteGuid: string | null; recordEvidenceSha256: string | null }> }>;
    reviewSignal: string;
  };
  proposedSense: TargetSense | null;
  targetCandidates: TargetSense[];
  targetExampleCandidates: TargetExample[];
  exampleTextComparison: null | { classification: TargetExample["textClassification"]; target: TargetExample | null };
  mappingStatus: string;
  mappingConfidence: number;
  mappingEvidence: Record<string, unknown>;
  review: null | { outcome: string; reviewer_identity: string; reviewed_at: string; evidence: Record<string, unknown> };
  rightsStatus: string;
  rightsEvidence: Array<{ evidenceId: string; finding: string; scope: string; url: string }>;
  evidenceGroupId: string | null;
  providerNeutralStorageKey: string;
};
type ReviewList = {
  page: number;
  pageSize: number;
  total: number;
  reviewerIdentity: string;
  items: ReviewItem[];
  normalization: { version: string; steps: string[] };
};
type RightsAsset = {
  mediaSha256: string;
  mediaKind: string;
  mediaRoles: string[];
  byteLength: number;
  mimeType: string;
  fileIdentities: Array<{ archiveEntry: string; sourceFilename: string; sourceMediaIndex: string }>;
  noteIdentities: Array<{ sourceRecordId: string; sourceNoteGuid: string; recordEvidenceSha256: string }>;
  providerNeutralStorageKey: string;
  evidenceGroupId: string;
  evidenceGroupAssetCount: number;
  groupAssetsFingerprint: string;
  rightsStatus: string;
  rightsDecision: null | { scope: string; rightsStatus: string; evidenceType: string; evidenceUrl: string | null; rightsHolder: string | null; intendedUse: string | null; reviewerNote: string; reviewerIdentity: string; reviewedAt: string };
  rightsEvidence: Array<{ evidenceId: string; finding: string; scope: string; url: string }>;
  mappingReferenceCount: number;
  acceptedMappingCount: number;
  reviewedMappingCount: number;
};
type RightsList = { page: number; pageSize: number; total: number; counts: Record<string, number>; reviewerIdentity: string; items: RightsAsset[] };
type Readiness = {
  imageReviews: { imageReviewRows: number; proposedImageSenseIdentities: number; imageAccepted: number; imageRejected: number; imageAmbiguous: number; imageNeedsReview: number };
  wordAudio: { proposedReferences: number; accepted: number; homographDifferentPronunciation: number; unresolved: number };
  exampleAudio: { EXACT_TEXT_MATCH: number; SAFE_NORMALIZED_MATCH: number; DIFFERENT_SENTENCE: number; UNRESOLVED: number; mismatchRows: number; priorUnresolvedRows: number; normalizationContract: string };
  rights: Record<string, number>;
  cloudinary: { mode: string; eligibleAssets: number; blockedAssetCount: number; eligibleSetPath: string; blockedSetPath: string };
  neon: { mappingReviewEvents: number; rightsReviewEvents: number; reviewerIdentity: string; runtimeStagingUsage: boolean; runtimeVocabularyWrite: boolean; learnerHistoryWrite: boolean };
  sourceManifestSha256: string;
  snapshotSha256: string;
};

const api = "/api/dev/media-review";
const tabs: Array<{ id: Tab; label: string; kind?: MediaKind }> = [
  { id: "images", label: "Illustration images", kind: "ILLUSTRATION_IMAGE" },
  { id: "word-audio", label: "Word pronunciation", kind: "WORD_PRONUNCIATION_AUDIO" },
  { id: "example-audio", label: "Example audio", kind: "EXAMPLE_SENTENCE_AUDIO" },
  { id: "rights", label: "Rights & upload" },
];
const mappingStatusLabels: Record<string, string> = {
  UNREVIEWED: "Chưa review",
  REVIEWED: "Đã review",
  ALL: "Tất cả mapping",
  PROPOSED: "Mapping proposals",
  MISMATCH: "Khác câu",
  UNRESOLVED: "Chưa có target hiệu lực",
  AMBIGUOUS: "Ứng viên ambiguous",
};
const decisionLabels: Record<string, string> = {
  ACCEPT_MAPPING: "Accept mapping",
  REJECT_MAPPING: "Reject mapping",
  AMBIGUOUS: "Ambiguous",
  NEEDS_REVIEW: "Needs review",
  EXACT_SUPPORTED_LEXEME_MATCH: "Exact Lexeme match",
  PRONUNCIATION_VARIANT: "Pronunciation variant",
  HOMOGRAPH_DIFFERENT_PRONUNCIATION: "Homograph · pronunciation differs",
  INVALID_ASSOCIATION: "Invalid association",
  EXACT_TEXT_MATCH: "Exact text match",
  SAFE_NORMALIZED_MATCH: "Safe normalized match",
  DIFFERENT_SENTENCE: "Different sentence",
  UNRESOLVED: "Unresolved",
};

function formatCount(value: number | undefined) {
  return new Intl.NumberFormat("vi-VN").format(value ?? 0);
}

function useDevRequest<T>(url: string, retry: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 409 ? "Snapshot Development đã đổi; cần tạo snapshot mới trước khi tiếp tục." : "Không tải được dữ liệu media review.");
        return response.json() as Promise<T>;
      })
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu media review.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, retry]);
  return { data, loading, error };
}

function setParams(setSearchParams: (next: URLSearchParams, options?: { replace?: boolean }) => void, searchParams: URLSearchParams, values: Record<string, string | null>) {
  const next = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
  setSearchParams(next);
}

function sourceLabel(item: ReviewItem) {
  return `${item.source.word || "No source word"} · ${item.source.pos || "POS unavailable"}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(data.message ?? "Không lưu được quyết định vào staging Development.");
  return data;
}

export function MediaReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (tabs.some((item) => item.id === searchParams.get("tab")) ? searchParams.get("tab") : "images") as Tab;
  const activeTab = tabs.find((item) => item.id === tab)!;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const defaultStatus = tab === "rights" ? "ALL" : tab === "example-audio" ? "MISMATCH" : "PROPOSED";
  const status = searchParams.get("status") ?? defaultStatus;
  const search = searchParams.get("search") ?? "";
  const selected = searchParams.get("selected") ?? "";
  const [searchDraft, setSearchDraft] = useState(search);
  const [retry, setRetry] = useState(0);
  const [actionError, setActionError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [selectedPageMappings, setSelectedPageMappings] = useState<Set<string>>(new Set());
  const [targetSenseKey, setTargetSenseKey] = useState("");
  const [targetExampleKey, setTargetExampleKey] = useState("");
  const [rightsScope, setRightsScope] = useState<"ASSET" | "GROUP">("ASSET");
  const [rightsStatus, setRightsStatus] = useState("UNKNOWN_REVIEW_REQUIRED");
  const [evidenceType, setEvidenceType] = useState("ASSET_SPECIFIC_LICENSE");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [rightsHolder, setRightsHolder] = useState("");
  const [intendedUse, setIntendedUse] = useState("CLOUDINARY_PUBLIC_NONCOMMERCIAL");
  const [reviewerNote, setReviewerNote] = useState("");
  const pendingKeys = useRef(new Map<string, string>());

  useEffect(() => setSearchDraft(search), [search]);
  useEffect(() => { setSelectedPageMappings(new Set()); setActionError(""); }, [tab, search, status, page]);
  const mappingUrl = useMemo(() => {
    if (!activeTab.kind) return "";
    const params = new URLSearchParams({ kind: activeTab.kind, status, page: String(page) });
    if (search) params.set("search", search);
    return `${api}?${params}`;
  }, [activeTab.kind, page, search, status]);
  const rightsUrl = useMemo(() => {
    const params = new URLSearchParams({ status, page: String(page) });
    if (search) params.set("search", search);
    return `${api}/rights-assets?${params}`;
  }, [page, search, status]);
  const reviewRequest = useDevRequest<ReviewList>(activeTab.kind ? mappingUrl : `${api}/health`, retry);
  const rightsRequest = useDevRequest<RightsList>(tab === "rights" ? rightsUrl : `${api}/rights-assets?status=ALL&page=1`, retry);
  const readinessRequest = useDevRequest<Readiness>(`${api}/readiness`, retry);
  const mappingData = activeTab.kind ? reviewRequest.data : null;
  const rightsData = tab === "rights" ? rightsRequest.data : null;
  const selectedItem = useMemo(() => mappingData?.items.find((item) => item.mappingKey === selected) ?? mappingData?.items[0] ?? null, [mappingData, selected]);
  const selectedAsset = useMemo(() => rightsData?.items.find((item) => item.mediaSha256 === selected) ?? rightsData?.items[0] ?? null, [rightsData, selected]);
  const total = tab === "rights" ? rightsData?.total ?? 0 : mappingData?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (tab === "rights" ? rightsData?.pageSize ?? 20 : mappingData?.pageSize ?? 20)));
  const statusOptions = tab === "images" ? ["PROPOSED", "UNREVIEWED", "REVIEWED", "AMBIGUOUS", "ALL"]
    : tab === "word-audio" ? ["PROPOSED", "UNREVIEWED", "REVIEWED", "ALL"]
    : tab === "example-audio" ? ["MISMATCH", "UNRESOLVED", "UNREVIEWED", "REVIEWED", "ALL"]
        : ["ALL", "UNKNOWN_REVIEW_REQUIRED", "CLEARED_FOR_INTENDED_USE", "INTERNAL_REFERENCE_ONLY", "RESTRICTED"];
  const loading = tab === "rights" ? rightsRequest.loading : reviewRequest.loading;
  const error = tab === "rights" ? rightsRequest.error : reviewRequest.error;
  const reviewer = tab === "rights" ? rightsData?.reviewerIdentity : mappingData?.reviewerIdentity;

  useEffect(() => {
    if (selectedItem) {
      setTargetSenseKey((current) => current || selectedItem.proposedSense?.proposalKey || selectedItem.targetCandidates[0]?.proposalKey || "");
      setTargetExampleKey((current) => current || selectedItem.exampleTextComparison?.target?.exampleKey || "");
    }
  }, [selectedItem]);

  function changeTab(nextTab: Tab) {
    const nextStatus = nextTab === "rights" ? "ALL" : nextTab === "example-audio" ? "MISMATCH" : "PROPOSED";
    setParams(setSearchParams, searchParams, { tab: nextTab, status: nextStatus, page: "1", selected: null, search: null });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams(setSearchParams, searchParams, { search: searchDraft.trim() || null, page: "1", selected: null });
  }
  function chooseStatus(nextStatus: string) {
    setParams(setSearchParams, searchParams, { status: nextStatus, page: "1", selected: null });
  }
  function choosePage(nextPage: number) {
    setParams(setSearchParams, searchParams, { page: String(nextPage), selected: null });
  }
  function selectMapping(item: ReviewItem) {
    setParams(setSearchParams, searchParams, { selected: item.mappingKey });
    setTargetSenseKey(item.proposedSense?.proposalKey ?? item.targetCandidates[0]?.proposalKey ?? "");
    setTargetExampleKey(item.exampleTextComparison?.target?.exampleKey ?? "");
  }
  function selectRightAsset(item: RightsAsset) {
    setParams(setSearchParams, searchParams, { selected: item.mediaSha256 });
    setRightsStatus(item.rightsStatus);
    setRightsScope("ASSET");
    setEvidenceType("ASSET_SPECIFIC_LICENSE");
    setEvidenceUrl("");
    setRightsHolder("");
    setReviewerNote("");
  }

  const submitMappingDecision = useCallback(async (item: ReviewItem, outcome: string, selectedSenseKey?: string, selectedExample?: TargetExample) => {
    const idKey = `${item.mappingKey}:${outcome}`;
    const idempotencyKey = pendingKeys.current.get(idKey) ?? crypto.randomUUID();
    pendingKeys.current.set(idKey, idempotencyKey);
    const selectedSense = item.targetCandidates.find((sense) => sense.proposalKey === selectedSenseKey) ?? null;
    const payload = {
      idempotencyKey, mappingKey: item.mappingKey, mediaSha256: item.mediaSha256, mediaKind: item.mediaKind, outcome,
      targetSenseProposalKey: selectedSense?.proposalKey ?? null,
      targetContentFingerprint: selectedSense?.contentFingerprint ?? null,
      targetLexemeIdentity: item.targetLexemeIdentity,
      targetExampleKey: selectedExample?.exampleKey ?? null,
      reviewerNote: reviewerNote.trim(),
    };
    setPending(true); setActionError(""); setSavedMessage("");
    try {
      await postJson(`${api}/decisions/batch`, { items: [payload] });
      pendingKeys.current.delete(idKey);
      setSavedMessage(`${decisionLabels[outcome] ?? outcome} · ${sourceLabel(item)} đã ghi vào Development staging.`);
      setRetry((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không lưu được quyết định.");
    } finally { setPending(false); }
  }, [reviewerNote]);

  async function bulkReviewImages(outcome: "ACCEPT_MAPPING" | "REJECT_MAPPING") {
    const selectedRows = mappingData?.items.filter((item) => selectedPageMappings.has(item.mappingKey)) ?? [];
    if (!selectedRows.length) return;
    const items = selectedRows.map((item) => {
      const target = item.proposedSense;
      const idKey = `${item.mappingKey}:${outcome}`;
      const idempotencyKey = pendingKeys.current.get(idKey) ?? crypto.randomUUID();
      pendingKeys.current.set(idKey, idempotencyKey);
      return { idempotencyKey, mappingKey: item.mappingKey, mediaSha256: item.mediaSha256, mediaKind: item.mediaKind, outcome,
        targetSenseProposalKey: outcome === "ACCEPT_MAPPING" ? target?.proposalKey : null,
        targetContentFingerprint: outcome === "ACCEPT_MAPPING" ? target?.contentFingerprint : null,
        targetLexemeIdentity: null, targetExampleKey: null, reviewerNote: reviewerNote.trim() };
    });
    setPending(true); setActionError(""); setSavedMessage("");
    try {
      await postJson(`${api}/decisions/batch`, { items });
      items.forEach((item) => pendingKeys.current.delete(`${item.mappingKey}:${outcome}`));
      setSelectedPageMappings(new Set());
      setSavedMessage(`${formatCount(items.length)} ảnh được ${outcome === "ACCEPT_MAPPING" ? "chấp nhận" : "từ chối"} theo các lựa chọn reviewer trên trang này.`);
      setRetry((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không lưu được lô review.");
    } finally { setPending(false); }
  }

  async function saveRightsDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAsset) return;
    const idKey = `rights:${selectedAsset.mediaSha256}:${rightsScope}:${rightsStatus}:${evidenceUrl}:${intendedUse}`;
    const idempotencyKey = pendingKeys.current.get(idKey) ?? crypto.randomUUID();
    pendingKeys.current.set(idKey, idempotencyKey);
    setPending(true); setActionError(""); setSavedMessage("");
    try {
      await postJson(`${api}/rights`, { idempotencyKey, scope: rightsScope, mediaSha256: rightsScope === "ASSET" ? selectedAsset.mediaSha256 : null,
        evidenceGroupId: rightsScope === "GROUP" ? selectedAsset.evidenceGroupId : null,
        groupAssetsFingerprint: rightsScope === "GROUP" ? selectedAsset.groupAssetsFingerprint : null,
        rightsStatus, evidenceType, evidenceUrl: evidenceUrl.trim(), rightsHolder: rightsHolder.trim(), intendedUse,
        reviewerNote: reviewerNote.trim() });
      pendingKeys.current.delete(idKey);
      setSavedMessage(`Quyền ${rightsStatus} đã được ghi vào Development staging.`);
      setRetry((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không lưu được quyền.");
    } finally { setPending(false); }
  }

  async function downloadReadinessSet(kind: "eligible" | "blocked") {
    setActionError("");
    try {
      const response = await fetch(`${api}/readiness?download=${kind}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Không tải được bộ media readiness.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = kind === "eligible" ? "cloudinary-eligible-media-review-v1.json" : "cloudinary-blocked-media-review-v1.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Không tải được bộ media."); }
  }

  function toggleMapping(id: string) {
    setSelectedPageMappings((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const bulkAcceptEnabled = selectedPageMappings.size > 0
    && mappingData?.items.filter((item) => selectedPageMappings.has(item.mappingKey)).every((item) => item.proposedSense && item.mappingStatus === "PROPOSED_SENSE_SOURCE_MEANING_MATCH_REQUIRES_VISUAL_REVIEW");

  return (
    <main className="media-review" aria-labelledby="media-review-title">
      <header className="media-review__header">
        <div>
          <p className="eyebrow">Development · English Vocabulary 4600 · Review desk</p>
          <h1 id="media-review-title">Media review</h1>
          <p>Đối chiếu từng file với note nguồn và Sense hiệu lực. Quyết định lưu thành audit event; nội dung từ vựng không bị sửa.</p>
        </div>
        <div className="media-review__scope"><strong>5.616</strong><span>effective DRAFT Senses</span><span>Snapshot-pinned · uploads off</span></div>
      </header>

      {readinessRequest.data && <section className="media-review__metrics" aria-label="Media inventory">
        <article><span>Source images</span><strong>{formatCount(4669)}</strong></article>
        <article><span>Word audio files</span><strong>{formatCount(4649)}</strong></article>
        <article><span>Example audio files</span><strong>{formatCount(4669)}</strong></article>
        <article><span>Unique SHA256 assets</span><strong>{formatCount(13977)}</strong></article>
      </section>}

      <section className="media-review__target" aria-label="Development target">
        <div><span>Project</span><strong>shy-hill-72364426</strong></div>
        <div><span>Branch</span><strong>br-square-grass-b3af0nte</strong></div>
        <div><span>Database / schema</span><strong>neondb · vocabflow_editorial_staging</strong></div>
        <div><span>Reviewer session</span><strong>{reviewer ?? readinessRequest.data?.neon.reviewerIdentity ?? "Local OS reviewer"}</strong></div>
      </section>

      <nav className="media-review__tabs" aria-label="Media review type">
        {tabs.map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined}
          className={tab === item.id ? "is-active" : undefined} onClick={() => changeTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab === "rights" ? <section className="media-review__readiness" aria-label="Cloudinary readiness">
        <div>
          <p className="eyebrow">Offline upload readiness</p>
          <h2>Cloudinary is offline</h2>
          <p>CC BY-NC is a deck-page notice. It is stored as evidence only and cannot clear these individual image/audio assets.</p>
        </div>
        <div className="media-review__readiness-counts">
          <article><span>Eligible after mapping + rights review</span><strong>{formatCount(readinessRequest.data?.cloudinary.eligibleAssets)}</strong></article>
          <article><span>Blocked by mapping or rights</span><strong>{formatCount(readinessRequest.data?.cloudinary.blockedAssetCount)}</strong></article>
          <article><span>Rights unknown</span><strong>{formatCount(readinessRequest.data?.rights.UNKNOWN_REVIEW_REQUIRED)}</strong></article>
        </div>
        <div className="media-review__download-actions">
          <button className="button primary" type="button" onClick={() => void downloadReadinessSet("eligible")}>Download eligible set</button>
          <button className="button secondary" type="button" onClick={() => void downloadReadinessSet("blocked")}>Download blocked set</button>
          <span>Current policy requires accepted, fully reviewed links and a rights decision for the intended Cloudinary use.</span>
        </div>
      </section> : null}

      <form className="media-review__filters" role="search" noValidate onSubmit={submitSearch}>
        <label><span>Search by word, source note, Sense, hash or Lexeme</span>
          <input type="search" value={searchDraft} maxLength={100} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Enter a word or source note ID" /></label>
        <label><span>Review status</span><select value={status} onChange={(event) => chooseStatus(event.target.value)}>
          {statusOptions.map((value) => <option key={value} value={value}>{mappingStatusLabels[value] ?? value}</option>)}
        </select></label>
        <button className="button primary" type="submit">Search</button>
      </form>

      {(error || readinessRequest.error) && <section className="media-review__state" role="alert">
        <h2>Media review API unavailable</h2><p>{error || readinessRequest.error}. Start the loopback Development API with <code>pnpm dev:media-review</code>, then retry.</p>
        <button className="button secondary" type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>
      </section>}
      {actionError && <p className="media-review__feedback media-review__feedback--error" role="alert">{actionError}</p>}
      {savedMessage && <p className="media-review__feedback media-review__feedback--success" role="status">{savedMessage}</p>}

      {tab === "images" && mappingData && <section className="media-review__batch" aria-label="Batch review">
        <label><input type="checkbox" checked={mappingData.items.length > 0 && selectedPageMappings.size === mappingData.items.length}
          onChange={(event) => setSelectedPageMappings(event.target.checked ? new Set(mappingData.items.map((item) => item.mappingKey)) : new Set())} />
          Select this page ({formatCount(selectedPageMappings.size)} selected)</label>
        <button className="button primary" disabled={!bulkAcceptEnabled || pending} aria-disabled={!bulkAcceptEnabled || pending}
          onClick={() => void bulkReviewImages("ACCEPT_MAPPING")} type="button">Accept selected proposed mappings</button>
        <button className="button secondary" disabled={selectedPageMappings.size === 0 || pending}
          onClick={() => void bulkReviewImages("REJECT_MAPPING")} type="button">Reject selected</button>
        <span>Only the selected rows on this page are included. Ambiguous rows cannot be accepted in bulk.</span>
      </section>}

      {loading ? <section className="media-review__state" role="status" aria-busy="true">Loading pinned Development data…</section>
        : total === 0 && !error ? <section className="media-review__state"><h2>No records for this filter</h2><p>Change the search or review status to continue.</p></section>
          : <section className="media-review__workspace" aria-label="Media records and evidence">
            <div className="media-review__list-panel">
              <p className="media-review__range" role="status">Showing {formatCount((page - 1) * 20 + 1)}–{formatCount(Math.min(page * 20, total))} of {formatCount(total)} {tab === "rights" ? "unique assets" : "mapping rows"}</p>
              {tab === "rights" ? <div className="media-review__record-list">
                {rightsData?.items.map((item) => <button type="button" key={item.mediaSha256} aria-pressed={selectedAsset?.mediaSha256 === item.mediaSha256}
                  className={`media-review__record ${selectedAsset?.mediaSha256 === item.mediaSha256 ? "is-selected" : ""}`} onClick={() => selectRightAsset(item)}>
                  <span className="media-review__record-type">{item.mediaRoles.join(" · ")}</span>
                  <strong>{item.noteIdentities[0]?.sourceRecordId ?? "No note identity"}</strong>
                  <span className="media-review__hash">{item.mediaSha256}</span>
                  <span className={`media-review__status media-review__status--${item.rightsStatus.toLowerCase()}`}>{item.rightsStatus}</span>
                </button>)}
              </div> : <div className="media-review__record-list">
                {mappingData?.items.map((item) => <div key={item.mappingKey} className={`media-review__record ${selectedItem?.mappingKey === item.mappingKey ? "is-selected" : ""}`}>
                  {tab === "images" && <label className="media-review__row-check" aria-label={`Select ${sourceLabel(item)}`}><input type="checkbox" checked={selectedPageMappings.has(item.mappingKey)} onChange={() => toggleMapping(item.mappingKey)} /></label>}
                  <button type="button" aria-pressed={selectedItem?.mappingKey === item.mappingKey} className="media-review__record-select" onClick={() => selectMapping(item)}>
                    <span className="media-review__record-type">{item.mediaKind.replaceAll("_", " ")}</span>
                    <strong>{sourceLabel(item)}</strong>
                    <span>{item.proposedSense ? `${item.proposedSense.headword} · ${item.proposedSense.partOfSpeech}` : item.targetLexemeIdentity ?? item.mappingStatus}</span>
                    <span className="media-review__hash">{item.mediaSha256}</span>
                    <span className={`media-review__status media-review__status--${(item.review?.outcome ?? "UNREVIEWED").toLowerCase()}`}>{item.review ? decisionLabels[item.review.outcome] ?? item.review.outcome : "Unreviewed"}</span>
                  </button>
                </div>)}
              </div>}
              <nav className="media-review__pagination" aria-label="Media review pages">
                <button className="button secondary" type="button" disabled={page <= 1} onClick={() => choosePage(page - 1)}>Previous</button>
                <span>Page {formatCount(page)} / {formatCount(pageCount)}</span>
                <button className="button secondary" type="button" disabled={page >= pageCount} onClick={() => choosePage(page + 1)}>Next</button>
              </nav>
            </div>

            {tab === "rights" && selectedAsset ? <RightsDetail asset={selectedAsset} scope={rightsScope} setScope={setRightsScope}
              rightsStatus={rightsStatus} setRightsStatus={setRightsStatus} evidenceType={evidenceType} setEvidenceType={setEvidenceType}
              evidenceUrl={evidenceUrl} setEvidenceUrl={setEvidenceUrl} rightsHolder={rightsHolder} setRightsHolder={setRightsHolder}
              intendedUse={intendedUse} setIntendedUse={setIntendedUse} reviewerNote={reviewerNote} setReviewerNote={setReviewerNote}
              pending={pending} onSubmit={saveRightsDecision} /> : selectedItem ? <MappingDetail item={selectedItem} tab={tab}
                targetSenseKey={targetSenseKey} setTargetSenseKey={setTargetSenseKey}
                targetExampleKey={targetExampleKey} setTargetExampleKey={setTargetExampleKey}
                reviewerNote={reviewerNote} setReviewerNote={setReviewerNote} pending={pending}
                onDecision={(outcome, candidate, example) => void submitMappingDecision(selectedItem, outcome, candidate, example)} /> : null}
          </section>}

      {readinessRequest.data && <p className="media-review__notice">Decision audit rows: {formatCount(readinessRequest.data.neon.mappingReviewEvents)} mapping · {formatCount(readinessRequest.data.neon.rightsReviewEvents)} rights. Source manifest SHA256 <code>{readinessRequest.data.sourceManifestSha256}</code> · target snapshot SHA256 <code>{readinessRequest.data.snapshotSha256}</code>. Runtime vocabulary, learner history and release status remain untouched.</p>}
    </main>
  );
}

function MappingDetail({ item, tab, targetSenseKey, setTargetSenseKey, targetExampleKey, setTargetExampleKey,
  reviewerNote, setReviewerNote, pending, onDecision }: {
  item: ReviewItem; tab: Tab; targetSenseKey: string; setTargetSenseKey: (value: string) => void;
  targetExampleKey: string; setTargetExampleKey: (value: string) => void; reviewerNote: string;
  setReviewerNote: (value: string) => void; pending: boolean;
  onDecision: (outcome: string, senseKey?: string, example?: TargetExample) => void;
}) {
  const image = item.mediaKind === "ILLUSTRATION_IMAGE";
  const example = item.mediaKind === "EXAMPLE_SENTENCE_AUDIO";
  const selectedTarget = item.targetCandidates.find((sense) => sense.proposalKey === targetSenseKey) ?? item.proposedSense;
  const selectedExample = item.targetExampleCandidates.find((candidate) => candidate.exampleKey === targetExampleKey) ?? null;
  const acceptOutcome = item.exampleTextComparison?.classification;
  const assetPreview = `${api}/assets/${item.mediaSha256}/preview`;
  const normalizationTarget = item.targetExampleCandidates.find((candidate) => candidate.exampleKey === item.exampleTextComparison?.target?.exampleKey);
  const textComparisonAvailable = Boolean(item.exampleTextComparison?.target);
  const senseCandidates = item.targetCandidates;
  const isAmbiguousImage = item.mappingStatus.includes("AMBIGUOUS") || senseCandidates.length > 1 || !item.proposedSense;
  return (
    <article className="media-review__detail" aria-labelledby="media-review-detail-title">
      <header className="media-review__detail-head">
        <div><p className="eyebrow">{tab === "images" ? "Image → Sense" : tab === "word-audio" ? "Audio → Lexeme" : "Audio → example"}</p>
          <h2 id="media-review-detail-title">{sourceLabel(item)}</h2><p>Source note {item.sourceNoteIdentity.sourceRecordId} · GUID {item.sourceNoteIdentity.sourceNoteGuid}</p></div>
        <span className="media-review__status media-review__status--unknown_review_required">{item.rightsStatus}</span>
      </header>
      <div className={`media-review__preview ${image ? "media-review__preview--image" : "media-review__preview--audio"}`}>
        {image ? <img src={assetPreview} alt={`English Vocabulary source illustration for ${item.source.word}`} />
          : <audio controls preload="metadata" src={assetPreview}>Your browser does not support audio playback.</audio>}
        <span>Original APKG bytes · SHA256 verified when previewed</span>
      </div>
      <section className="media-review__source-card"><h3>Source note</h3>
        <dl><div><dt>Word / POS / IPA</dt><dd>{item.source.word} · {item.source.pos} · {item.source.ipa || "IPA unavailable"}</dd></div>
          <div><dt>Meaning / definition</dt><dd>{item.source.meaning || "No source meaning"}</dd></div>
          <div><dt>Example sentence</dt><dd>{item.source.example || "No source example"}</dd></div>
          <div><dt>Source record evidence SHA256</dt><dd className="media-review__hash">{item.sourceNoteIdentity.recordEvidenceSha256}</dd></div></dl>
      </section>

      {image && <section className="media-review__target-card"><h3>Target Sense</h3>
        {senseCandidates.length > 1 && <label><span>Choose one current effective Sense candidate</span><select value={targetSenseKey} onChange={(event) => setTargetSenseKey(event.target.value)}>
          <option value="">Select a Sense candidate</option>{senseCandidates.map((sense) => <option key={sense.proposalKey} value={sense.proposalKey}>{sense.headword} · {sense.partOfSpeech} · {sense.meaningVi}</option>)}
        </select></label>}
        {selectedTarget ? <SenseCard sense={selectedTarget} /> : <p className="media-review__warning">No effective Sense candidate is pinned. Keep this mapping unresolved.</p>}
        <p className="media-review__evidence">Mapping proposal: {item.mappingStatus} · confidence {item.mappingConfidence}. No proposal is accepted automatically.</p>
      </section>}

      {item.mediaKind === "WORD_PRONUNCIATION_AUDIO" && <section className="media-review__target-card"><h3>Lexeme pronunciation evidence</h3>
        <dl><div><dt>Proposed Lexeme identity</dt><dd>{item.targetLexemeIdentity ?? "No verified Lexeme candidate"}</dd></div>
          <div><dt>Pronunciation evidence</dt><dd>{String(item.mappingEvidence.pronunciationEvidence ?? "Not present")}</dd></div>
          <div><dt>Source IPA hash</dt><dd className="media-review__hash">{String(item.mappingEvidence.sourceIpaSha256 ?? "Not present")}</dd></div>
          <div><dt>Source note identity</dt><dd>{String(item.mappingEvidence.sourceNoteIdentityVerified ?? false)} · POS {item.source.pos}</dd></div></dl>
        {item.lexemePronunciationProfile && <div className="media-review__pronunciation-profile">
          <strong>{item.lexemePronunciationProfile.reviewSignal}</strong>
          <span>{item.lexemePronunciationProfile.referenceCount} references · {item.lexemePronunciationProfile.sourceNoteCount} source notes · POS {item.lexemePronunciationProfile.posClasses.join(", ") || "unverified"}</span>
          {item.lexemePronunciationProfile.pronunciationForms.map((form) => <p key={`${item.targetLexemeIdentity}-${form.ipa}`}>
            <code>{form.ipa}</code> · {form.sourceNotes.map((note) => note.sourceRecordId).join(", ")}
            {form.sourceIpaSha256 && <small className="media-review__hash"> · IPA SHA256 {form.sourceIpaSha256}</small>}
          </p>)}
          {item.lexemePronunciationProfile.reviewSignal === "MULTIPLE_SOURCE_IPA_FORMS_REVIEW"
            ? <em>Different IPA forms share this Lexeme identity. Review as a possible homograph or pronunciation variant; keep the outcome pending until resolved.</em>
            : item.lexemePronunciationProfile.reviewSignal === "MULTIPLE_POS_SHARED_IPA_REVIEW"
              ? <em>Multiple POS classes share one source IPA form. Confirm the intended Lexeme pronunciation; do not duplicate audio per Sense.</em>
              : null}
        </div>}
        <p className="media-review__evidence">Audio is attached to the Lexeme pronunciation when supported. No per-Sense duplicate is required.</p>
      </section>}

      {example && <section className="media-review__target-card"><h3>Example comparison</h3>
        <p className="media-review__example-source"><span>Source audio text</span>{item.source.example || "No source sentence"}</p>
        <p className="media-review__evidence">Contract {String(item.exampleTextComparison?.classification ?? "UNRESOLVED")} · safe normalization compares complete ordered tokens and does not rewrite sentences.</p>
        <p className="media-review__normalization">Normalization v1: HTML stripping, NFKC, lowercase, punctuation separators and whitespace collapse. No stemming, translation, word substitution, reorder or contraction changes.</p>
        {item.targetExampleCandidates.length ? <div className="media-review__example-options">
          {item.targetExampleCandidates.map((candidate) => <label className={targetExampleKey === candidate.exampleKey ? "is-selected" : ""} key={candidate.exampleKey}>
            <input type="radio" name={`target-example-${item.mappingKey}`} value={candidate.exampleKey} checked={targetExampleKey === candidate.exampleKey}
              onChange={() => { setTargetExampleKey(candidate.exampleKey); setTargetSenseKey(candidate.proposalKey); }} />
            <span><strong>{candidate.headword} · {candidate.partOfSpeech} · {candidate.meaningVi}</strong>
              <span>{candidate.en}</span><em>{decisionLabels[candidate.textClassification]}</em></span>
          </label>)}
        </div> : <p className="media-review__warning">No current effective Sense/example candidate. Preserve the source audio reference and leave the V2 link unresolved.</p>}
        {normalizationTarget && <p className="media-review__evidence">Single matching target candidate: {normalizationTarget.exampleKey}</p>}
      </section>}

      <details className="media-review__full-evidence">
        <summary>Full mapping evidence</summary>
        <pre>{JSON.stringify(item.mappingEvidence, null, 2)}</pre>
      </details>

      <section className="media-review__proof"><h3>Provenance & rights</h3>
        <dl><div><dt>Source note</dt><dd>{item.sourceNoteIdentity.sourceRecordId} · {item.sourceNoteIdentity.sourceNoteGuid}</dd></div>
          <div><dt>Source file</dt><dd>{item.sourceFilename} · archive {item.sourceArchiveEntry ?? "unavailable"}</dd></div>
          <div><dt>Media SHA256</dt><dd className="media-review__hash">{item.mediaSha256}</dd></div>
          <div><dt>Target Sense fingerprint</dt><dd className="media-review__hash">{selectedTarget?.contentFingerprint ?? item.proposedSense?.contentFingerprint ?? "No effective Sense target"}</dd></div>
          <div><dt>Storage key</dt><dd className="media-review__hash">{item.providerNeutralStorageKey}</dd></div></dl>
        {item.rightsEvidence.map((entry) => <p className="media-review__rights-evidence" key={entry.evidenceId}><strong>{entry.scope}</strong> · {entry.finding} <a href={entry.url} target="_blank" rel="noreferrer">Open evidence</a></p>)}
        <p className="media-review__warning">The deck page states CC BY-NC; that page-level claim does not establish a license for this file. Commercial use needs separate permission unless a different asset-level license applies.</p>
      </section>

      <label className="media-review__note"><span>Reviewer note (optional)</span><textarea value={reviewerNote} maxLength={2000} onChange={(event) => setReviewerNote(event.target.value)} /></label>
      {item.review && <p className="media-review__prior-decision">Latest decision: <strong>{decisionLabels[item.review.outcome] ?? item.review.outcome}</strong> · {item.review.reviewer_identity} · {new Date(item.review.reviewed_at).toLocaleString()}</p>}
      <div className="media-review__decision-actions">
        {image ? <>
          <button className="button primary" type="button" disabled={pending || !selectedTarget || !targetSenseKey || isAmbiguousImage && !senseCandidates.some((sense) => sense.proposalKey === targetSenseKey)} onClick={() => onDecision("ACCEPT_MAPPING", targetSenseKey)}>Accept this Sense mapping</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("REJECT_MAPPING")}>Reject mapping</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("AMBIGUOUS")}>Keep ambiguous</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("NEEDS_REVIEW")}>Needs review</button>
        </> : item.mediaKind === "WORD_PRONUNCIATION_AUDIO" ? <>
          <button className="button primary" type="button" disabled={pending || !item.targetLexemeIdentity} onClick={() => onDecision("EXACT_SUPPORTED_LEXEME_MATCH")}>Exact Lexeme match</button>
          <button className="button secondary" type="button" disabled={pending || !item.targetLexemeIdentity} onClick={() => onDecision("PRONUNCIATION_VARIANT")}>Pronunciation variant</button>
          <button className="button secondary" type="button" disabled={pending || !item.targetLexemeIdentity} onClick={() => onDecision("HOMOGRAPH_DIFFERENT_PRONUNCIATION")}>Homograph · different pronunciation</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("AMBIGUOUS")}>Ambiguous</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("INVALID_ASSOCIATION")}>Invalid association</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("NEEDS_REVIEW")}>Needs review</button>
        </> : <>
          <button className="button primary" type="button" disabled={pending || !selectedExample || selectedExample.textClassification !== "EXACT_TEXT_MATCH"} onClick={() => onDecision("EXACT_TEXT_MATCH", selectedExample?.proposalKey, selectedExample ?? undefined)}>Accept exact match</button>
          <button className="button secondary" type="button" disabled={pending || !selectedExample || selectedExample.textClassification !== "SAFE_NORMALIZED_MATCH"} onClick={() => onDecision("SAFE_NORMALIZED_MATCH", selectedExample?.proposalKey, selectedExample ?? undefined)}>Accept safe normalized match</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("DIFFERENT_SENTENCE")}>Different sentence</button>
          <button className="button secondary" type="button" disabled={pending} onClick={() => onDecision("UNRESOLVED")}>Unresolved</button>
        </>}
      </div>
      {example && acceptOutcome && acceptOutcome !== "UNRESOLVED" && <p className="media-review__evidence">Candidate comparison result: {decisionLabels[acceptOutcome]}</p>}
    </article>
  );
}

function SenseCard({ sense }: { sense: TargetSense }) {
  return <div className="media-review__sense">
    <div className="media-review__sense-heading"><strong>{sense.headword}</strong><span>{sense.partOfSpeech}</span><span>{sense.meaningVi}</span><code>{sense.proposalKey}</code></div>
    <p><strong>English definition</strong>{sense.definitionEn}</p>
    <p><strong>Target example</strong>{sense.examples[0]?.en || "No current example"}</p>
    <p><strong>Content fingerprint</strong><code>{sense.contentFingerprint}</code></p>
  </div>;
}

function RightsDetail({ asset, scope, setScope, rightsStatus, setRightsStatus, evidenceType, setEvidenceType, evidenceUrl, setEvidenceUrl,
  rightsHolder, setRightsHolder, intendedUse, setIntendedUse, reviewerNote, setReviewerNote, pending, onSubmit }: {
  asset: RightsAsset; scope: "ASSET" | "GROUP"; setScope: (scope: "ASSET" | "GROUP") => void;
  rightsStatus: string; setRightsStatus: (value: string) => void; evidenceType: string; setEvidenceType: (value: string) => void;
  evidenceUrl: string; setEvidenceUrl: (value: string) => void; rightsHolder: string; setRightsHolder: (value: string) => void;
  intendedUse: string; setIntendedUse: (value: string) => void; reviewerNote: string; setReviewerNote: (value: string) => void;
  pending: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const audio = asset.mediaKind === "AUDIO";
  return <article className="media-review__detail" aria-labelledby="media-review-rights-title">
    <header className="media-review__detail-head"><div><p className="eyebrow">Unique asset · {asset.mediaRoles.join(" · ")}</p>
      <h2 id="media-review-rights-title">Rights evidence</h2><p>{formatCount(asset.mappingReferenceCount)} source mapping references · {formatCount(asset.acceptedMappingCount)} accepted · {formatCount(asset.reviewedMappingCount)} reviewed</p></div>
      <span className={`media-review__status media-review__status--${asset.rightsStatus.toLowerCase()}`}>{asset.rightsStatus}</span></header>
    <div className={`media-review__preview ${audio ? "media-review__preview--audio" : "media-review__preview--image"}`}>
      {audio ? <audio controls preload="metadata" src={`${api}/assets/${asset.mediaSha256}/preview`}>Your browser does not support audio playback.</audio>
        : <img src={`${api}/assets/${asset.mediaSha256}/preview`} alt="Source 4600 deck image preview" />}
      <span>Original APKG bytes · SHA256 verified when previewed</span></div>
    <section className="media-review__proof"><h3>Asset identity</h3><dl>
      <div><dt>SHA256</dt><dd className="media-review__hash">{asset.mediaSha256}</dd></div>
      <div><dt>Source files</dt><dd>{asset.fileIdentities.map((file) => `${file.sourceFilename} · archive ${file.archiveEntry}`).join("; ")}</dd></div>
      <div><dt>Source note identities</dt><dd>{asset.noteIdentities.map((note) => `${note.sourceRecordId} · ${note.sourceNoteGuid}`).join("; ")}</dd></div>
      <div><dt>Evidence group</dt><dd>{asset.evidenceGroupId} · {formatCount(asset.evidenceGroupAssetCount)} unique assets in group</dd></div>
      <div><dt>Provider-neutral key</dt><dd className="media-review__hash">{asset.providerNeutralStorageKey}</dd></div>
    </dl>
      {asset.rightsEvidence.map((entry) => <p className="media-review__rights-evidence" key={entry.evidenceId}><strong>{entry.scope}</strong> · {entry.finding} <a href={entry.url} target="_blank" rel="noreferrer">Open evidence</a></p>)}
      <p className="media-review__warning">The deck page's CC BY-NC notice does not prove the uploader had rights to each image or recording. It permits noncommercial sharing only for material actually covered; separate commercial permission is required.</p>
      {asset.rightsDecision && <p className="media-review__prior-decision">Latest rights decision: <strong>{asset.rightsDecision.rightsStatus ?? asset.rightsStatus}</strong> · {asset.rightsDecision.reviewerIdentity} · {new Date(asset.rightsDecision.reviewedAt).toLocaleString()}</p>}
    </section>
    <form className="media-review__rights-form" noValidate onSubmit={onSubmit}>
      <h3>Record a rights decision</h3>
      <label><span>Decision scope</span><select value={scope} onChange={(event) => setScope(event.target.value as "ASSET" | "GROUP")}>
        <option value="ASSET">This SHA256 asset only</option><option value="GROUP">Evidence group ({formatCount(asset.evidenceGroupAssetCount)} assets)</option>
      </select></label>
      {scope === "GROUP" && <p className="media-review__warning">A group decision applies to every hash in this group. The current group contains {formatCount(asset.evidenceGroupAssetCount)} assets. The page-level notice does not establish a group license.</p>}
      <label><span>Rights status</span><select value={rightsStatus} onChange={(event) => setRightsStatus(event.target.value)}>
        <option value="UNKNOWN_REVIEW_REQUIRED">UNKNOWN_REVIEW_REQUIRED</option><option value="INTERNAL_REFERENCE_ONLY">INTERNAL_REFERENCE_ONLY</option>
        <option value="CLEARED_FOR_INTENDED_USE">CLEARED_FOR_INTENDED_USE</option><option value="RESTRICTED">RESTRICTED</option>
      </select></label>
      <label><span>Evidence type</span><select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
        <option value="ASSET_SPECIFIC_LICENSE">Asset-specific license</option><option value="RIGHTS_HOLDER_PERMISSION">Rights-holder permission</option>
        <option value="PUBLIC_DOMAIN_RECORD">Public-domain record</option><option value="RIGHTS_HOLDER_GROUP_LICENSE">Rights-holder group license</option>
        <option value="SOURCE_PAGE_LICENSE_NOTICE">Source page notice</option><option value="OTHER_DOCUMENTED_EVIDENCE">Other documented evidence</option>
      </select></label>
      <label><span>Evidence URL</span><input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} maxLength={2000} placeholder="https://…" /></label>
      <label><span>Rights holder / licensor</span><input value={rightsHolder} onChange={(event) => setRightsHolder(event.target.value)} maxLength={300} /></label>
      <label><span>Intended Cloudinary use</span><select value={intendedUse} onChange={(event) => setIntendedUse(event.target.value)}>
        <option value="CLOUDINARY_PUBLIC_NONCOMMERCIAL">Public delivery · noncommercial</option><option value="CLOUDINARY_PUBLIC_COMMERCIAL">Public delivery · commercial</option>
        <option value="CLOUDINARY_PRIVATE_INTERNAL">Private internal reference</option>
      </select></label>
      <label className="media-review__note"><span>Rights review note</span><textarea value={reviewerNote} maxLength={2000} onChange={(event) => setReviewerNote(event.target.value)} /></label>
      <p className="media-review__normalization">To clear an asset, cite evidence covering the individual file or a documented group license, name the rights holder, and choose the intended Cloudinary use. The deck page or CC BY-NC deed alone is rejected as clearance evidence.</p>
      <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save rights decision"}</button>
    </form>
  </article>;
}
