import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { learningLevelLabel, type FishGameHistory, type FishGameResults, type FishGameConfig } from "@vocabflow/contracts";
import { EmptyState, ErrorState, LoadingState } from "../../components/async-states";
import { useActiveLearner } from "../learners/learner-context-hook";
import { GUEST_ID } from "../guest/guest-store";
import { requestGameHistory, requestGameResults } from "./game-client";
const statuses = { active: "Đang dở", "paused-content": "Đang dở · tạm dừng vì media", lost: "Hết tim", ended: "Đã kết thúc" };
const outcomes = { correct: "Bắt được cá", incorrect: "Sai", revealed: "Đã xem đáp án", skipped: "Bỏ qua chủ động", technical: "Lỗi media · không mất tim" };
const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
const positive = (value: string | null) => { const number = Number(value); return Number.isSafeInteger(number) && number > 0 && number <= 100000 ? number : 1; };
function conditions(config: FishGameConfig, version: number) {
  const source = config.source;
  return `${source.kind === "learned" ? "Từ đã học" : source.kind === "saved" ? "Từ đã lưu" : source.kind === "set" ? `Bộ học #${source.setId}` : "Mức học"}${source.cefr ? ` · ${learningLevelLabel(source.cefr)}` : ""} · ${config.cue === "image" ? "Ảnh" : config.cue === "audio" ? "Nghe" : "Kết hợp"} · Luật v${version}`;
}
function HistoryWorkspace({ learnerId, userId }: { learnerId: string; userId: string }) {
  const [params, setParams] = useSearchParams(), [retry, setRetry] = useState(0); const page = positive(params.get("page")), recordsPage = positive(params.get("recordsPage"));
  const key = `${page}:${recordsPage}:${retry}`;
  const [resource, setResource] = useState<{ key: string; data?: FishGameHistory; error?: boolean }>({ key: "" });
  const [selected, setSelected] = useState<{ id: string; page: number } | null>(null), [detailRetry, setDetailRetry] = useState(0);
  const detailKey = `${selected?.id}:${selected?.page}:${detailRetry}`;
  const [detailResource, setDetailResource] = useState<{ key: string; data?: FishGameResults; error?: boolean }>({ key: "" });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { document.title = "Lịch sử game · VocabFlow"; }, []);
  useEffect(() => { let cancelled = false; void requestGameHistory(learnerId, page, recordsPage).then(data => { if (!cancelled) setResource({ key, data }); }).catch(() => { if (!cancelled) setResource({ key, error: true }); }); return () => { cancelled = true; }; }, [key, learnerId, page, recordsPage]);
  useEffect(() => {
    if (!selected) return; let cancelled = false;
    void requestGameResults(learnerId, selected.id, selected.page).then(data => { if (!cancelled) { setDetailResource({ key: detailKey, data }); requestAnimationFrame(() => heading.current?.focus()); } }).catch(() => { if (!cancelled) setDetailResource({ key: detailKey, error: true }); });
    return () => { cancelled = true; };
  }, [detailKey, learnerId, selected]);
  const data = resource.key === key ? resource.data : undefined, failed = resource.key === key && resource.error;
  const detail = detailResource.key === detailKey ? detailResource.data : undefined, detailFailed = detailResource.key === detailKey && detailResource.error;
  function paging(name: "page" | "recordsPage", value: number) { const next = new URLSearchParams(params); next.set(name, String(value)); setParams(next); }
  return <main className="study-setup-page" aria-labelledby="game-history-title"><header className="study-setup-header"><Link className="button secondary" to="/game">Về game</Link><h1 id="game-history-title">Lịch sử game</h1><p>{userId === GUEST_ID ? "Dữ liệu khách trên trình duyệt này; không tự nhập vào tài khoản." : "Lịch sử riêng của tài khoản."} Điểm game không đánh giá mức nhớ từ và không thay lịch ôn hay XP.</p></header>
    {failed ? <ErrorState description="Không tải được lịch sử game. Dữ liệu đã lưu được giữ nguyên." onRetry={() => setRetry(value => value + 1)} /> : !data ? <LoadingState pattern="rows" label="Đang tải lịch sử game" /> : <>
      <section className="exercise-card"><h2>Kỷ lục cá nhân</h2><p>Chỉ ván đã kết thúc; mỗi nguồn, bộ/mức, gợi ý và phiên bản luật có kỷ lục riêng.</p>
        {!data.records.length ? <EmptyState title="Chưa có kỷ lục trong trang này" description="Ván đang dở hoặc tạm dừng chưa được tính là kết quả cuối." /> : <ul className="practice-history-list">{data.records.map(record => <li key={record.bestGameId}><strong>{record.bestScore} điểm</strong><span>{conditions(record.config, record.rulesVersion)}</span><span>{record.finalizedGames} ván đã kết thúc</span><button className="button secondary" onClick={() => setSelected({ id: record.bestGameId, page: 1 })}>Xem ván kỷ lục</button></li>)}</ul>}
        <nav className="practice-actions" aria-label="Phân trang kỷ lục"><button className="button secondary" disabled={recordsPage <= 1} onClick={() => paging("recordsPage", recordsPage - 1)}>Kỷ lục trước</button><span>{data.totalRecords} nhóm · Trang {recordsPage}</span><button className="button secondary" disabled={recordsPage * 20 >= data.totalRecords} onClick={() => paging("recordsPage", recordsPage + 1)}>Kỷ lục tiếp</button></nav>
      </section>
      <section className="exercise-card"><h2>Các ván game</h2>{!data.items.length ? <EmptyState title="Chưa có ván trong trang này" description="Bắt đầu một ván game hoặc quay về trang trước." /> : <ul className="practice-history-list">{data.items.map(game => <li key={game.gameId}><strong>{date(game.createdAt)} · {statuses[game.status]}</strong><span>{conditions(game.config, game.rulesVersion)}</span><span>{game.score} điểm · {game.summary.correct} cá đã bắt · {game.hearts}/5 tim</span><span>Sai {game.summary.incorrect} · Đã xem {game.summary.revealed} · Bỏ qua {game.summary.skipped} · Lỗi media {game.summary.technical}</span><button className="button secondary" aria-controls="game-history-detail" aria-expanded={selected?.id === game.gameId} onClick={() => setSelected({ id: game.gameId, page: 1 })}>Xem kết quả ván</button></li>)}</ul>}
        <nav className="practice-actions" aria-label="Phân trang ván"><button className="button secondary" disabled={page <= 1} onClick={() => paging("page", page - 1)}>Ván trước</button><span>{data.totalGames} ván · Trang {page}</span><button className="button secondary" disabled={page * 20 >= data.totalGames} onClick={() => paging("page", page + 1)}>Ván tiếp</button></nav>
      </section>
    </>}
    <section id="game-history-detail">{!selected ? null : detailFailed ? <ErrorState description="Chưa tải được các mục đã giải quyết." onRetry={() => setDetailRetry(value => value + 1)} /> : !detail ? <LoadingState pattern="rows" label="Đang tải kết quả ván" /> : <section className="exercise-card"><h2 tabIndex={-1} ref={heading}>Các mục đã giải quyết</h2><p>{conditions(detail.game.config, detail.game.rulesVersion)} · {statuses[detail.game.status]}</p>{!detail.items.length ? <p>Chưa có mục đã giải quyết trong trang này.</p> : <ul className="practice-history-list">{detail.items.map(item => <li key={item.questionId}><strong>{item.word}</strong><span>{outcomes[item.outcome]} · {item.cueKind === "image" ? "Ảnh" : "Nghe"}{item.submitted ? ` · Bạn gõ: ${item.submitted}` : ""}</span></li>)}</ul>}
      <nav className="practice-actions" aria-label="Phân trang mục game"><button className="button secondary" disabled={detail.page <= 1} onClick={() => setSelected({ ...selected, page: detail.page - 1 })}>Mục trước</button><span>{detail.totalResolved} mục · Trang {detail.page}</span><button className="button secondary" disabled={detail.page * 20 >= detail.totalResolved} onClick={() => setSelected({ ...selected, page: detail.page + 1 })}>Mục tiếp</button></nav>
    </section>}</section>
  </main>;
}
export function GameHistoryPage() { const { activeLearner, userId } = useActiveLearner(); if (!activeLearner || !userId) return null; return <HistoryWorkspace key={`${userId}:${activeLearner.id}`} learnerId={activeLearner.id} userId={userId} />; }
