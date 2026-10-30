import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { DevelopmentSenseMediaPreview } from "./development-sense-media-preview";

type Provenance = Record<string, unknown> | unknown[] | null;
type CandidateContent = null | {
  headword: string | null;
  partOfSpeech: string | null;
  displayForm: string | null;
  senseLabelEn: string | null;
  definitionEn: string | null;
  meaningVi: string | null;
  examples: unknown;
  usageNotes: string | null;
};
type CandidateVersion = {
  candidateContentHash: string;
  selectionStatus: string;
  candidateContent: CandidateContent;
  sourceProvenanceReferences: Provenance;
  artifactIdentity: Provenance;
};
type StagingItem = {
  proposalKey: string;
  sourceGroupKey: string;
  resolutionStatus: "EFFECTIVE" | "PENDING_CONTENT_VALIDATION" | "PENDING_VERSION_DECISION";
  effectiveContentHash: string | null;
  rightsStatus: string;
  pendingReason: string;
  draft: null | {
    headword: string;
    partOfSpeech: string;
    senseIdentity: unknown;
    definitionEn: string;
    meaningVi: string;
    examples: unknown;
    usageNotes: string | null;
    displayForm: string | null;
    editorialStatus: string;
    sourceProvenance: Provenance;
  };
  identitySourceProvenance: Provenance;
  candidateVersions: CandidateVersion[];
};
type PreviewResponse = {
  target: { projectId: string; branchId: string; endpointId: string; database: string; schema: string };
  statusCounts: Record<string, number>;
  page: number;
  pageSize: number;
  total: number;
  items: StagingItem[];
};

const statusLabels: Record<string, string> = {
  ALL: "Tất cả trạng thái",
  EFFECTIVE: "Có effective DRAFT",
  PENDING_CONTENT_VALIDATION: "Chờ content validation",
  PENDING_VERSION_DECISION: "Chờ quyết định phiên bản",
};

function formatCount(value: number | undefined) {
  return new Intl.NumberFormat("vi-VN").format(value ?? 0);
}

function showJson(value: unknown) {
  if (value == null) return "Không có dữ liệu";
  return JSON.stringify(value, null, 2);
}

function examplesOf(value: unknown) {
  if (Array.isArray(value)) return value as Array<{ en?: string; vi?: string }>;
  if (value && typeof value === "object") return [value as { en?: string; vi?: string }];
  return [];
}

function candidateValues(item: StagingItem, key: "headword" | "partOfSpeech" | "displayForm") {
  return [...new Set(item.candidateVersions.map((candidate) => candidate.candidateContent?.[key]?.trim()).filter((value): value is string => Boolean(value)))];
}

function candidateSummary(item: StagingItem, key: "headword" | "partOfSpeech" | "displayForm", fallback: string) {
  const values = candidateValues(item, key);
  if (values.length === 0) return fallback;
  if (values.length === 1) return item.draft ? values[0] : `${values[0]} · candidate`;
  return `${values.length} candidate variants`;
}

function ProvenanceDetails({ title, value }: { title: string; value: Provenance }) {
  if (value == null || (Array.isArray(value) && value.length === 0) || (!Array.isArray(value) && Object.keys(value).length === 0)) {
    return <p className="staging-muted">Chưa có source provenance được lưu.</p>;
  }
  return (
    <details className="staging-provenance">
      <summary>{title}</summary>
      <pre>{showJson(value)}</pre>
    </details>
  );
}

