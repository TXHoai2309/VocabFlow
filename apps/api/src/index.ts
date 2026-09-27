import { Hono } from "hono";
import type { RuntimeBindings } from "./runtime-bindings";
import {
  errorEnvelope,
  vocabularyLevelSchema,
  type HouseholdBootstrapResponse,
  type VocabularyLevel
} from "@vocabflow/contracts";
import { createAuth } from "./auth";
import { createBootstrapService, type BootstrapService } from "./bootstrap";
import { createLearnerService, LearnerServiceError, type LearnerService } from "./learners";
import {
  createLearnerSettingsService,
  LearnerSettingsServiceError,
  type LearnerSettingsService
} from "./learner-settings";
import { createVocabularyService, VocabularyServiceError, type VocabularyService } from "./vocabulary";
import { createTopicService, TopicServiceError, type TopicService } from "./topics";
import { createLearningSetService, LearningSetServiceError, type LearningSetService } from "./learning-sets";
import { createReviewService, ReviewServiceError, type ReviewService } from "./reviews";
import { createReviewQueueService, ReviewQueueServiceError, type ReviewQueueService } from "./review-queue";
import { createProgressSummaryService, ProgressSummaryServiceError, type ProgressSummaryService } from "./progress-summary";
import { createActivitySummaryService, ActivitySummaryServiceError, type ActivitySummaryService } from "./activity-summary";
import {
  createProgressHistoryService,
  ProgressHistoryServiceError,
  type ProgressHistoryService
} from "./progress-history";
import { createTopicProgressService, TopicProgressServiceError, type TopicProgressService } from "./topic-progress";
import { createGamificationService, GamificationServiceError, type GamificationService } from "./gamification";
import { createLearnerVocabularyService, LearnerVocabularyServiceError, type LearnerVocabularyService } from "./learner-vocabulary";
import {
  createResetLearnerProgressService,
  ResetLearnerProgressServiceError,
  type ResetLearnerProgressService
} from "./reset-learner-progress";

type AuthenticatedSession = { user: { id: string } };
type SessionReader = (request: Request, env: RuntimeBindings) => Promise<AuthenticatedSession | null>;
type BootstrapRunner = (userId: string, env: RuntimeBindings) => Promise<HouseholdBootstrapResponse["household"]>;
type AuthRequestHandler = (request: Request, env: RuntimeBindings) => Promise<Response>;

export type AppDependencies = {
  authRequestHandler?: AuthRequestHandler;
  readSession?: SessionReader;
  bootstrap?: BootstrapRunner;
  learnerService?: LearnerService;
  learnerSettingsService?: LearnerSettingsService;
  vocabularyService?: VocabularyService;
  topicService?: TopicService;
  learningSetService?: LearningSetService;
  reviewService?: ReviewService;
  reviewQueueService?: ReviewQueueService;
  progressSummaryService?: ProgressSummaryService;
  activitySummaryService?: ActivitySummaryService;
  progressHistoryService?: ProgressHistoryService;
  topicProgressService?: TopicProgressService;
  gamificationService?: GamificationService;
  learnerVocabularyService?: LearnerVocabularyService;
  resetLearnerProgressService?: ResetLearnerProgressService;
};

const SAFE_BOOTSTRAP_ERROR = "Không thể hoàn tất thiết lập gia đình. Vui lòng thử lại.";

async function readAuthenticatedSession(request: Request, env: RuntimeBindings) {
  if (!env.DATABASE_URL || !env.BETTER_AUTH_SECRET) {
    throw new Error("AUTH_SERVICE_NOT_CONFIGURED");
  }
  const auth = createAuth(env.DATABASE_URL, env.BETTER_AUTH_SECRET, env);
  return auth.api.getSession({ headers: request.headers });
}

async function runBootstrap(userId: string, env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  const database = createHttpDatabase(env.DATABASE_URL);
  const service: BootstrapService = createBootstrapService(database);
  return service.ensureDefaultHousehold(userId);
}

async function runLearnerService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerService(createHttpDatabase(env.DATABASE_URL));
}

async function runVocabularyService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createVocabularyService(createHttpDatabase(env.DATABASE_URL));
}

