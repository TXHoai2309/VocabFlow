import { useEffect, useState } from "react";

type SourceNoteIdentity = { sourceRecordId: string; sourceNoteGuid: string; recordEvidenceSha256: string };
type PreviewAsset = {
  mediaSha256: string;
  mimeType: string;
  rightsStatus: string;
  url: string;
  mappingKey?: string;
  mappingStatus?: string;
  mappingConfidence?: number;
  mappingEvidence?: Record<string, unknown>;
  sourceNoteIdentity?: SourceNoteIdentity;
  sourceContentHash?: string;
  targetContentFingerprint?: string;
  targetLexemeIdentity?: string;
  targetSnapshotFingerprint?: string;
  targetPartOfSpeech?: string;
  sourcePosClasses?: string[];
  candidatePosMatchesSense?: boolean;
  reviewStatus?: string;
  pronunciation?: string;
  sourceIpaSha256?: string | null;
  pronunciationEvidence?: string | null;
  lexemePronunciationReviewSignal?: string;
  textMatch?: "EXACT_TEXT_MATCH" | "SAFE_NORMALIZED_MATCH";
};
type ExamplePreview = {
  exampleKey: string;
  index: number;
  text: string;
  audio: PreviewAsset | null;
};
type SenseMediaResponse = {
  proposalKey: string;
  contentFingerprint: string;
  targetSnapshotFingerprint: string;
  source: "ENGLISH_VOCAB_4600";
  rightsNotice: string;
  previewMode: "ACCEPTED_ONLY" | "ACCEPTED_AND_PROPOSED";
  images: PreviewAsset[];
  proposedImages: PreviewAsset[];
  ambiguousImages: PreviewAsset[];
  wordPronunciations: PreviewAsset[];
  proposedWordPronunciations: PreviewAsset[];
  ambiguousWordPronunciations: PreviewAsset[];
  examples: ExamplePreview[];
};

function SourceProof({ asset }: { asset: PreviewAsset }) {
  return <>
    {asset.sourceNoteIdentity ? <small>Source note {asset.sourceNoteIdentity.sourceRecordId} · {asset.sourceNoteIdentity.sourceNoteGuid}</small> : null}
    {asset.mappingKey ? <small>Mapping {asset.mappingKey} · {asset.mappingStatus} · confidence {asset.mappingConfidence ?? "n/a"}</small> : null}
    {asset.targetContentFingerprint ? <small>Target Sense content hash {asset.targetContentFingerprint}</small> : null}
    {asset.targetSnapshotFingerprint ? <small>Staging snapshot fingerprint {asset.targetSnapshotFingerprint}</small> : null}
    {asset.targetLexemeIdentity ? <small>Target Lexeme {asset.targetLexemeIdentity}</small> : null}
    {asset.sourcePosClasses ? <small>Source POS {asset.sourcePosClasses.join(", ")} · target POS {asset.targetPartOfSpeech ?? "unknown"} · {asset.candidatePosMatchesSense === false ? "LEXEME VARIANT KHÁC POS — không gắn vào Sense này" : "POS khớp"}</small> : null}
    <small>Rights {asset.rightsStatus} · SHA256 {asset.mediaSha256}</small>
    {asset.mappingEvidence ? <details><summary>Mapping evidence</summary><pre>{JSON.stringify(asset.mappingEvidence, null, 2)}</pre></details> : null}
  </>;
}

function ImageGrid({ assets, headword, label }: { assets: PreviewAsset[]; headword: string; label?: string }) {
  return <div className="dev-sense-media__images">{assets.map((image) => <figure key={`${image.mappingKey ?? "accepted"}:${image.mediaSha256}`}>
    {label ? <strong className="dev-sense-media__proposed-label">{label}</strong> : null}
    <img src={image.url} loading="lazy" alt={`Development ${image.reviewStatus ?? "accepted"} image preview for ${headword}`} />
    <figcaption><SourceProof asset={image} /></figcaption>
  </figure>)}</div>;
}

function AudioList({ assets, label }: { assets: PreviewAsset[]; label?: string }) {
  return <ul className="dev-sense-media__audio-list">{assets.map((audio) => <li key={`${audio.mappingKey ?? "accepted"}:${audio.mediaSha256}`}>
    {label ? <strong className="dev-sense-media__proposed-label">{label}</strong> : null}
    <span>{audio.pronunciation ?? "Pronunciation variant"}</span>
    <audio controls preload="none" src={audio.url}>Trình duyệt không hỗ trợ phát audio.</audio>
    <SourceProof asset={audio} />
  </li>)}</ul>;
}