export function StagingPreviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "ALL";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const selectedKey = searchParams.get("selected");
  const [searchDraft, setSearchDraft] = useState(search);
  const [statusDraft, setStatusDraft] = useState(Object.hasOwn(statusLabels, status) ? status : "ALL");
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDraft(search), 0);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const timer = window.setTimeout(() => setStatusDraft(Object.hasOwn(statusLabels, status) ? status : "ALL"), 0);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), status });
    if (search) params.set("search", search);
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return null;
      setLoading(true); setError(false);
      return fetch(`/api/dev/staging-preview?${params}`, { signal: controller.signal, cache: "no-store" });
    })
      .then(async (response) => {
        if (!response) return null;
        if (!response.ok) throw new Error("Staging preview request failed");
        return response.json() as Promise<PreviewResponse>;
      })
      .then((result) => { if (!controller.signal.aborted && result) setData(result); })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, search, status, retryKey]);

  const selectedItem = useMemo(() => {
    if (!data?.items.length) return null;
    return data.items.find((item) => item.proposalKey === selectedKey) ?? data.items[0];
  }, [data, selectedKey]);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 25)));

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const committedSearch = searchDraft.trim();
    if (committedSearch) next.set("search", committedSearch);
    else next.delete("search");
    next.set("status", statusDraft);
    next.delete("page");
    next.delete("selected");
    setSearchParams(next);
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    next.delete("selected");
    setSearchParams(next);
  }

  function selectItem(item: StagingItem) {
    const next = new URLSearchParams(searchParams);
    next.set("selected", item.proposalKey);
    setSearchParams(next, { replace: true });
  }

  return (
    <main className="staging-preview" aria-labelledby="staging-preview-title">
      <header className="staging-preview__header">
        <div>
          <p className="eyebrow">Development · Nội bộ</p>
          <h1 id="staging-preview-title">Editorial staging preview</h1>
          <p className="staging-preview__intro">Tìm và xem nội dung staging, tình trạng validation cùng provenance đã lưu. Màn hình này chỉ đọc; DRAFT không đồng nghĩa được phê duyệt hoặc phát hành.</p>
        </div>
        <div className="staging-preview__header-actions">
          <a className="button secondary" href="/dev/media-review">Open media review</a>
          <span className="staging-preview__readonly" aria-label="Chế độ chỉ đọc">Chỉ đọc</span>
        </div>
      </header>

      <section className="staging-preview__target" aria-label="Database target Development">
        <div><span>Project</span><strong>{data?.target.projectId ?? "shy-hill-72364426"}</strong></div>
        <div><span>Branch</span><strong>{data?.target.branchId ?? "br-square-grass-b3af0nte"}</strong></div>
        <div><span>Schema</span><strong>{data?.target.schema ?? "vocabflow_editorial_staging"}</strong></div>
        <div><span>Database</span><strong>{data?.target.database ?? "neondb"}</strong></div>
      </section>

      <section className="staging-preview__metrics" aria-label="Số lượng identities theo trạng thái">
        <article className="staging-metric"><span>Identities</span><strong>{formatCount(Object.values(data?.statusCounts ?? {}).reduce((sum, count) => sum + count, 0))}</strong></article>
        <article className="staging-metric"><span>Effective DRAFT</span><strong>{formatCount(data?.statusCounts.EFFECTIVE)}</strong></article>
        <article className="staging-metric staging-metric--warning"><span>Chờ content validation</span><strong>{formatCount(data?.statusCounts.PENDING_CONTENT_VALIDATION)}</strong></article>
        <article className="staging-metric staging-metric--pending"><span>Chờ version decision</span><strong>{formatCount(data?.statusCounts.PENDING_VERSION_DECISION)}</strong></article>
      </section>

      <form className="staging-filter" role="search" noValidate onSubmit={submitFilters}>
        <label className="staging-filter__search">
          <span>Tìm headword, POS, proposal key hoặc nội dung</span>
          <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={100} type="search" placeholder="Nhập từ cần tìm" />
        </label>
        <div className="staging-filter__status">
          <span>Validation status</span>
          <div className="staging-filter__statuses" role="group" aria-label="Chọn validation status">
            {Object.entries(statusLabels).map(([value, label]) => <button key={value} className={statusDraft === value ? "is-active" : undefined} type="button" aria-pressed={statusDraft === value} onClick={() => setStatusDraft(value)}>{label}</button>)}
          </div>
        </div>
        <button className="button primary staging-filter__submit" type="submit">Tìm kiếm</button>
      </form>

      {error ? (
        <section className="staging-state" role="alert">
          <h2>Không đọc được staging</h2>
          <p>Chạy preview API Development ở cùng checkout rồi thử lại: <code>pnpm dev:staging-preview</code>. Trang không đọc database trực tiếp từ trình duyệt.</p>
          <button className="button secondary" type="button" onClick={() => setRetryKey((value) => value + 1)}>Thử lại</button>
        </section>
      ) : loading ? (
        <section className="staging-state" role="status" aria-busy="true">Đang tải staging Development…</section>
      ) : data && data.items.length === 0 ? (
        <section className="staging-state" role="status">
          <h2>Không có kết quả phù hợp</h2>
          <p>Thử cụm tìm kiếm khác hoặc chọn trạng thái khác.</p>
        </section>
      ) : data ? (
        <>
          <p className="staging-preview__range" role="status">Hiển thị {formatCount((page - 1) * data.pageSize + 1)}–{formatCount(Math.min(page * data.pageSize, data.total))} / {formatCount(data.total)} identities</p>
          <section className="staging-preview__workspace" aria-label="Staging records">
            <div className="staging-list">
              <div className="staging-list__scroll" tabIndex={0} aria-label="Danh sách identities, cuộn ngang để xem đủ cột">
                <table>
                  <thead><tr><th scope="col">Headword / key</th><th scope="col">POS</th><th scope="col">Display form</th><th scope="col">Status</th></tr></thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.proposalKey} className={selectedItem?.proposalKey === item.proposalKey ? "is-selected" : undefined}>
                        <td>
                          <button className="staging-row-select" type="button" aria-pressed={selectedItem?.proposalKey === item.proposalKey} onClick={() => selectItem(item)}>
                            {item.draft?.headword ?? candidateSummary(item, "headword", item.sourceGroupKey)}
                          </button>
                          <span className="staging-row-key">{item.proposalKey}</span>
                        </td>
                        <td>{item.draft?.partOfSpeech ?? candidateSummary(item, "partOfSpeech", "—")}</td>
                        <td>{item.draft?.displayForm || candidateSummary(item, "displayForm", "Chưa có")}</td>
                        <td><span className={`staging-status staging-status--${item.resolutionStatus.toLowerCase()}`}>{statusLabels[item.resolutionStatus]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="staging-pagination" aria-label="Phân trang staging">
                <button className="button secondary" type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>Trang trước</button>
                <span>Trang {formatCount(page)} / {formatCount(pageCount)}</span>
                <button className="button secondary" type="button" onClick={() => setPage(page + 1)} disabled={page >= pageCount}>Trang sau</button>
              </nav>
            </div>

            {selectedItem && (
              <article className="staging-detail" aria-labelledby="staging-detail-title">
                <header className="staging-detail__header">
                  <div>
                    <p className="eyebrow">Sense preview</p>
                    <h2 id="staging-detail-title">{selectedItem.draft?.headword ?? candidateSummary(selectedItem, "headword", selectedItem.sourceGroupKey)}</h2>
                    <p>{selectedItem.draft?.partOfSpeech ?? candidateSummary(selectedItem, "partOfSpeech", "POS chưa có trong candidate data")} · {selectedItem.proposalKey}</p>
                  </div>
                  <span className={`staging-status staging-status--${selectedItem.resolutionStatus.toLowerCase()}`}>{statusLabels[selectedItem.resolutionStatus]}</span>
                </header>
                <dl className="staging-detail__meta">
                  <div><dt>Display form</dt><dd>{selectedItem.draft?.displayForm || candidateSummary(selectedItem, "displayForm", "Chưa có")}</dd></div>
                  <div><dt>Editorial status</dt><dd>{selectedItem.draft?.editorialStatus ?? "Chưa có effective DRAFT"}</dd></div>
                  <div><dt>Rights status</dt><dd>{selectedItem.rightsStatus}</dd></div>
                  <div><dt>Effective content hash</dt><dd className="staging-hash">{selectedItem.effectiveContentHash ?? "Chưa chọn effective version"}</dd></div>
                  <div><dt>Pending reason</dt><dd>{selectedItem.pendingReason}</dd></div>
                </dl>
                {selectedItem.draft ? (
                  <div className="staging-detail__content">
                    <section><h3>Sense</h3><pre>{showJson(selectedItem.draft.senseIdentity)}</pre></section>
                    <section><h3>English definition</h3><p>{selectedItem.draft.definitionEn}</p></section>
                    <section><h3>Nghĩa tiếng Việt</h3><p>{selectedItem.draft.meaningVi}</p></section>
                    <section><h3>Examples</h3>
                      {examplesOf(selectedItem.draft.examples).map((example, index) => (
                        <div className="staging-example" key={`${selectedItem.proposalKey}:${index}`}>
                          <p><strong>EN</strong> {example.en || "Chưa có ví dụ tiếng Anh"}</p>
                          <p><strong>VI</strong> {example.vi || "Chưa có bản dịch tiếng Việt"}</p>
                        </div>
                      ))}
                    </section>
                    {selectedItem.resolutionStatus === "EFFECTIVE" && selectedItem.effectiveContentHash && (
                      <DevelopmentSenseMediaPreview
                        proposalKey={selectedItem.proposalKey}
                        contentFingerprint={selectedItem.effectiveContentHash}
                        headword={selectedItem.draft.headword}
                      />
                    )}
                    <section><h3>Usage notes</h3><p>{selectedItem.draft.usageNotes || "Không có usage notes được lưu."}</p></section>
                    <ProvenanceDetails title="Source provenance của DRAFT" value={selectedItem.draft.sourceProvenance} />
                  </div>
                ) : (
                  <section className="staging-state staging-state--compact"><h3>Chưa có effective DRAFT projection</h3><p>Candidate hashes và provenance hiện có được liệt kê bên dưới; không candidate nào được chọn tự động.</p></section>
                )}
                <section className="staging-detail__versions">
                  <h3>Candidate versions ({selectedItem.candidateVersions.length})</h3>
                  {selectedItem.candidateVersions.length ? selectedItem.candidateVersions.map((candidate) => (
                    <article className="staging-version" key={candidate.candidateContentHash}>
                      <div><span>{candidate.selectionStatus}</span><code>{candidate.candidateContentHash}</code></div>
                      {candidate.candidateContent && !selectedItem.draft && (
                        <section className="staging-candidate-content" aria-label="Candidate content, not effective">
                          <p className="staging-candidate-content__label">Candidate only · chưa được chọn làm effective content</p>
                          <p><strong>{candidate.candidateContent.headword || "Headword chưa có"}</strong> · {candidate.candidateContent.partOfSpeech || "POS chưa có"} · {candidate.candidateContent.displayForm || "Chưa có display form"}</p>
                          {candidate.candidateContent.senseLabelEn && <p><strong>Sense</strong> {candidate.candidateContent.senseLabelEn}</p>}
                          {candidate.candidateContent.definitionEn && <p><strong>EN</strong> {candidate.candidateContent.definitionEn}</p>}
                          {candidate.candidateContent.meaningVi && <p><strong>VI</strong> {candidate.candidateContent.meaningVi}</p>}
                          {examplesOf(candidate.candidateContent.examples).map((example, index) => <div className="staging-example" key={`${candidate.candidateContentHash}:${index}`}><p><strong>EN</strong> {example.en || "Chưa có ví dụ tiếng Anh"}</p><p><strong>VI</strong> {example.vi || "Chưa có bản dịch tiếng Việt"}</p></div>)}
                          {candidate.candidateContent.usageNotes && <p><strong>Usage</strong> {candidate.candidateContent.usageNotes}</p>}
                        </section>
                      )}
                      <ProvenanceDetails title="Source/artifact references" value={candidate.sourceProvenanceReferences} />
                      <ProvenanceDetails title="Artifact identity" value={candidate.artifactIdentity} />
                    </article>
                  )) : <p className="staging-muted">Không có candidate version được lưu.</p>}
                </section>
                <ProvenanceDetails title="Source provenance của identity" value={selectedItem.identitySourceProvenance} />
              </article>
            )}
          </section>
          <p className="staging-preview__notice">Chỉ hiển thị provenance, identifiers và hashes đã lưu; không hiển thị raw source text. Mọi bản ghi vẫn là DRAFT / UNKNOWN_REVIEW_REQUIRED cho đến khi các gate riêng được giải quyết.</p>
        </>
      ) : null}
    </main>
  );
}