async function runReviewService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createReviewService(createHttpDatabase(env.DATABASE_URL));
}

async function runReviewQueueService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createReviewQueueService(createHttpDatabase(env.DATABASE_URL));
}

async function runLearnerSettingsService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerSettingsService(createHttpDatabase(env.DATABASE_URL));
}

async function runTopicService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createTopicService(createHttpDatabase(env.DATABASE_URL));
}

async function runLearningSetService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearningSetService(createHttpDatabase(env.DATABASE_URL));
}

async function runProgressSummaryService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createProgressSummaryService(createHttpDatabase(env.DATABASE_URL));
}

async function runActivitySummaryService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createActivitySummaryService(createHttpDatabase(env.DATABASE_URL));
}

async function runProgressHistoryService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createProgressHistoryService(createHttpDatabase(env.DATABASE_URL));
}

async function runTopicProgressService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createTopicProgressService(createHttpDatabase(env.DATABASE_URL));
}

async function runGamificationService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createGamificationService(createHttpDatabase(env.DATABASE_URL));
}

async function runLearnerVocabularyService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerVocabularyService(createHttpDatabase(env.DATABASE_URL));
}

async function runResetLearnerProgressService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createResetLearnerProgressService(createHttpDatabase(env.DATABASE_URL));
}

function parseVocabularyLevelQuery(request: Request): VocabularyLevel | undefined | null {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  if (keys.length === 0) return undefined;
  if (keys.length !== 1 || keys[0] !== "level") return null;
  const parsed = vocabularyLevelSchema.safeParse(params.get("level"));
  return parsed.success ? parsed.data : null;
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseProgressHistoryQuery(request: Request): { from: string; to: string } | null {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].length !== 2) return null;
  const from = params.get("from");
  const to = params.get("to");
  return from !== null && to !== null ? { from, to } : null;
}