export function DevelopmentSenseMediaPreview({ proposalKey, contentFingerprint, headword }: {
  proposalKey: string;
  contentFingerprint: string;
  headword: string;
}) {
  const [data, setData] = useState<SenseMediaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [includeProposed, setIncludeProposed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ contentFingerprint });
    if (includeProposed) query.set("includeProposed", "1");
    const path = `/api/dev/media-review/senses/${encodeURIComponent(proposalKey)}/learning-preview?${query}`;
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return null;
      setLoading(true); setFailed(false); setData(null);
      return fetch(path, { signal: controller.signal, cache: "no-store" });
    })
      .then(async (response) => {
        if (!response) return null;
        if (!response.ok) throw new Error("Development media preview request failed");
        return response.json() as Promise<SenseMediaResponse>;
      })
      .then((result) => { if (!controller.signal.aborted && result) setData(result); })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [proposalKey, contentFingerprint, includeProposed]);

  const reviewHref = `/dev/media-review?search=${encodeURIComponent(headword)}`;
  const pendingLabel = "PROPOSED — CHƯA KIỂM DUYỆT";

  return (
    <section className="dev-sense-media" aria-labelledby="dev-sense-media-title">
      <header>
        <div><p className="eyebrow">Development · APKG source</p><h3 id="dev-sense-media-title">Media cho Sense này</h3></div>
        <span className="dev-sense-media__scope">Local preview · rights not cleared</span>
      </header>
      <label className="dev-sense-media__toggle">
        <input type="checkbox" checked={includeProposed} onChange={(event) => setIncludeProposed(event.target.checked)} />
        <span>Include proposed</span>
        <small>Mặc định chỉ xem mapping đã được reviewer xác nhận. Bật để xem ứng viên riêng trong Development.</small>
      </label>
      {loading ? <p className="staging-muted" role="status">Đang kiểm tra media mapping theo snapshot hiện hành…</p> : null}
      {failed ? <div className="dev-sense-media__fallback" role="status">
        <strong>Chưa tải được media mapping.</strong>
        <span>Media nguồn vẫn nằm trong Development review; kiểm tra snapshot và source hash trước khi xem.</span>
        <a href={reviewHref}>Mở Media Review</a>
      </div> : null}
      {!loading && !failed && data ? <>
        <div className="dev-sense-media__groups">
          <section aria-label="Ảnh minh họa đã xác nhận">
            <h4>Ảnh minh họa · Accepted</h4>
            {data.images.length ? <ImageGrid assets={data.images} headword={headword} /> : <p className="dev-sense-media__fallback">Chưa có ảnh được xác nhận cho Sense này.</p>}
          </section>
          {includeProposed ? <section aria-label="Ảnh minh họa đề xuất">
            <h4>Ảnh minh họa · Proposed</h4>
            {data.proposedImages.length ? <ImageGrid assets={data.proposedImages} headword={headword} label={pendingLabel} />
              : <p className="dev-sense-media__fallback">Không có ảnh PROPOSED nào khớp Sense và content hash hiện hành.</p>}
          </section> : null}
          {includeProposed && data.ambiguousImages.length ? <section aria-label="Ảnh mapping ambiguous">
            <h4>Ảnh mapping ambiguous · cần reviewer chọn Sense</h4>
            <p className="dev-sense-media__fallback">Ứng viên dưới đây được tách riêng và không được tính là mapping đã xác nhận.</p>
            <ImageGrid assets={data.ambiguousImages} headword={headword} label="AMBIGUOUS — CHỜ REVIEWER" />
          </section> : null}
          <section aria-label="Phát âm từ đã xác nhận">
            <h4>Phát âm từ · Accepted</h4>
            {data.wordPronunciations.length ? <AudioList assets={data.wordPronunciations} /> : <p className="dev-sense-media__fallback">Chưa có pronunciation variant được xác nhận cho Lexeme này.</p>}
          </section>
          {includeProposed ? <section aria-label="Phát âm từ đề xuất">
            <h4>Phát âm từ · Proposed</h4>
            {data.proposedWordPronunciations.length ? <AudioList assets={data.proposedWordPronunciations} label={pendingLabel} />
              : <p className="dev-sense-media__fallback">Không có word audio PROPOSED đơn nhất khớp Lexeme, POS và snapshot hiện hành.</p>}
          </section> : null}
          {includeProposed && data.ambiguousWordPronunciations.length ? <section aria-label="Các pronunciation variant ambiguous">
            <h4>Pronunciation variants · ambiguous</h4>
            <p className="dev-sense-media__fallback">Các phương án bên dưới có nhiều pronunciation source forms. Hãy tự chọn từng audio để nghe; không có phát âm nào được chọn mặc định.</p>
            <AudioList assets={data.ambiguousWordPronunciations} label="PROPOSED — CHƯA KIỂM DUYỆT · AMBIGUOUS VARIANT" />
          </section> : null}
          <section aria-label="Audio câu ví dụ đã xác nhận">
            <h4>Audio câu ví dụ · Accepted text match only</h4>
            {data.examples.length ? <ul className="dev-sense-media__audio-list">{data.examples.map((example) => <li key={example.exampleKey}>
              <span>Ví dụ {example.index + 1}: {example.text || "Không có câu ví dụ"}</span>
              {example.audio ? <><audio controls preload="none" src={example.audio.url}>Trình duyệt không hỗ trợ phát audio.</audio>
                <small>{example.audio.textMatch} · {example.audio.rightsStatus}</small></>
                : <small>Không có audio được chấp nhận khớp đúng câu này. Audio câu khác không phát cạnh ví dụ này.</small>}
            </li>)}</ul> : <p className="dev-sense-media__fallback">Sense chưa có câu ví dụ để ghép audio.</p>}
          </section>
        </div>
        <p className="dev-sense-media__notice">{data.rightsNotice} Include proposed chỉ hiển thị ứng viên đã khớp target identity, content hash và snapshot hiện tại; thao tác này không lưu review decision. {includeProposed ? "Các mapping đề xuất không chuyển thành Accepted." : ""}</p>
        <a className="dev-sense-media__review-link" href={reviewHref}>Mở Media Review cho “{headword}”</a>
      </> : null}
    </section>
  );
}
