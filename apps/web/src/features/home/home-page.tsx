import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import type {
  ActivitySummaryResponse,
  ContinueLearningCandidate,
  GamificationResponse,
  LearnerDto,
  LearnerLearningSetDto,
  ProgressHistoryResponse,
  ProgressSummaryResponse,
  ReviewQueueResponse
} from "@vocabflow/contracts";
import { authClient } from "../auth/auth-client";
import { useActiveLearner } from "../learners/learner-context-hook";
import { requestActivitySummary } from "../learners/activity-summary-client";
import { requestContinueLearningSummary } from "./continue-learning-client";
import { requestGamification } from "../learners/gamification-client";
import { requestProgressHistory } from "../learners/progress-insights-client";
import { requestProgressSummary } from "../learners/progress-summary-client";
import { requestReviewQueue } from "../study/review-queue-client";
import { requestLearnerLearningSets } from "../learning-sets/learning-sets-client";
import {
  ContinueLearningCard,
  DailyGoalCard,
  DailyStudyHero,
  DashboardErrorNotice,
  HomeDashboardHeader,
  HomeSessionError,
  HomeSessionLoading,
  LearningSetsCard,
  QuickStats,
  RecentActivityCard,
  WeeklyProgressCard
} from "./home-dashboard-components";
import type { HomeResource } from "./home-dashboard-components";

function dateMinus(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function HomeDashboard({ learner, parentName }: { learner: LearnerDto; parentName: string }) {
  const [retryIndex, setRetryIndex] = useState(0);
  const [continueRetryIndex, setContinueRetryIndex] = useState(0);
  const [queue, setQueue] = useState<HomeResource<ReviewQueueResponse>>({ status: "loading" });
  const [continueLearning, setContinueLearning] = useState<HomeResource<ContinueLearningCandidate | null>>({ status: "loading" });
  const [summary, setSummary] = useState<HomeResource<ProgressSummaryResponse>>({ status: "loading" });
  const [activity, setActivity] = useState<HomeResource<ActivitySummaryResponse>>({ status: "loading" });
  const [gamification, setGamification] = useState<HomeResource<GamificationResponse>>({ status: "loading" });
  const [learningSets, setLearningSets] = useState<HomeResource<LearnerLearningSetDto[]>>({ status: "loading" });
  const [history, setHistory] = useState<HomeResource<ProgressHistoryResponse>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void requestContinueLearningSummary(learner.id)
      .then(({ candidate }) => { if (!cancelled) setContinueLearning({ status: "ready", data: candidate }); })
      .catch(() => { if (!cancelled) setContinueLearning({ status: "error" }); });
    return () => { cancelled = true; };
  }, [learner.id, continueRetryIndex]);

  useEffect(() => {
    let cancelled = false;
    const load = async <T,>(request: () => Promise<T>, update: (resource: HomeResource<T>) => void) => {
      try {
        const data = await request();
        if (!cancelled) update({ status: "ready", data });
      } catch {
        if (!cancelled) update({ status: "error" });
      }
    };

    void load(() => requestReviewQueue(learner.id), setQueue);
    void load(() => requestProgressSummary(learner.id), setSummary);
    void load(() => requestGamification(learner.id), setGamification);
    void load(() => requestLearnerLearningSets(learner.id), setLearningSets);
    void (async () => {
      try {
        const activityData = await requestActivitySummary(learner.id);
        if (cancelled) return;
        setActivity({ status: "ready", data: activityData });

        try {
          const activityDate = activityData.localDate;
          const historyData = await requestProgressHistory(learner.id, dateMinus(activityDate, 6), activityDate);
          if (!cancelled) setHistory({ status: "ready", data: historyData });
        } catch {
          if (!cancelled) setHistory({ status: "error" });
        }
      } catch {
        if (cancelled) return;
        setActivity({ status: "error" });
        setHistory({ status: "error" });
      }
    })();

    return () => { cancelled = true; };
  }, [learner.id, retryIndex]);

  const hasError = [queue, summary, activity, gamification, learningSets, history].some((resource) => resource.status === "error");
  function retryContinueLearning() {
    setContinueLearning({ status: "loading" });
    setContinueRetryIndex((index) => index + 1);
  }
  function retryDashboard() {
    setQueue({ status: "loading" });
    setContinueLearning({ status: "loading" });
    setSummary({ status: "loading" });
    setActivity({ status: "loading" });
    setGamification({ status: "loading" });
    setLearningSets({ status: "loading" });
    setHistory({ status: "loading" });
    setContinueRetryIndex((index) => index + 1);
    setRetryIndex((index) => index + 1);
  }
  const learnerLevel = gamification.status === "ready" ? gamification.data.xp.level : null;
  return (
    <>
      <HomeDashboardHeader parentName={parentName} learner={learner} level={learnerLevel} />
      <main className="home-dashboard" aria-label={`Trang chủ học tập của ${learner.displayName}`}>
        {hasError ? <DashboardErrorNotice onRetry={retryDashboard} /> : null}
        <DailyStudyHero queue={queue} activity={activity} />
        <QuickStats queue={queue} summary={summary} activity={activity} />
        <div className="home-dashboard-grid">
          <div className="home-dashboard-column">
            <DailyGoalCard activity={activity} onRetry={retryDashboard} />
            <ContinueLearningCard queue={queue} continuation={continueLearning} onRetry={retryContinueLearning} />
            <WeeklyProgressCard resource={history} />
          </div>
          <div className="home-dashboard-column">
            <LearningSetsCard learnerName={learner.displayName} resource={learningSets} />
            <RecentActivityCard resource={history} />
          </div>
        </div>
      </main>
    </>
  );
}

export function HomePage() {
  const sessionState = authClient.useSession();
  const { activeLearner } = useActiveLearner();
  if (sessionState.isPending) return <HomeSessionLoading />;
  if (sessionState.error) return <HomeSessionError onRetry={() => void sessionState.refetch()} />;
  if (!sessionState.data?.user?.id) return <Navigate to="/login" replace />;
  if (!activeLearner) return <Navigate to="/learners" replace state={{ returnTo: "/" }} />;
  const parentName = typeof sessionState.data.user.name === "string" ? sessionState.data.user.name.trim() : "";
  return <HomeDashboard key={activeLearner.id} learner={activeLearner} parentName={parentName} />;
}