export function createApp(dependencies: AppDependencies = {}) {
  const readSession = dependencies.readSession ?? readAuthenticatedSession;
  const bootstrap = dependencies.bootstrap ?? runBootstrap;
  const application = new Hono<{ Bindings: RuntimeBindings }>();

  application.get("/api/health", (c) => c.json({ status: "ok" }, 200));

  application.all("/api/auth/*", async (c) => {
    if (!c.env?.DATABASE_URL || !c.env.BETTER_AUTH_SECRET) {
      return c.json({ error: { code: "INTERNAL_ERROR", message: "Authentication service is not configured." } }, 503);
    }
    try {
      if (dependencies.authRequestHandler) {
        return await dependencies.authRequestHandler(c.req.raw, c.env);
      }
      const auth = createAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET, c.env);
      return await auth.handler(c.req.raw);
    } catch {
      return c.json({ error: { code: "INTERNAL_ERROR", message: "Authentication service is not configured." } }, 503);
    }
  });

  application.post("/api/bootstrap", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const household = await bootstrap(session.user.id, c.env);
      return c.json({ household }, 200);
    } catch {
      return c.json(errorEnvelope("INTERNAL_ERROR", SAFE_BOOTSTRAP_ERROR), 503);
    }
  });

  application.get("/api/learners", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const service = dependencies.learnerService ?? await runLearnerService(c.env);
      return c.json({ learners: await service.list(session.user.id) }, 200);
    } catch (error) {
      if (error instanceof LearnerServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập household này."
          : error.code === "LEARNER_DISPLAY_NAME_INVALID"
            ? "Tên learner không hợp lệ."
            : error.code === "INVALID_REQUEST"
              ? "Dữ liệu gửi lên không hợp lệ."
              : "Không thể tải learner lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải learner lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/vocabulary", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const level = parseVocabularyLevelQuery(c.req.raw);
      if (level === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.vocabularyService ?? await runVocabularyService(c.env);
      const vocabulary = level === undefined
        ? await service.list(session.user.id)
        : await service.list(session.user.id, level);
      return c.json({ vocabulary }, 200);
    } catch (error) {
      if (error instanceof VocabularyServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập household này."
          : "Không thể tải vocabulary lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải vocabulary lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.post("/api/learners", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      let payload: unknown;
      try {
        payload = await c.req.json();
      } catch {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learnerService ?? await runLearnerService(c.env);
      return c.json(await service.create(session.user.id, payload), 201);
    } catch (error) {
      if (error instanceof LearnerServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập household này."
          : error.code === "LEARNER_DISPLAY_NAME_INVALID"
            ? "Tên learner không hợp lệ."
            : error.code === "INVALID_REQUEST"
              ? "Dữ liệu gửi lên không hợp lệ."
              : "Không thể tạo learner lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tạo learner lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/settings", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learnerSettingsService ?? await runLearnerSettingsService(c.env);
      return c.json(await service.get(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof LearnerSettingsServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tải cài đặt learner lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải cài đặt learner lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.patch("/api/learners/:learnerId/settings", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      let payload: unknown;
      try {
        payload = await c.req.json();
      } catch {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learnerSettingsService ?? await runLearnerSettingsService(c.env);
      return c.json(await service.update(session.user.id, c.req.param("learnerId"), payload), 200);
    } catch (error) {
      if (error instanceof LearnerSettingsServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền thay đổi learner này."
          : error.code === "INVALID_REQUEST"
            ? "Giới hạn từ mới phải là số nguyên từ 0 đến 100."
            : "Không thể lưu cài đặt learner lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể lưu cài đặt learner lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learning-sets", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learningSetService ?? await runLearningSetService(c.env);
      return c.json({ learningSets: await service.list(session.user.id) }, 200);
    } catch (error) {
      if (error instanceof LearningSetServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập household này."
          : "Không thể tải learning set lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải learning set lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learning-sets/:learningSetId", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const learningSetId = parsePositiveInteger(c.req.param("learningSetId"));
      if (learningSetId === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learningSetService ?? await runLearningSetService(c.env);
      return c.json({ learningSet: await service.detail(session.user.id, learningSetId) }, 200);
    } catch (error) {
      if (error instanceof LearningSetServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập household này."
          : error.code === "LEARNING_SET_NOT_FOUND"
            ? "Learning set không khả dụng."
            : "Không thể tải learning set lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải learning set lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/learning-sets", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learningSetService ?? await runLearningSetService(c.env);
      return c.json({ learningSets: await service.listForLearner(session.user.id, c.req.param("learnerId")) }, 200);
    } catch (error) {
      if (error instanceof LearningSetServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tải learning set của learner lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải learning set của learner lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.put("/api/learners/:learnerId/learning-sets/:learningSetId", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const learningSetId = parsePositiveInteger(c.req.param("learningSetId"));
      if (learningSetId === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learningSetService ?? await runLearningSetService(c.env);
      return c.json(await service.assign(session.user.id, c.req.param("learnerId"), learningSetId), 200);
    } catch (error) {
      if (error instanceof LearningSetServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : error.code === "LEARNING_SET_NOT_FOUND"
            ? "Learning set không khả dụng."
            : "Không thể gán learning set lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể gán learning set lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.delete("/api/learners/:learnerId/learning-sets/:learningSetId", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const learningSetId = parsePositiveInteger(c.req.param("learningSetId"));
      if (learningSetId === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learningSetService ?? await runLearningSetService(c.env);
      return c.json(await service.unassign(session.user.id, c.req.param("learnerId"), learningSetId), 200);
    } catch (error) {
      if (error instanceof LearningSetServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : error.code === "LEARNING_SET_NOT_FOUND"
            ? "Learning set không khả dụng."
            : "Không thể bỏ gán learning set lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể bỏ gán learning set lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.post("/api/reviews", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      let payload: unknown;
      try {
        payload = await c.req.json();
      } catch {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.reviewService ?? await runReviewService(c.env);
      const result = await service.write(session.user.id, payload);
      return c.json(result.response, result.status);
    } catch (error) {
      if (error instanceof ReviewServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : error.code === "VOCABULARY_NOT_FOUND"
            ? "Vocabulary không khả dụng."
            : error.code === "IDEMPOTENCY_CONFLICT"
              ? "Review đã tồn tại với dữ liệu khác."
              : error.code === "STALE_REVISION"
                ? "Tiến trình đã thay đổi. Vui lòng tải lại."
                : error.code === "DAILY_NEW_LIMIT_REACHED"
                  ? "Learner đã đạt giới hạn từ mới hôm nay."
                : error.code === "INVALID_REQUEST"
                  ? "Dữ liệu gửi lên không hợp lệ."
                  : "Không thể lưu tiến trình lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message, error.details), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể lưu tiến trình lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/review-queue", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const service = dependencies.reviewQueueService ?? await runReviewQueueService(c.env);
      return c.json(await service.list(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof ReviewQueueServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tải review queue lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải review queue lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/topics", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.topicService ?? await runTopicService(c.env);
      return c.json({ topics: await service.list(session.user.id) }, 200);
    } catch (error) {
      if (error instanceof TopicServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập household này."
          : "Không thể tải topic lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải topic lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/topics/:topicId/vocabulary", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const topicId = parsePositiveInteger(c.req.param("topicId"));
      if (topicId === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.topicService ?? await runTopicService(c.env);
      return c.json({ vocabulary: await service.listVocabulary(session.user.id, topicId) }, 200);
    } catch (error) {
      if (error instanceof TopicServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập household này."
          : error.code === "TOPIC_NOT_FOUND"
            ? "Topic không khả dụng."
            : "Không thể tải vocabulary theo topic lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải vocabulary theo topic lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/progress-summary", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const service = dependencies.progressSummaryService ?? await runProgressSummaryService(c.env);
      return c.json(await service.get(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof ProgressSummaryServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tải tiến trình lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải tiến trình lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/activity-summary", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.activitySummaryService ?? await runActivitySummaryService(c.env);
      return c.json(await service.get(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof ActivitySummaryServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập hoạt động học của learner này."
          : "Không thể tải hoạt động học lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải hoạt động học lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/progress-history", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      const range = parseProgressHistoryQuery(c.req.raw);
      if (!range) return c.json(errorEnvelope("INVALID_REQUEST", "Khoảng ngày không hợp lệ."), 400);
      const service = dependencies.progressHistoryService ?? await runProgressHistoryService(c.env);
      return c.json(await service.get(session.user.id, c.req.param("learnerId"), range.from, range.to), 200);
    } catch (error) {
      if (error instanceof ProgressHistoryServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập tiến trình của learner này."
          : error.code === "INVALID_REQUEST"
            ? "Khoảng ngày không hợp lệ."
            : "Không thể tải lịch sử tiến trình lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải lịch sử tiến trình lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/topic-progress", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.topicProgressService ?? await runTopicProgressService(c.env);
      return c.json(await service.get(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof TopicProgressServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập tiến trình của learner này."
          : "Không thể tải tiến trình theo chủ đề lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải tiến trình theo chủ đề lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/gamification", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.gamificationService ?? await runGamificationService(c.env);
      return c.json(await service.get(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof GamificationServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập phần thưởng của learner này."
          : "Không thể tải phần thưởng lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải phần thưởng lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/vocabulary", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const level = parseVocabularyLevelQuery(c.req.raw);
      if (level === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learnerVocabularyService ?? await runLearnerVocabularyService(c.env);
      const vocabulary = level === undefined
        ? await service.list(session.user.id, c.req.param("learnerId"))
        : await service.list(session.user.id, c.req.param("learnerId"), level);
      return c.json({ vocabulary }, 200);
    } catch (error) {
      if (error instanceof LearnerVocabularyServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tải vocabulary lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải vocabulary lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.post("/api/learners/:learnerId/reset-progress", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const service = dependencies.resetLearnerProgressService ?? await runResetLearnerProgressService(c.env);
      return c.json(await service.reset(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof ResetLearnerProgressServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể reset tiến trình lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể reset tiến trình lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.notFound((c) => {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/")) {
      return c.json({ error: { code: "NOT_FOUND", message: "API route not found" } }, 404);
    }
    return c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
  });

  return application;
}

export const app = createApp();

export default app;
