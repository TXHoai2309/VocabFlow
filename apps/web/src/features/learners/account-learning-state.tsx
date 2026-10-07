import { ErrorState, LoadingState } from "../../components/async-states";
import { useActiveLearner } from "./learner-context-hook";

export function AccountLearningState() {
  const { status, error, retry } = useActiveLearner();
  return <main className="home-session-state">
    {status === "error"
      ? <ErrorState title="Không thể mở dữ liệu học tập" description={error ?? "Vui lòng thử lại."} onRetry={retry} />
      : <LoadingState label="Đang chuẩn bị học tập…" pattern="dashboard" />}
  </main>;
}
