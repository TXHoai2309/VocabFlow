import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { FoundationAttempt, FoundationQueue, FoundationReviewRequest, FoundationReviewResponse } from "@vocabflow/contracts";
import { FoundationSetupPage, FoundationStudyPage } from "./foundation-page";
import { FoundationClientError, foundationAttempt, foundationCatalog, foundationQueue, foundationReveal, foundationReview, foundationReviewRequest } from "./foundation-client";

vi.mock("../learners/learner-context-hook", () => ({ useActiveLearner: () => ({ activeLearner: { id: "test-account" } }) }));
vi.mock("./foundation-client", async original => ({ ...await original<typeof import("./foundation-client")>(), foundationCatalog: vi.fn(), foundationQueue: vi.fn(), foundationAttempt: vi.fn(), foundationReveal: vi.fn(), foundationReview: vi.fn(), foundationReviewRequest: vi.fn() }));
const id = "00000000-0000-4000-8000-000000000001";
const pins = { targetRevision: 1, presentationRevision: 1, pronunciationRevision: null };
const fresh = { revision: 0, state: { status: "NEW" as const, consecutiveCorrect: 0 as const, intervalDays: 0 as const, firstLearnedDate: null, lastReviewedDate: null, nextReviewDate: null, totalCorrect: 0 as const, totalIncorrect: 0 as const } };
const queue: FoundationQueue = { collection: "utterances-all", date: "2026-10-30", unavailableCount: 0, items: [{ targetId: id, itemType: "UTTERANCE", kind: "UTTERANCE", context: "Hai bạn gặp nhau trước lớp.", pins, progress: fresh, audioAvailable: true, listeningReady: false }] };
const attempt: FoundationAttempt = { attemptRef: "00000000-0000-4000-8000-000000000002", targetId: id, itemType: "UTTERANCE", pins, expectedRevision: 0, instruction: "Thử nhớ một câu phù hợp.", audioUrl: null, options: [] };
const request: FoundationReviewRequest = { reviewId: "00000000-0000-4000-8000-000000000003", attemptRef: attempt.attemptRef, pins, expectedRevision: 0, answer: { kind: "SELF_RECALL", result: "REMEMBERED" } };
const saved: FoundationReviewResponse = { reviewId: request.reviewId, targetId: id, itemType: "UTTERANCE", date: "2026-10-30", result: "REMEMBERED", progress: { revision: 1, state: { status: "LEARNING", consecutiveCorrect: 1, intervalDays: 1, firstLearnedDate: "2026-10-30", lastReviewedDate: "2026-10-30", nextReviewDate: "2026-10-31", totalCorrect: 1, totalIncorrect: 0 } } };
function session() { return render(<MemoryRouter initialEntries={["/foundation/study?collection=utterances-all&capacity=5&mode=mixed"]}><FoundationStudyPage /></MemoryRouter>); }
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(foundationQueue).mockResolvedValue(queue);
  vi.mocked(foundationAttempt).mockResolvedValue(attempt);
  vi.mocked(foundationReveal).mockResolvedValue({ targetId: id, title: "Chào bạn mới", textEn: "Hello.", translationVi: "Chào bạn.", explanation: "Một lời chào ngắn.", audioUrl: "/api/public/foundation/attempts/opaque/audio", audioReview: "PENDING" });
  vi.mocked(foundationReviewRequest).mockReturnValue(request);
  vi.mocked(foundationReview).mockResolvedValue(saved);
});
describe("foundation learner flow", () => {
  it("keeps context first; reveal/audio alone never record a review", async () => {
    const { container } = session();
    await screen.findByText("Hai bạn gặp nhau trước lớp.");
    expect(screen.queryByText("Hello.")).not.toBeInTheDocument(); expect(container.querySelector("audio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem câu gợi ý" }));
    await screen.findByText("Hello."); expect(foundationReview).not.toHaveBeenCalled();
    expect(screen.getByText("Audio nghe thử, đang chờ duyệt.")).toBeInTheDocument();
    expect(container.querySelector("audio")?.getAttribute("src")).toContain("/opaque/audio");
  });
  it("does not advance on failed save, preserves reviewId for retry, then advances only after save", async () => {
    vi.mocked(foundationReview).mockRejectedValueOnce(new FoundationClientError("GUEST_STORAGE_UNAVAILABLE"));
    session(); fireEvent.click(await screen.findByRole("button", { name: "Xem câu gợi ý" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đã nhớ" }));
    await screen.findByRole("button", { name: "Thử lại lưu kết quả" });
    expect(screen.queryByRole("button", { name: "Tiếp tục" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đã nhớ" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại lưu kết quả" }));
    await screen.findByText("Đã lưu: đã nhớ.");
    expect(vi.mocked(foundationReview).mock.calls[0][1]).toEqual(vi.mocked(foundationReview).mock.calls[1][1]);
    expect(foundationReviewRequest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await screen.findByRole("heading", { name: "Đã hoàn tất buổi học" });
  });
  it("blocks duplicate submissions while the server is saving", async () => {
    let finish!: (value: FoundationReviewResponse) => void;
    vi.mocked(foundationReview).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    session();fireEvent.click(await screen.findByRole("button", { name: "Xem câu gợi ý" }));
    const remember = await screen.findByRole("button", { name: "Đã nhớ" });fireEvent.click(remember);fireEvent.click(remember);
    expect(foundationReview).toHaveBeenCalledTimes(1);expect(remember).toBeDisabled();
    finish(saved);await screen.findByText("Đã lưu: đã nhớ.");
  });
  it("keeps missing sound scope empty and labels practice without grading", async () => {
    vi.mocked(foundationQueue).mockResolvedValueOnce({ ...queue, items: [], unavailableCount: 6 });
    const view = session();await screen.findByText("Chưa có bài phù hợp cho buổi này");expect(foundationAttempt).not.toHaveBeenCalled();view.unmount();
    vi.mocked(foundationQueue).mockResolvedValueOnce({ ...queue, items: [{ ...queue.items[0], itemType: "LETTER_ACTIVITY", kind: "LETTER_NAME", context: null }] });
    vi.mocked(foundationAttempt).mockResolvedValueOnce({ ...attempt, itemType: "LETTER_ACTIVITY" });
    session();fireEvent.click(await screen.findByRole("button", { name: "Xem chữ và nghe mẫu" }));
    await screen.findByText("Đây là lượt làm quen, không chấm điểm nghe.");
    expect(screen.queryByRole("button", { name: "Đã nhớ" })).not.toBeInTheDocument();expect(foundationReview).not.toHaveBeenCalled();
  });
  it("uses existing quantity choices and refuses incompatible school-grade query", async () => {
    vi.mocked(foundationCatalog).mockResolvedValue({ collections: [{ code: "letter-names", title: "Tên chữ", module: "letters", total: 6, mediaReady: 6, listeningReady: 0 }], counts: { letters: 6, activities: 12, utterances: 12 } });
    const view = render(<MemoryRouter initialEntries={["/foundation/learn?module=letters"]}><FoundationSetupPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Bắt đầu học" });
    for(const count of [5,10,20,30])expect(screen.getByRole("button",{name:`${count} hoạt động`})).toBeInTheDocument();
    expect(screen.getByLabelText("Nội dung học")).toBeInTheDocument();view.unmount();
    render(<MemoryRouter initialEntries={["/foundation/learn?module=letters&level=GRADE_1"]}><FoundationSetupPage /></MemoryRouter>);
    await waitFor(()=>expect(screen.getByText("Bộ học không phù hợp với lựa chọn này")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Bắt đầu học" })).not.toBeInTheDocument();
  });
});
