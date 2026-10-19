import { readPublicLearningIndex } from "./public-learning-index";
import { readPublicVocabularyBrowse, readPublicVocabularyMatchIds } from "./learner-vocabulary-browse";
import { readPublicVocabulary } from "./vocabulary";
import { PUBLIC_VOCABULARY_BATCH_LIMIT, publicVocabularyBrowseQuerySchema, type PublicLearningIndex, type PublicVocabularyBrowseQuery, type LearnerVocabularyBrowseResponse, type VocabularyDto } from "@vocabflow/contracts";
import { readPublicLearningCatalog } from "./public-learning-catalog";
import type { PublicLearningCatalog } from "@vocabflow/contracts";
import { parseStudySetIds, positiveStudyId, parseStudyQueueCapacity, learnerVocabularyBrowseQuerySchema } from "@vocabflow/contracts";
import { Hono } from "hono";
import { performance } from "node:perf_hooks";
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
import {
  createReviewQueueService,
  renderReviewQueueServerTiming,
  ReviewQueueServiceError,
  type ReviewQueueService,
  type ReviewQueueTimings,
  type ReviewQueueScope
} from "./review-queue";
import { createProgressSummaryService, ProgressSummaryServiceError, type ProgressSummaryService } from "./progress-summary";
import { createActivitySummaryService, ActivitySummaryServiceError, type ActivitySummaryService } from "./activity-summary";
import {
  createProgressHistoryService,
  ProgressHistoryServiceError,
  type ProgressHistoryService
} from "./progress-history";
import { createTopicProgressService, TopicProgressServiceError, type TopicProgressService } from "./topic-progress";
import {
  createContinueLearningService,
  ContinueLearningServiceError,
  type ContinueLearningService
} from "./continue-learning";
import { createGamificationService, GamificationServiceError, type GamificationService } from "./gamification";
import { createLearnerVocabularyService, LearnerVocabularyServiceError, type LearnerVocabularyService } from "./learner-vocabulary";
import { createLearnerVocabularyBrowseService, type LearnerVocabularyBrowseService } from "./learner-vocabulary-browse";
import {
  createLearnerSavedVocabularyService,
  LearnerSavedVocabularyServiceError,
  type LearnerSavedVocabularyService
} from "./learner-saved-vocabulary";
import {
  createWeakWordsService,
  parseWeakWordsQuery,
  WeakWordsServiceError,
  type WeakWordsService
} from "./weak-words";
import {
  createGlobalSearchService,
  GlobalSearchServiceError,
  parseGlobalSearchQuery,
  type GlobalSearchService
} from "./global-search";
import { vocabularyDatasetVersion } from "./vocabulary-dataset-version";
import { mustSanitizeV2MediaResponse, withoutUnclearedV2Media } from "./v2-public-media";
import {
  createResetLearnerProgressService,
  ResetLearnerProgressServiceError,
  type ResetLearnerProgressService
} from "./reset-learner-progress";

type AuthenticatedSession = { user: { id: string } };
type AuthSessionTimings = { authInitMs?: number; authGetSessionMs?: number };
type SessionReader = (request: Request, env: RuntimeBindings, timings?: AuthSessionTimings) => Promise<AuthenticatedSession | null>;
type BootstrapRunner = (userId: string, env: RuntimeBindings) => Promise<HouseholdBootstrapResponse["household"]>;
type AuthRequestHandler = (request: Request, env: RuntimeBindings) => Promise<Response>;

export type AppDependencies = {
  publicLearningIndex?: (env: RuntimeBindings) => Promise<PublicLearningIndex>;
  publicVocabularyBatch?: (env: RuntimeBindings, ids: number[]) => Promise<VocabularyDto[]>;
  publicVocabularyBrowse?: (env: RuntimeBindings, query: PublicVocabularyBrowseQuery) => Promise<LearnerVocabularyBrowseResponse>;
  publicVocabularyMatches?: (env: RuntimeBindings, query: string) => Promise<number[]>;
  publicLearningCatalog?: (env: RuntimeBindings) => Promise<PublicLearningCatalog>;
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
  continueLearningService?: ContinueLearningService;
  gamificationService?: GamificationService;
  learnerVocabularyService?: LearnerVocabularyService;
  learnerVocabularyBrowseService?: LearnerVocabularyBrowseService;
  learnerSavedVocabularyService?: LearnerSavedVocabularyService;
  weakWordsService?: WeakWordsService;
  globalSearchService?: GlobalSearchService;
  resetLearnerProgressService?: ResetLearnerProgressService;
};

