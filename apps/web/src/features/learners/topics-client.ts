import { learningFetch } from "../guest/learning-fetch";
import {
  topicListResponseSchema,
  vocabularyListResponseSchema,
  type TopicDto,
  type VocabularyDto
} from "@vocabflow/contracts";

export class TopicsClientError extends Error {
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "TopicsClientError";
    this.status = status;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new TopicsClientError("INVALID_RESPONSE", response.status);
  }
}

export async function requestTopics(): Promise<TopicDto[]> {
  let response: Response;
  try {
    response = await learningFetch("/api/topics", { credentials: "include" });
  } catch {
    throw new TopicsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw new TopicsClientError("TOPICS_REQUEST_FAILED", response.status);
  const parsed = topicListResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new TopicsClientError("INVALID_RESPONSE", response.status);
  return parsed.data.topics;
}

export async function requestTopicVocabulary(topicId: number): Promise<VocabularyDto[]> {
  let response: Response;
  try {
    response = await learningFetch(`/api/topics/${topicId}/vocabulary`, { credentials: "include" });
  } catch {
    throw new TopicsClientError("NETWORK_ERROR", 0);
  }
  if (!response.ok) throw new TopicsClientError("TOPIC_VOCABULARY_REQUEST_FAILED", response.status);
  const parsed = vocabularyListResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) throw new TopicsClientError("INVALID_RESPONSE", response.status);
  return parsed.data.vocabulary;
}
