export type VocabularyDisplayExample = {
  english: string;
  vietnamese: string | null;
  exampleKey?: string;
  audioUrl?: string;
};

const partOfSpeechLabels: Record<string, string> = {
  NOUN: "Danh từ",
  VERB: "Động từ",
  ADJECTIVE: "Tính từ",
  ADVERB: "Trạng từ",
  PRONOUN: "Đại từ",
  PREPOSITION: "Giới từ",
  CONJUNCTION: "Liên từ",
  INTERJECTION: "Thán từ",
  DETERMINER: "Từ hạn định",
  AUXILIARY: "Trợ động từ",
  NUMERAL: "Số từ",
  PHRASE: "Cụm từ",
  IDIOM: "Thành ngữ",
  PREFIX: "Tiền tố",
  SUFFIX: "Hậu tố"
};

const inferredTopicLabels: Record<string, string> = {
  "care-relationships": "Quan hệ và chăm sóc",
  "computer-science": "Tin học và khoa học máy tính",
  light: "Ánh sáng",
  travel: "Du lịch",
  animals: "Động vật",
  art: "Nghệ thuật",
  business: "Kinh doanh",
  culture: "Văn hóa",
  education: "Giáo dục",
  emotion: "Cảm xúc",
  environment: "Môi trường",
  family: "Gia đình",
  finance: "Tài chính",
  food: "Ẩm thực",
  health: "Sức khỏe",
  law: "Pháp luật",
  nature: "Thiên nhiên",
  science: "Khoa học",
  society: "Xã hội",
  sports: "Thể thao",
  technology: "Công nghệ",
  work: "Công việc"
};

function normalizeCode(value: string) {
  return value.trim().toLocaleLowerCase().replaceAll("_", "-").replace(/\s+/g, "-");
}

function readableCode(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1).toLocaleLowerCase()}`)
    .join(" ");
}

export function formatPartOfSpeech(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLocaleUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return null;
  return partOfSpeechLabels[normalized] ?? readableCode(normalized);
}

function formatInferredCode(code: string, dimension: "topic" | "domain") {
  const normalized = normalizeCode(code);
  const label = inferredTopicLabels[normalized] ?? readableCode(code);
  return dimension === "domain" ? `Lĩnh vực · ${label}` : `Chủ đề · ${label}`;
}

/** Keep stable inferred IDs for filtering while rendering a human-facing label. */
export function formatVocabularyTopic(value: string | null | undefined): string | null {
  const topic = value?.trim();
  if (!topic) return null;
  const inferred = topic.match(/^(topic-inferred|domain-inferred):(.+)$/i);
  if (!inferred) {
    const localized = inferredTopicLabels[normalizeCode(topic)];
    if (localized) return localized;
    return /[-_]/.test(topic) ? readableCode(topic) : topic;
  }
  return formatInferredCode(inferred[2], inferred[1].toLocaleLowerCase() === "domain-inferred" ? "domain" : "topic");
}

export function formatInferredMetadataLabel(value: string, dimension: "TOPIC" | "SUBTOPIC" | "DOMAIN") {
  const inferred = value.match(/^(topic-inferred|domain-inferred):(.+)$/i);
  const kind = dimension === "DOMAIN" || inferred?.[1].toLocaleLowerCase() === "domain-inferred" ? "domain" : "topic";
  const code = inferred?.[2] ?? value;
  const label = inferredTopicLabels[normalizeCode(code)] ?? readableCode(code);
  return label || (kind === "domain" ? "Lĩnh vực khác" : "Chủ đề khác");
}

/** Read only structured bilingual examples; never split or rewrite source text. */
export function parseVocabularyExamples(value: unknown): VocabularyDisplayExample[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const example = entry as Record<string, unknown>;
    if (typeof example.en !== "string" || !example.en.trim()) return [];
    return [{
      english: example.en,
      vietnamese: typeof example.vi === "string" && example.vi.trim() ? example.vi : null,
      ...(typeof example.exampleKey === "string" ? { exampleKey: example.exampleKey } : {}),
      ...(typeof example.audioUrl === "string" && example.audioUrl.trim() ? { audioUrl: example.audioUrl } : {})
    }];
  });
}
