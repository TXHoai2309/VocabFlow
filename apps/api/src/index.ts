import { Hono } from "hono";
import {
  errorEnvelope,
  vocabularyLevelSchema,
  type HouseholdBootstrapResponse,
  type VocabularyLevel
} from "@vocabflow/contracts";
import { createAuth } from "./auth";
import { createBootstrapService, type BootstrapService } from "./bootstrap";
import { createLearnerService, LearnerServiceError, type LearnerService } from "./learners";
import { createVocabularyService, VocabularyServiceError, type VocabularyService } from "./vocabulary";
import { createTopicService, TopicServiceError, type TopicService } from "./topics";
import { createReviewService, ReviewServiceError, type ReviewService } from "./reviews";
import { createReviewQueueService, ReviewQueueServiceError, type ReviewQueueService } from "./review-queue";
import { createProgressSummaryService, ProgressSummaryServiceError, type ProgressSummaryService } from "./progress-summary";
import { createLearnerVocabularyService, LearnerVocabularyServiceError, type LearnerVocabularyService } from "./learner-vocabulary";
import {
  createResetLearnerProgressService,
  ResetLearnerProgressServiceError,
  type ResetLearnerProgressService
} from "./reset-learner-progress";

export type WorkerBindings = {
  DATABASE_URL?: string;
  BETTER_AUTH_SECRET?: string;
};

type AuthenticatedSession = { user: { id: string } };
type SessionReader = (request: Request, env: WorkerBindings) => Promise<AuthenticatedSession | null>;
type BootstrapRunner = (userId: string, env: WorkerBindings) => Promise<HouseholdBootstrapResponse["household"]>;

export type AppDependencies = {
  readSession?: SessionReader;
  bootstrap?: BootstrapRunner;
  learnerService?: LearnerService;
  vocabularyService?: VocabularyService;
  topicService?: TopicService;
  reviewService?: ReviewService;
  reviewQueueService?: ReviewQueueService;
  progressSummaryService?: ProgressSummaryService;
  learnerVocabularyService?: LearnerVocabularyService;
  resetLearnerProgressService?: ResetLearnerProgressService;
};

const SAFE_BOOTSTRAP_ERROR = "Không thể hoàn tất thiết lập gia đình. Vui lòng thử lại.";

async function readAuthenticatedSession(request: Request, env: WorkerBindings) {
  if (!env.DATABASE_URL || !env.BETTER_AUTH_SECRET) {
    throw new Error("AUTH_SERVICE_NOT_CONFIGURED");
  }
  const auth = createAuth(env.DATABASE_URL, env.BETTER_AUTH_SECRET);
  return auth.api.getSession({ headers: request.headers });
}

async function runBootstrap(userId: string, env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  const database = createHttpDatabase(env.DATABASE_URL);
  const service: BootstrapService = createBootstrapService(database);
  return service.ensureDefaultHousehold(userId);
}

async function runLearnerService(env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerService(createHttpDatabase(env.DATABASE_URL));
}

async function runVocabularyService(env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createVocabularyService(createHttpDatabase(env.DATABASE_URL));
}

async function runReviewService(env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createReviewService(createHttpDatabase(env.DATABASE_URL));
}

async function runReviewQueueService(env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createReviewQueueService(createHttpDatabase(env.DATABASE_URL));
}

async function runTopicService(env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createTopicService(createHttpDatabase(env.DATABASE_URL));
}

async function runProgressSummaryService(env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createProgressSummaryService(createHttpDatabase(env.DATABASE_URL));
}

async function runLearnerVocabularyService(env: WorkerBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerVocabularyService(createHttpDatabase(env.DATABASE_URL));
}

async function runResetLearnerProgressService(env: WorkerBindings) {
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

export function createApp(dependencies: AppDependencies = {}) {
  const readSession = dependencies.readSession ?? readAuthenticatedSession;
  const bootstrap = dependencies.bootstrap ?? runBootstrap;
  const application = new Hono<{ Bindings: WorkerBindings }>();

  application.get("/api/health", (c) => c.json({ status: "ok" }, 200));

  application.all("/api/auth/*", async (c) => {
    if (!c.env?.DATABASE_URL || !c.env.BETTER_AUTH_SECRET) {
      return c.json({ error: { code: "INTERNAL_ERROR", message: "Authentication service is not configured." } }, 503);
    }
    const auth = createAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET);
    return auth.handler(c.req.raw);
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
