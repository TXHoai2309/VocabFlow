import { useEffect, useState } from "react";
import { cefrFilterValues, fishGameConfigSchema, learningLevelLabel, type FishGameConfig, type LearningSetSummary, type PracticeSource } from "@vocabflow/contracts";
import { ErrorState } from "../../components/async-states";
import { requestPracticeSets } from "../practice/practice-client";
export function GameSetup({ learnerId, disabled, onStart }: { learnerId: string; disabled: boolean; onStart: (config: FishGameConfig) => void }) {
  const [kind, setKind] = useState<PracticeSource["kind"]>("learned"), [level, setLevel] = useState(""), [setId, setSetId] = useState(0), [cue, setCue] = useState<FishGameConfig["cue"]>("image");
  const [sets, setSets] = useState<LearningSetSummary[] | null>(null), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { let cancelled = false; void requestPracticeSets(learnerId).then(sets => { if (!cancelled) setSets(sets); }).catch(() => { if (!cancelled) setFailed(true); }); return () => { cancelled = true; }; }, [learnerId, retry]);
  const source = kind === "set" ? { kind, setId, ...(level ? { cefr: level } : {}) } : { kind, ...(level ? { cefr: level } : {}) };
  const selected = fishGameConfigSchema.safeParse({ source, cue });
  return <section className="exercise-card"><h2>Thiết lập ván</h2><p>Dùng hết từ đã học, rồi từ chưa học trong chính nguồn này; sau đó trộn lại. Gõ đúng trong game không đánh dấu từ đã học.</p>
    <fieldset className="practice-setup" disabled={disabled}><legend className="sr-only">Nguồn và gợi ý game</legend>
      <label htmlFor="game-source">Nguồn game</label><select id="game-source" value={kind} onChange={event => { setKind(event.target.value as PracticeSource["kind"]); setLevel(""); }}><option value="learned">Từ đã học</option><option value="set">Bộ học</option><option value="level">Mức học</option><option value="saved">Từ đã lưu</option></select>
      {kind === "set" ? <><label htmlFor="game-set">Bộ học</label><select id="game-set" value={setId} disabled={!sets} onChange={event => setSetId(Number(event.target.value))}><option value={0}>Chọn bộ học</option>{sets?.map(set => <option key={set.id} value={set.id}>{set.name}</option>)}</select>{!sets && !failed ? <p role="status">Đang tải bộ học…</p> : null}</> : null}
      <label htmlFor="game-level">{kind === "level" ? "Mức học" : "Lọc thêm theo mức học"}</label><select id="game-level" value={level} onChange={event => setLevel(event.target.value)}><option value="">{kind === "level" ? "Chọn mức học" : "Không lọc thêm"}</option>{cefrFilterValues.map(value => <option value={value} key={value}>{learningLevelLabel(value)}</option>)}</select>
      <label htmlFor="game-cue">Gợi ý game</label><select id="game-cue" value={cue} onChange={event => setCue(event.target.value as FishGameConfig["cue"])}><option value="image">Ảnh</option><option value="audio">Nghe</option><option value="mixed">Kết hợp ảnh và nghe</option></select>
      <button className="button primary" disabled={!selected.success || (kind === "set" && (!sets || failed))} onClick={() => { if (selected.success) onStart(selected.data); }}>Bắt đầu ván</button>
    </fieldset>{kind === "set" && failed ? <ErrorState description="Chưa tải được bộ học. Thử lại hoặc chủ động chọn nguồn khác." onRetry={() => { setFailed(false); setRetry(value => value + 1); }} /> : null}
  </section>;
}
