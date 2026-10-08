import { useEffect, useId, useRef, useState } from "react";
import { LoadingState, ErrorState } from "../../components/async-states";
import { MAX_STUDY_SETS, type LearningSetSummary } from "@vocabflow/contracts";

export function LearningSetPickerDialog({ sets, selected, loading = false, error = false, onRetry, onCancel, onApply }: {
  sets: LearningSetSummary[]; loading?: boolean; error?: boolean; onRetry?: () => void; selected: number[]; onCancel: () => void; onApply: (ids: number[]) => void;
}) {
  const [draft, setDraft] = useState(selected);
  const [search, setSearch] = useState("");
  const title = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0 && document.documentElement.clientWidth > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight || "0") + scrollbar}px`;
    document.body.style.overflow = "hidden";
    if (input.current && !input.current.disabled) input.current.focus({ preventScroll: true }); else dialog.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; document.body.style.paddingRight = padding; if (previous?.isConnected) previous.focus({ preventScroll: true }); else document.getElementById("study-source")?.focus({ preventScroll: true }); };
  }, []);
  const validDraft = draft.filter((id) => sets.some((set) => set.id === id));
  return <div className="learning-set-picker-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <div ref={dialog} className="learning-set-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={title} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel(); }
      if (event.key === "Tab") {
        const controls = dialog.current?.querySelectorAll<HTMLElement>('input:not([disabled]),button:not([disabled])');
        if (!controls?.length) return;
        const first = controls[0]!; const last = controls[controls.length - 1]!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus({ preventScroll: true }); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus({ preventScroll: true }); }
      }
    }}>
      <header><h2 id={title}>Chọn bộ từ</h2><button type="button" aria-label="Đóng chọn bộ từ" onClick={onCancel}>×</button><p>Chọn một hoặc nhiều bộ từ để học.</p></header>
      <label className="learning-set-picker-search">Tìm bộ từ...<input ref={input} type="search" placeholder="Tìm bộ từ..." value={search} disabled={loading || error} onChange={(event) => setSearch(event.target.value)} /></label>
      <div className="learning-set-picker-list">
        {loading ? <LoadingState label="Đang tải bộ từ…" pattern="rows" /> : error ? <ErrorState title="Không thể tải bộ từ" description="Vui lòng thử lại." onRetry={onRetry} /> : null}
        {sets.filter((set) => set.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))).map((set) => <label key={set.id} className={`learning-set-picker-row${draft.includes(set.id) ? " is-selected" : ""}`}>
          <input type="checkbox" aria-label={set.name} checked={draft.includes(set.id)} disabled={!draft.includes(set.id) && draft.length >= MAX_STUDY_SETS} onChange={(event) => setDraft((ids) => event.target.checked ? [...ids, set.id] : ids.filter((id) => id !== set.id))} />
          <strong>{set.name}</strong><span>{set.vocabularyCount} từ</span>
        </label>)}
        {!loading && !error && !sets.some((set) => set.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))) ? <p>Không tìm thấy bộ từ.</p> : null}
      </div>
      <footer>{!loading && !error && validDraft.length === 0 ? <p role="status">Chọn ít nhất một bộ từ.</p> : null}<div><button type="button" onClick={onCancel}>Hủy</button><button className="is-primary" type="button" disabled={loading || error || validDraft.length === 0} onClick={() => onApply([...validDraft].sort((a, b) => a - b))}>Áp dụng ({validDraft.length})</button></div></footer>
    </div>
  </div>;
}