const SAFE_BOOTSTRAP_ERROR = "Không thể hoàn tất thiết lập gia đình. Vui lòng thử lại.";

async function readAuthenticatedSession(request: Request, env: RuntimeBindings, timings?: AuthSessionTimings) {
  if (!env.DATABASE_URL || !env.BETTER_AUTH_SECRET) {
    throw new Error("AUTH_SERVICE_NOT_CONFIGURED");
  }
  const authInitStarted = performance.now();
  let auth: ReturnType<typeof createAuth>;
  try {
    auth = createAuth(env.DATABASE_URL, env.BETTER_AUTH_SECRET, env);
  } finally {
    if (timings) timings.authInitMs = performance.now() - authInitStarted;
  }
  const getSessionStarted = performance.now();
  try {
    return await auth.api.getSession({ headers: request.headers });
  } finally {
    if (timings) timings.authGetSessionMs = performance.now() - getSessionStarted;
  }
}

async function runBootstrap(userId: string, env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  const database = createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER);
  const service: BootstrapService = createBootstrapService(database);
  return service.ensureDefaultHousehold(userId);
}

async function runLearnerService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER));
}

async function runVocabularyService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createVocabularyService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runReviewService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createReviewService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER));
}

async function runReviewQueueService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createReviewQueueService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runLearnerSettingsService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerSettingsService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER));
}

async function runTopicService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createTopicService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runLearningSetService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearningSetService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runProgressSummaryService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createProgressSummaryService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runActivitySummaryService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createActivitySummaryService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runProgressHistoryService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createProgressHistoryService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runTopicProgressService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createTopicProgressService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runGamificationService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createGamificationService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runLearnerVocabularyService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerVocabularyService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runContinueLearningService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createContinueLearningService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runLearnerSavedVocabularyService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerSavedVocabularyService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runWeakWordsService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createWeakWordsService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runGlobalSearchService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createGlobalSearchService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

async function runResetLearnerProgressService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createResetLearnerProgressService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

function parseVocabularyLevelQuery(request: Request): VocabularyLevel | undefined | null {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  if (keys.length === 0) return undefined;
  if (keys.length !== 1 || keys[0] !== "level") return null;
  const parsed = vocabularyLevelSchema.safeParse(params.get("level"));
  return parsed.success ? parsed.data : null;
}

async function runLearnerVocabularyBrowseService(env: RuntimeBindings) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  const { createHttpDatabase } = await import("./db/client");
  return createLearnerVocabularyBrowseService(createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER), { datasetVersion: vocabularyDatasetVersion(env) });
}

function parseLearnerVocabularyQuery(request: Request): { level?: VocabularyLevel; vocabularyId?: number } | null {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || keys.some((key) => key !== "level" && key !== "id")) return null;
  const rawLevel = params.get("level");
  const level = rawLevel === null ? undefined : vocabularyLevelSchema.safeParse(rawLevel);
  if (level && !level.success) return null;
  const rawId = params.get("id");
  const vocabularyId = rawId === null ? undefined : positiveStudyId(rawId);
  if (rawId !== null && vocabularyId === null) return null;
  return {
    ...(level?.success ? { level: level.data } : {}),
    ...(vocabularyId ? { vocabularyId } : {})
  };
}

function parseLearnerVocabularyBrowseQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const allowed = new Set(["page", "pageSize", "q", "level", "cefr", "topic"]);
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length || keys.some((key) => !allowed.has(key))) return null;

  const candidate: Record<string, unknown> = {};
  for (const key of ["page", "pageSize"] as const) {
    const value = params.get(key);
    if (value !== null) candidate[key] = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  }
  for (const key of ["q", "level", "cefr", "topic"] as const) {
    const value = params.get(key);
    if (value !== null) candidate[key] = value;
  }

  const parsed = learnerVocabularyBrowseQuerySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function parseReviewQueueScope(request: Request): ReviewQueueScope | undefined | null {
  const params = new URL(request.url).searchParams;
  params.delete("capacity");
  const keys = [...params.keys()];
  if (keys.length === 0) return undefined;
  if (new Set(keys).size !== keys.length) return null;
  const source = params.get("source");
  if (keys.length === 1 && (source === "pathway" || source === "all")) return { type: source };
  if (keys.length === 2 && source === "custom" && keys.includes("setIds")) {
    const ids = parseStudySetIds(params.get("setIds") ?? "");
    return ids ? { type: "custom", ids } : null;
  }
  if (keys.length === 1 && (keys[0] === "learningSetId" || keys[0] === "topicId")) {
    const id = positiveStudyId(params.get(keys[0]) ?? "");
    return id ? { type: keys[0] === "topicId" ? "topic" : "learning-set", id } : null;
  }
  if (keys.length === 1 && keys[0] === "scope" && params.get("scope") === "saved") return "saved";
  if (keys.length === 1 && keys[0] === "scope" && params.get("scope") === "weak") return "weak";
  if (keys.length === 2
    && new Set(keys).size === 2
    && keys.includes("scope")
    && keys.includes("content")
    && params.get("scope") === "saved"
    && params.get("content") === "all") return "saved-all";
  return null;
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

  application.use("/api/*", async (c, next) => {
    await next();
    const mediaEnv = c.req.path.startsWith("/api/public/") ? { ...c.env, VERCEL_ENV: c.env?.VERCEL_ENV ?? "preview" } : c.env ?? {};
    if (!mustSanitizeV2MediaResponse(mediaEnv) || c.req.path.startsWith("/api/auth/")
      || !c.res.headers.get("content-type")?.includes("application/json")) return;
    const mediaStarted = performance.now();
    const body: unknown = await c.res.clone().json();
    const response = new Response(JSON.stringify(withoutUnclearedV2Media(body, mediaEnv)), c.res);
    response.headers.delete("content-length");
    response.headers.delete("etag");
    if (c.req.path.startsWith("/api/public/")) {
      const existing = response.headers.get("Server-Timing");
      response.headers.set("Server-Timing", `${existing ? `${existing}, ` : ""}public_media;dur=${(performance.now() - mediaStarted).toFixed(1)}`);
    }
    c.res = response;
  });

  const publicDatabase = async (env: RuntimeBindings) => {
    if (!env?.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
    const { createHttpDatabase } = await import("./db/client");
    return createHttpDatabase(env.DATABASE_URL, env.DATABASE_DRIVER);
  };
  const publicFailure = () => errorEnvelope("INTERNAL_ERROR", "Không thể tải nội dung học. Vui lòng thử lại.");
  application.get("/api/public/learning-index", async (c) => {
    if (new URL(c.req.url).search) return c.json(errorEnvelope("INVALID_REQUEST", "Yêu cầu không hợp lệ."), 400);
    const started = performance.now(); const timings: Record<string, number> = {};
    try {
      const data = dependencies.publicLearningIndex ? await dependencies.publicLearningIndex(c.env)
        : await readPublicLearningIndex(await publicDatabase(c.env), vocabularyDatasetVersion(c.env), timings);
      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      c.header("Server-Timing", [...Object.entries(timings).map(([key, ms]) => `${key};dur=${ms.toFixed(1)}`), `index_total;dur=${(performance.now() - started).toFixed(1)}`].join(", "));
      return c.json(data, 200);
    } catch { return c.json(publicFailure(), 503); }
  });
  application.get("/api/public/vocabulary", async (c) => {
    const params = new URL(c.req.url).searchParams;
    const raw = params.get("ids");
    const values = raw?.split(",") ?? [];
    const ids = values.map(Number);
    if ([...params.keys()].some((key) => key !== "ids") || params.getAll("ids").length !== 1
      || !values.length || values.length > PUBLIC_VOCABULARY_BATCH_LIMIT || new Set(ids).size !== ids.length
      || values.some((value) => !/^[1-9]\d*$/.test(value)) || ids.some((id) => !Number.isSafeInteger(id) || id > 2147483647)) {
      return c.json(errorEnvelope("INVALID_REQUEST", "Yêu cầu không hợp lệ."), 400);
    }
    const started = performance.now();
    try {
      const vocabulary = dependencies.publicVocabularyBatch ? await dependencies.publicVocabularyBatch(c.env, ids)
        : await readPublicVocabulary(await publicDatabase(c.env), { datasetVersion: vocabularyDatasetVersion(c.env), ids });
      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      c.header("Server-Timing", `vocabulary_batch;dur=${(performance.now() - started).toFixed(1)}`);
      return c.json({ vocabulary }, 200);
    } catch { return c.json(publicFailure(), 503); }
  });
  application.get("/api/public/vocabulary/matches", async (c) => {
    const params = new URL(c.req.url).searchParams;
    const query = params.get("q")?.trim();
    if (!query || query.length > 100 || params.getAll("q").length !== 1 || [...params.keys()].some((key) => key !== "q")) return c.json(errorEnvelope("INVALID_REQUEST", "Yêu cầu không hợp lệ."), 400);
    try {
      const ids = dependencies.publicVocabularyMatches ? await dependencies.publicVocabularyMatches(c.env, query)
        : await readPublicVocabularyMatchIds(await publicDatabase(c.env), vocabularyDatasetVersion(c.env), query);
      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return c.json({ ids }, 200);
    } catch { return c.json(publicFailure(), 503); }
  });
  application.get("/api/public/vocabulary/browse", async (c) => {
    const params = new URL(c.req.url).searchParams;
    const values = Object.fromEntries(params);
    if ([...params.keys()].some((key) => params.getAll(key).length !== 1)) return c.json(errorEnvelope("INVALID_REQUEST", "Yêu cầu không hợp lệ."), 400);
    const parsed = publicVocabularyBrowseQuerySchema.safeParse({ ...values,
      ...Object.fromEntries(["page", "pageSize", "topicId", "learningSetId"].filter((key) => params.has(key)).map((key) => [key, Number(params.get(key))]))
    });
    if (!parsed.success) return c.json(errorEnvelope("INVALID_REQUEST", "Yêu cầu không hợp lệ."), 400);
    const started = performance.now();
    try {
      const result = dependencies.publicVocabularyBrowse ? await dependencies.publicVocabularyBrowse(c.env, parsed.data)
        : await readPublicVocabularyBrowse(await publicDatabase(c.env), vocabularyDatasetVersion(c.env), parsed.data);
      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      c.header("Server-Timing", `vocabulary_browse;dur=${(performance.now() - started).toFixed(1)}`);
      return c.json(result, 200);
    } catch { return c.json(publicFailure(), 503); }
  });

  application.get("/api/public/learning-catalog", async (c) => {
    if (new URL(c.req.url).search) return c.json(errorEnvelope("INVALID_REQUEST", "Yêu cầu không hợp lệ."), 400);
    try {
      const catalog = dependencies.publicLearningCatalog ? await dependencies.publicLearningCatalog(c.env) : await (async () => {
        if (!c.env?.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
        const { createHttpDatabase } = await import("./db/client");
        return readPublicLearningCatalog(createHttpDatabase(c.env.DATABASE_URL, c.env.DATABASE_DRIVER), vocabularyDatasetVersion(c.env));
      })();
      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      return c.json(catalog, 200);
    } catch {
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải nội dung học. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/health", (c) => c.json({ status: "ok" }, 200));

  application.all("/api/auth/*", async (c) => {
    if (!c.env?.DATABASE_URL || !c.env.BETTER_AUTH_SECRET) {
      return c.json({ error: { code: "INTERNAL_ERROR", message: "Authentication service is not configured." } }, 503);
    }
    const authRequestStarted = performance.now();
    let authInitMs = 0;
    let authHandlerStarted = authRequestStarted;
    let authHandlerMs = 0;
    const withAuthTiming = (response: Response) => {
      const timedResponse = new Response(response.body, response);
      const duration = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0).toFixed(1);
      timedResponse.headers.set("Server-Timing", [
        `auth_init;dur=${duration(authInitMs)}`,
        `auth_handler;dur=${duration(authHandlerMs)}`,
        `total;dur=${duration(performance.now() - authRequestStarted)}`
      ].join(", "));
      return timedResponse;
    };
    try {
      let response: Response;
      if (dependencies.authRequestHandler) {
        authHandlerStarted = performance.now();
        try {
          response = await dependencies.authRequestHandler(c.req.raw, c.env);
        } finally {
          authHandlerMs = performance.now() - authHandlerStarted;
        }
      } else {
        const authInitStarted = performance.now();
        let auth: ReturnType<typeof createAuth>;
        try {
          auth = createAuth(c.env.DATABASE_URL, c.env.BETTER_AUTH_SECRET, c.env);
        } finally {
          authInitMs = performance.now() - authInitStarted;
        }
        authHandlerStarted = performance.now();
        try {
          response = await auth.handler(c.req.raw);
        } finally {
          authHandlerMs = performance.now() - authHandlerStarted;
        }
      }
      return withAuthTiming(response);
    } catch {
      if (authHandlerMs === 0 && authHandlerStarted !== authRequestStarted) {
        authHandlerMs = performance.now() - authHandlerStarted;
      }
      return withAuthTiming(c.json({ error: { code: "INTERNAL_ERROR", message: "Authentication service is not configured." } }, 503));
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
            ? "Mục tiêu và giới hạn từ mới phải là số nguyên trong phạm vi cho phép."
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
    const requestStarted = performance.now();
    const timings = { authorizationMs: 0, databaseMs: 0 };
    const authSessionTimings: AuthSessionTimings = {};
    let authMs = 0;
    const withTiming = (response: Response) => {
      response.headers.set("Server-Timing", renderReviewQueueServerTiming({
        ...authSessionTimings,
        authMs,
        ...timings,
        totalMs: performance.now() - requestStarted
      }));
      return response;
    };
    try {
      const authStarted = performance.now();
      let session: AuthenticatedSession | null;
      try {
        session = await readSession(c.req.raw, c.env, authSessionTimings);
      } finally {
        authMs = performance.now() - authStarted;
      }
      if (!session?.user?.id) {
        return withTiming(c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401));
      }
      let payload: unknown;
      try {
        payload = await c.req.json();
      } catch {
        return withTiming(c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400));
      }
      const service = dependencies.reviewService ?? await runReviewService(c.env);
      const result = await service.write(session.user.id, payload, timings);
      return withTiming(c.json(result.response, result.status));
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
        return withTiming(c.json(errorEnvelope(error.code, message, error.details), error.status));
      }
      return withTiming(c.json(errorEnvelope("INTERNAL_ERROR", "Không thể lưu tiến trình lúc này. Vui lòng thử lại."), 503));
    }
  });

  application.get("/api/learners/:learnerId/weak-words", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      const query = parseWeakWordsQuery(new URL(c.req.url).searchParams);
      if (!query) return c.json(errorEnvelope("INVALID_REQUEST", "Bộ lọc từ cần ôn không hợp lệ."), 400);
      const service = dependencies.weakWordsService ?? await runWeakWordsService(c.env);
      return c.json(await service.list(session.user.id, c.req.param("learnerId"), query), 200);
    } catch (error) {
      if (error instanceof WeakWordsServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : error.code === "INVALID_REQUEST"
            ? "Bộ lọc từ cần ôn không hợp lệ."
            : "Không thể tải từ cần ôn lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải từ cần ôn lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/review-queue", async (c) => {
    const requestStarted = performance.now();
    const timings: ReviewQueueTimings & { authMs: number } = { authMs: 0, authorizationMs: 0, databaseMs: 0 };
    const authSessionTimings: AuthSessionTimings = {};
    const withTiming = (response: Response) => {
      response.headers.set("Server-Timing", renderReviewQueueServerTiming({
        authInitMs: authSessionTimings.authInitMs,
        authGetSessionMs: authSessionTimings.authGetSessionMs,
        authMs: timings.authMs,
        authorizationMs: timings.authorizationMs ?? 0,
        databaseMs: timings.databaseMs ?? 0,
        totalMs: performance.now() - requestStarted
      }));
      return response;
    };
    try {
      const authStarted = performance.now();
      let session: AuthenticatedSession | null;
      try {
        session = await readSession(c.req.raw, c.env, authSessionTimings);
      } finally {
        timings.authMs = performance.now() - authStarted;
      }
      if (!session?.user?.id) {
        return withTiming(c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401));
      }
      const scope = parseReviewQueueScope(c.req.raw);
      const capacities = new URL(c.req.url).searchParams.getAll("capacity");
      const capacity = capacities.length ? parseStudyQueueCapacity(capacities[0]!) : undefined;
      if (scope === null || capacities.length > 1 || capacity === null || (capacity !== undefined && (scope === "saved-all" || scope === "weak"))) return withTiming(c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400));
      const service = dependencies.reviewQueueService ?? await runReviewQueueService(c.env);
      const queue = capacity !== undefined
        ? await service.list(session.user.id, c.req.param("learnerId"), timings, scope, capacity)
        : scope === undefined
        ? await service.list(session.user.id, c.req.param("learnerId"), timings)
        : await service.list(session.user.id, c.req.param("learnerId"), timings, scope);
      return withTiming(c.json(queue, 200));
    } catch (error) {
      if (error instanceof ReviewQueueServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tải review queue lúc này. Vui lòng thử lại.";
        return withTiming(c.json(errorEnvelope(error.code, message), error.status));
      }
      return withTiming(c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải review queue lúc này. Vui lòng thử lại."), 503));
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

  application.get("/api/learners/:learnerId/continue-learning", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.continueLearningService ?? await runContinueLearningService(c.env);
      return c.json(await service.get(session.user.id, c.req.param("learnerId")), 200);
    } catch (error) {
      if (error instanceof ContinueLearningServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập tiến trình của learner này."
          : "Không thể tải mục học tiếp lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải mục học tiếp lúc này. Vui lòng thử lại."), 503);
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

  application.get("/api/learners/:learnerId/vocabulary/browse", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const query = parseLearnerVocabularyBrowseQuery(c.req.raw);
      if (query === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learnerVocabularyBrowseService ?? await runLearnerVocabularyBrowseService(c.env);
      return c.json(await service.browse(session.user.id, c.req.param("learnerId"), query), 200);
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

  application.get("/api/learners/:learnerId/vocabulary", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) {
        return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      }
      const query = parseLearnerVocabularyQuery(c.req.raw);
      if (query === null) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learnerVocabularyService ?? await runLearnerVocabularyService(c.env);
      const vocabulary = query.level === undefined && query.vocabularyId === undefined
        ? await service.list(session.user.id, c.req.param("learnerId"))
        : await service.list(session.user.id, c.req.param("learnerId"), query.level, query.vocabularyId);
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

  application.get("/api/learners/:learnerId/search", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      const query = parseGlobalSearchQuery(new URL(c.req.url).searchParams);
      if (!query) return c.json(errorEnvelope("INVALID_REQUEST", "Từ khóa tìm kiếm không hợp lệ."), 400);
      const service = dependencies.globalSearchService ?? await runGlobalSearchService(c.env);
      return c.json(await service.search(session.user.id, c.req.param("learnerId"), query), 200);
    } catch (error) {
      if (error instanceof GlobalSearchServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tìm kiếm lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tìm kiếm lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.get("/api/learners/:learnerId/saved-vocabulary", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const service = dependencies.learnerSavedVocabularyService ?? await runLearnerSavedVocabularyService(c.env);
      const savedVocabulary = await service.list(session.user.id, c.req.param("learnerId"));
      return c.json({ savedVocabulary }, 200);
    } catch (error) {
      if (error instanceof LearnerSavedVocabularyServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể tải từ đã lưu lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể tải từ đã lưu lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.post("/api/learners/:learnerId/saved-vocabulary/:vocabularyId", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const vocabularyId = parsePositiveInteger(c.req.param("vocabularyId"));
      if (vocabularyId === null) return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      const service = dependencies.learnerSavedVocabularyService ?? await runLearnerSavedVocabularyService(c.env);
      return c.json(await service.save(session.user.id, c.req.param("learnerId"), vocabularyId), 200);
    } catch (error) {
      if (error instanceof LearnerSavedVocabularyServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : error.code === "VOCABULARY_NOT_FOUND"
            ? "Vocabulary không khả dụng."
            : "Không thể lưu từ lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể lưu từ lúc này. Vui lòng thử lại."), 503);
    }
  });

  application.delete("/api/learners/:learnerId/saved-vocabulary/:vocabularyId", async (c) => {
    try {
      const session = await readSession(c.req.raw, c.env);
      if (!session?.user?.id) return c.json(errorEnvelope("UNAUTHORIZED", "Đăng nhập để tiếp tục."), 401);
      if ([...new URL(c.req.url).searchParams.keys()].length > 0) {
        return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      }
      const vocabularyId = parsePositiveInteger(c.req.param("vocabularyId"));
      if (vocabularyId === null) return c.json(errorEnvelope("INVALID_REQUEST", "Dữ liệu gửi lên không hợp lệ."), 400);
      const service = dependencies.learnerSavedVocabularyService ?? await runLearnerSavedVocabularyService(c.env);
      return c.json(await service.unsave(session.user.id, c.req.param("learnerId"), vocabularyId), 200);
    } catch (error) {
      if (error instanceof LearnerSavedVocabularyServiceError) {
        const message = error.code === "HOUSEHOLD_ACCESS_DENIED"
          ? "Bạn không có quyền truy cập learner này."
          : "Không thể bỏ lưu từ lúc này. Vui lòng thử lại.";
        return c.json(errorEnvelope(error.code, message), error.status);
      }
      return c.json(errorEnvelope("INTERNAL_ERROR", "Không thể bỏ lưu từ lúc này. Vui lòng thử lại."), 503);
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
