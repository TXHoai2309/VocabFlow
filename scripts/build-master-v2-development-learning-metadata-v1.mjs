import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WORKSPACE = path.join(ROOT, "vocabflow-dataset/workspaces/master-v2-development-sync");
const QUEUE_PATH = path.join(WORKSPACE, "independent-content-review-queue-v1.json");
const CANDIDATE_PATH = path.join(WORKSPACE, "master-v2-release-candidate-v9.json");
const RUNTIME_SNAPSHOT_PATH = path.join(WORKSPACE, "development-runtime-v1/master-v2-development-runtime-snapshot-v1.json");
const OXFORD_PATH = path.resolve(ROOT, "vocabflow-dataset/workspaces/full-source-inventory-dedupe/oxford-normalized-inventory.json");
const TAXONOMY_PATH = path.resolve(ROOT, "vocabflow-dataset/taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.1.json");
const OUTPUT_PATH = path.join(WORKSPACE, "master-v2-development-learning-metadata-v1.json");
const OUTPUT_HASH_PATH = `${OUTPUT_PATH}.sha256`;
const RULESET = "sense-topic-domain-cues-v1";

const TOPIC_RULES = [
  { code: "FOOD", patterns: [/\b(food|drink|meal|dish|ingredient|beverage|eat|cook|cuisine|nutrition)\b/iu, /\b(thức ăn|đồ ăn|thực phẩm|bữa ăn|món ăn|nguyên liệu|đồ uống|nấu ăn)\b/iu] },
  { code: "FRUIT", patterns: [/\bfruit\b/iu, /\bquả (?:cây|ăn được|chín)\b/iu] },
  { code: "DESSERTS", patterns: [/\b(dessert|cake|pudding|ice cream|pastry|sweet course)\b/iu, /\b(món tráng miệng|bánh ngọt|kem)\b/iu] },
  { code: "FINANCE", patterns: [/\b(money|financial|finance|currency|loan|interest rate|tax|payment|salary|wage|budget|bank account|exchange rate)\b/iu, /\b(tài chính|tiền tệ|khoản vay|lãi suất|thuế|thanh toán|tiền lương|ngân sách)\b/iu] },
  { code: "NATURE", patterns: [/\b(nature|natural environment|plant|animal|wildlife|weather|forest|tree|species|habitat|ecosystem|soil|rock)\b/iu, /\b(tự nhiên|thiên nhiên|thực vật|động vật|thời tiết|rừng|cây cối|môi trường sống|hệ sinh thái)\b/iu] },
  { code: "RIVERS", patterns: [/\b(river|watercourse|tributary|stream|riverbank|waterfall)\b/iu, /\b(sông|suối|phụ lưu|thác nước)\b/iu] },
  { code: "MOVEMENT", patterns: [/\b(physical movement|move from one place|change position|motion|movement of the body|locomotion)\b/iu, /\b(chuyển động cơ thể|di chuyển từ nơi này|thay đổi vị trí|sự chuyển động)\b/iu] },
  { code: "RECORDS_INFORMATION", patterns: [/\b(information|data|record|document|report|statement|certificate|archive|database|fact or detail)\b/iu, /\b(thông tin|dữ liệu|hồ sơ|tài liệu|báo cáo|chứng chỉ|lưu trữ)\b/iu] },
  { code: "LIGHT", patterns: [/\b(light|brightness|illumination|ray of light|beam of light)\b/iu, /\b(ánh sáng|độ sáng|tia sáng|chiếu sáng)\b/iu] },
  { code: "WEIGHT", patterns: [/\b(weight|weigh|mass|kilogram|kilogramme|tonne|pound in weight)\b/iu, /\b(trọng lượng|cân nặng|khối lượng|ki-lô-gam)\b/iu] },
  { code: "CARE_RELATIONSHIPS", patterns: [/\b(family|relative|relationship|friendship|care for|look after|marriage|parent|sibling|guardian|affection)\b/iu, /\b(gia đình|họ hàng|mối quan hệ|tình bạn|chăm sóc|hôn nhân|cha mẹ|anh chị em|người giám hộ|tình cảm)\b/iu] },
  { code: "SOCIETY", patterns: [/\b(society|community|social group|culture|tradition|citizen|population|custom)\b/iu, /\b(xã hội|cộng đồng|nhóm xã hội|văn hóa|truyền thống|công dân|dân số|phong tục)\b/iu] },
  { code: "GOVERNMENT", patterns: [/\b(government|political|parliament|election|public authority|law|legal system|court|legislation|policy)\b/iu, /\b(chính phủ|chính trị|quốc hội|bầu cử|cơ quan công quyền|pháp luật|tòa án|chính sách)\b/iu] },
  { code: "RISK_SAFETY", patterns: [/\b(risk|danger|hazard|safety|safe from|accident|emergency|protect against|prevent harm|injury)\b/iu, /\b(rủi ro|nguy hiểm|mối nguy|an toàn|tai nạn|khẩn cấp|bảo vệ khỏi|ngăn ngừa tổn hại|chấn thương)\b/iu] },
  { code: "TECHNOLOGY", patterns: [/\b(technology|technological|digital device|electronic device|machine|software|internet|online service|mobile phone|automation)\b/iu, /\b(công nghệ|thiết bị kỹ thuật số|thiết bị điện tử|máy móc|phần mềm|internet|dịch vụ trực tuyến|điện thoại di động|tự động hóa)\b/iu] },
  { code: "COMPUTER_SCIENCE", patterns: [/\b(computer|programming|computer program|algorithm|computer network|web browser|operating system|source code)\b/iu, /\b(máy tính|lập trình|chương trình máy tính|thuật toán|mạng máy tính|trình duyệt web|hệ điều hành|mã nguồn)\b/iu] },
  { code: "TRAVEL", patterns: [/\b(travel|journey|trip|tourist|passenger|airport|flight|railway station|itinerary|travel abroad)\b/iu, /\b(du lịch|chuyến đi|hành trình|khách du lịch|hành khách|sân bay|chuyến bay|nhà ga|lịch trình)\b/iu] },
  { code: "HOSPITALITY", patterns: [/\b(hotel|accommodation|guest room|hospitality|guest service|restaurant service|host a guest)\b/iu, /\b(khách sạn|chỗ lưu trú|phòng khách|dịch vụ lưu trú|dịch vụ nhà hàng|tiếp đón khách)\b/iu] },
  { code: "BUSINESS", patterns: [/\b(business|company|commerce|trade|employer|employee|customer|market|enterprise|contract|manager|commercial)\b/iu, /\b(kinh doanh|công ty|thương mại|buôn bán|người sử dụng lao động|nhân viên|khách hàng|thị trường|doanh nghiệp|hợp đồng|quản lý)\b/iu] },
  { code: "ARTS_ENTERTAINMENT", patterns: [/\b(art|artist|music|musical instrument|film|movie|theatre|theater|performance|actor|novel|painting|entertainment)\b/iu, /\b(nghệ thuật|nghệ sĩ|âm nhạc|nhạc cụ|phim|nhà hát|buổi biểu diễn|diễn viên|tiểu thuyết|hội họa|giải trí)\b/iu] },
  { code: "GRAMMAR_CONNECTIVES", pos: ["DETERMINER", "PRONOUN", "CONJUNCTION", "PREPOSITION", "ARTICLE"] }
];

const DOMAIN_RULES = [
  { code: "ACADEMIC_ENGLISH", patterns: [/\b(academic|research|university|college course|scholarly|hypothesis|citation|thesis|experiment|scientific study)\b/iu, /\b(học thuật|nghiên cứu|đại học|giả thuyết|trích dẫn|luận văn|thí nghiệm|nghiên cứu khoa học)\b/iu] },
  { code: "BUSINESS_ENGLISH", patterns: [/\b(business|company|commerce|trade|employer|employee|customer|commercial|enterprise|contract|manager|marketing)\b/iu, /\b(kinh doanh|công ty|thương mại|người sử dụng lao động|nhân viên|khách hàng|doanh nghiệp|hợp đồng|quản lý|tiếp thị)\b/iu] },
  { code: "TRAVEL_ENGLISH", patterns: [/\b(travel|journey|trip|tourist|passenger|airport|flight|itinerary|tourism)\b/iu, /\b(du lịch|chuyến đi|hành trình|khách du lịch|hành khách|sân bay|chuyến bay|lịch trình)\b/iu] },
  { code: "IT_TECHNOLOGY", patterns: [/\b(computer|programming|algorithm|software|digital technology|internet|computer network|database|web browser|operating system)\b/iu, /\b(máy tính|lập trình|thuật toán|phần mềm|công nghệ số|internet|mạng máy tính|cơ sở dữ liệu|trình duyệt web|hệ điều hành)\b/iu] },
  { code: "HOSPITALITY", patterns: [/\b(hotel|accommodation|guest service|hospitality|restaurant service|tourism industry)\b/iu, /\b(khách sạn|chỗ lưu trú|dịch vụ khách|dịch vụ lưu trú|dịch vụ nhà hàng|ngành du lịch)\b/iu] }
];

function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function pinnedJson(file) {
  const bytes = readFileSync(file);
  return { value: JSON.parse(bytes.toString("utf8")), sha256: hash(bytes) };
}
function normalized(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("und")
    .replace(/<[^>]*>/gu, " ").replace(/[^\p{L}\p{N}']+/gu, " ").trim().replace(/\s+/gu, " ");
}
function normalizePos(value) {
  const pos = normalized(value).replace(/\s+/gu, "_").toUpperCase();
  return ({ ADJ: "ADJECTIVE", ADV: "ADVERB", N: "NOUN", V: "VERB", PREP: "PREPOSITION", PRON: "PRONOUN", CONJ: "CONJUNCTION", DET: "DETERMINER" })[pos] ?? pos;
}
function sourcePos(value) {
  return ({ ADJECTIVE: "ADJ", ADVERB: "ADV", NOUN: "NOUN", VERB: "VERB", AUXILIARY_VERB: "VERB", MODAL_VERB: "VERB", PREPOSITION: "PREP", PRONOUN: "PRON", CONJUNCTION: "CONJ", DETERMINER: "DET", NUMBER: "NUMBER", INTERJECTION: "INTERJECTION" })[value] ?? value;
}
function excerpt(text, pattern) {
  const match = pattern.exec(text);
  if (!match) return null;
  const start = Math.max(0, (match.index ?? 0) - 80);
  return text.slice(start, Math.min(text.length, (match.index ?? 0) + match[0].length + 80)).trim();
}
function infer(rules, entry) {
  const text = `${entry.content.definitionEn} ${entry.content.meaningVi}`;
  return rules.flatMap((rule) => {
    if (rule.pos?.includes(entry.partOfSpeech)) {
      return [{ code: rule.code, status: "INFERRED_REVIEWABLE", confidence: "HIGH", evidenceType: "SOURCE_POS_CUE", matchedEvidence: entry.partOfSpeech }];
    }
    const match = rule.patterns?.map((pattern) => excerpt(text, pattern)).find(Boolean);
    return match ? [{ code: rule.code, status: "INFERRED_REVIEWABLE", confidence: "HIGH", evidenceType: "EXPLICIT_SEMANTIC_CUE", matchedEvidence: match }] : [];
  }).sort((a, b) => a.code.localeCompare(b.code));
}
function getSourceReferences(entry) {
  const p = entry.sourceProvenance ?? {};
  return [...(p.sourceEvidenceReferences ?? []), ...(p.stagingResolution?.sourceRecords ?? []), ...(p.stagingResolution?.supportingSourceRecords ?? [])];
}

const queueFile = pinnedJson(QUEUE_PATH);
const candidateFile = pinnedJson(CANDIDATE_PATH);
const runtimeFile = pinnedJson(RUNTIME_SNAPSHOT_PATH);
const oxfordFile = pinnedJson(OXFORD_PATH);
const taxonomyFile = pinnedJson(TAXONOMY_PATH);
const queue = queueFile.value;
const candidate = candidateFile.value;
const runtime = runtimeFile.value;
const inventory = oxfordFile.value;
const taxonomy = taxonomyFile.value;

if (queue.entries?.length !== 7320 || candidate.senseDispositions?.length !== 7320
  || candidate.currentContentReviewDecisionCounts?.PASS !== 7311 || candidate.sourceQueueFileSha256 !== queueFile.sha256
  || runtime.includedSenseCount !== 7311 || runtime.sourceQueueSha256 !== queueFile.sha256
  || runtime.releaseCandidateSha256 !== candidateFile.sha256 || taxonomy.status !== "APPROVED"
  || inventory.records?.length !== 5004) throw new Error("V2_METADATA_SOURCE_PIN_OR_SCOPE_FAILURE");

const entryByKey = new Map(queue.entries.map((entry) => [entry.proposalKey, entry]));
const runtimeByKey = new Map(runtime.identities.map((row) => [row.proposalKey, row]));
const dispositionByKey = new Map(candidate.senseDispositions.map((row) => [row.proposalKey, row]));
const oxfordById = new Map(inventory.records.map((row) => [String(row.sourceRecordId), row]));
const topicByCode = new Map(taxonomy.topics.map((topic) => [topic.code, topic]));
const domainByCode = new Map(taxonomy.domains.map((domain) => [domain.code, domain]));
const levelOrder = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const senses = [];
const currentContentByKey = new Map();
for (const overlayRef of candidate.revisionOverlays) {
  const overlayPath = path.resolve(ROOT, overlayRef.path);
  const overlay = pinnedJson(overlayPath);
  if (overlay.sha256 !== overlayRef.sha256) throw new Error("V2_METADATA_REVISION_OVERLAY_PIN_FAILURE");
  for (const revision of overlay.value.revisions ?? []) {
    const current = currentContentByKey.get(revision.proposalKey);
    const base = entryByKey.get(revision.proposalKey);
    const expectedParent = current?.hash ?? base?.effectiveContentHash;
    if (!base || revision.parentContentHash !== expectedParent) continue;
    currentContentByKey.set(revision.proposalKey, {
      hash: revision.effectiveContentHash,
      content: revision.candidateContent,
      sourceProvenance: revision.sourceProvenance ?? current?.sourceProvenance ?? base.sourceProvenance
    });
  }
}

for (const disposition of candidate.senseDispositions) {
  if (disposition.contentReviewDecision !== "PASS" || disposition.identityAndSourceValid !== true || disposition.versionSelectionResolved !== true) continue;
  const entry = entryByKey.get(disposition.proposalKey);
  const runtimeIdentity = runtimeByKey.get(disposition.proposalKey);
  const revision = currentContentByKey.get(disposition.proposalKey);
  const currentHash = revision?.hash ?? entry?.effectiveContentHash;
  const currentContent = revision?.content ?? entry?.content;
  const currentProvenance = revision?.sourceProvenance ?? entry?.sourceProvenance;
  if (!entry || !runtimeIdentity || runtimeIdentity.contentSha256 !== disposition.effectiveContentHash
    || currentHash !== disposition.effectiveContentHash || !currentContent || !/^[0-9a-f]{64}$/u.test(disposition.effectiveContentHash)) {
    throw new Error("V2_METADATA_CONTENT_HASH_OR_IDENTITY_MISMATCH");
  }
  const currentEntry = { ...entry, content: currentContent, sourceProvenance: currentProvenance };
  const pinned = new Map();
  for (const ref of getSourceReferences(currentEntry)) {
    if (ref.corpus !== "OXFORD_5000" || !ref.sourceRecordId || !ref.sourceNoteGuid || !/^[0-9a-f]{64}$/u.test(ref.recordEvidenceSha256 ?? "")) continue;
    const source = oxfordById.get(String(ref.sourceRecordId));
    if (!source || source.sourceNoteGuid !== ref.sourceNoteGuid || source.recordEvidenceSha256 !== ref.recordEvidenceSha256
      || normalized(source.normalizedHeadword ?? source.headwordText) !== normalized(currentEntry.headword)
      || !(source.sourcePosClassesCandidate ?? []).map(normalizePos).includes(normalizePos(currentEntry.partOfSpeech))) continue;
    pinned.set(String(source.sourceRecordId), { source, ref });
  }
  const cefrEvidence = [...pinned.values()].flatMap(({ source, ref }) => (source.sourceCefrEvidence ?? []).map((item) => ({
    value: String(item.value ?? "").trim().toUpperCase(), sourceField: item.sourceField,
    corpus: "OXFORD_5000", sourceRecordId: String(source.sourceRecordId), sourceNoteGuid: source.sourceNoteGuid,
    recordEvidenceSha256: ref.recordEvidenceSha256
  }))).filter((item) => levelOrder.includes(item.value));
  const cefrValues = [...new Set(cefrEvidence.map((item) => item.value))];
  const cefr = cefrValues.length === 1 ? cefrValues[0] : null;
  const sourceRecords = [...new Map([...pinned.values()].map(({ source, ref }) => [String(source.sourceRecordId), {
    corpus: "OXFORD_5000", sourceRecordId: String(source.sourceRecordId), sourceNoteGuid: source.sourceNoteGuid,
    recordEvidenceSha256: ref.recordEvidenceSha256
  }])).values()].sort((a, b) => a.sourceRecordId.localeCompare(b.sourceRecordId));
  const topics = infer(TOPIC_RULES, currentEntry).filter((assignment) => topicByCode.has(assignment.code)).map((assignment) => ({
    ...assignment,
    label: topicByCode.get(assignment.code).labels.find((item) => item.language === "vi")?.text ?? assignment.code,
    taxonomyId: taxonomy.taxonomyId,
    taxonomyVersion: taxonomy.taxonomyVersion
  }));
  const domains = infer(DOMAIN_RULES, currentEntry).filter((assignment) => domainByCode.has(assignment.code)).map((assignment) => ({
    ...assignment,
    label: domainByCode.get(assignment.code).labels.find((item) => item.language === "vi")?.text ?? assignment.code,
    taxonomyId: taxonomy.taxonomyId,
    taxonomyVersion: taxonomy.taxonomyVersion
  }));
  const topicCodes = topics.map((item) => item.code);
  if (topicCodes.includes("FRUIT") || topicCodes.includes("DESSERTS")) {
    const parent = { code: "FOOD", label: topicByCode.get("FOOD")?.labels.find((item) => item.language === "vi")?.text ?? "FOOD", status: "INFERRED_REVIEWABLE", confidence: "HIGH", evidenceType: "TAXONOMY_PARENT_OF_MATCHED_SUBTOPIC", matchedEvidence: topicCodes.filter((code) => ["FRUIT", "DESSERTS"].includes(code)).join(", "), taxonomyId: taxonomy.taxonomyId, taxonomyVersion: taxonomy.taxonomyVersion };
    if (!topics.some((item) => item.code === "FOOD")) topics.push(parent);
  }
  if (topicCodes.includes("RIVERS") && !topics.some((item) => item.code === "NATURE")) topics.push({
    code: "NATURE", label: topicByCode.get("NATURE")?.labels.find((item) => item.language === "vi")?.text ?? "NATURE", status: "INFERRED_REVIEWABLE", confidence: "HIGH", evidenceType: "TAXONOMY_PARENT_OF_MATCHED_SUBTOPIC",
    matchedEvidence: "RIVERS", taxonomyId: taxonomy.taxonomyId, taxonomyVersion: taxonomy.taxonomyVersion
  });
  topics.sort((a, b) => a.code.localeCompare(b.code));
  domains.sort((a, b) => a.code.localeCompare(b.code));
  senses.push({
    proposalKey: currentEntry.proposalKey,
    sourceGroupKey: currentEntry.sourceGroupKey,
    headword: currentEntry.headword,
    displayForm: currentEntry.displayForm,
    partOfSpeech: currentEntry.partOfSpeech,
    contentSha256: disposition.effectiveContentHash,
    sourceNoteIdentities: sourceRecords,
    cefr: cefr ? { value: cefr, status: "SOURCE_VERIFIED", evidence: cefrEvidence.filter((item) => item.value === cefr) } : null,
    topics,
    subtopics: topics.filter((item) => taxonomy.topics.find((topic) => topic.code === item.code)?.parentTopicId).map((item) => ({
      code: item.code,
      parentCode: taxonomy.topics.find((topic) => topic.code === item.code)?.parentTopicId
        ? taxonomy.topics.find((topic) => topic.topicId === taxonomy.topics.find((candidate) => candidate.code === item.code).parentTopicId)?.code ?? null : null,
      status: item.status,
      confidence: item.confidence,
      evidenceType: item.evidenceType,
      matchedEvidence: item.matchedEvidence,
      label: item.label
    })),
    domains,
    developmentTags: [
      ...topics.map((item) => `topic-inferred:${item.code.toLowerCase().replaceAll("_", "-")}`),
      ...domains.map((item) => `domain-inferred:${item.code.toLowerCase().replaceAll("_", "-")}`)
    ].sort(),
    ageGroups: [],
    schoolGrades: [],
    examLabels: [],
    learningSets: [
      ...(cefr ? [{ slug: `v2-cefr-${cefr.toLowerCase().replaceAll("_", "-")}`, kind: "SOURCE_VERIFIED_CEFR", status: "SOURCE_VERIFIED" }] : []),
      ...domains.map((item) => ({ slug: `v2-domain-${item.code.toLowerCase().replaceAll("_", "-")}`, kind: "INFERRED_ESP", status: "INFERRED_REVIEWABLE", evidenceType: item.evidenceType, matchedEvidence: item.matchedEvidence }))
    ]
  });
}

if (senses.length !== 7311 || new Set(senses.map((sense) => sense.proposalKey)).size !== 7311
  || senses.some((sense) => sense.sourceNoteIdentities.some((item) => !/^[0-9a-f]{64}$/u.test(item.recordEvidenceSha256)))) {
  throw new Error("V2_METADATA_SENSE_SCOPE_OR_PROVENANCE_FAILURE");
}

const learningSets = [];
for (const cefr of levelOrder) {
  const members = senses.filter((sense) => sense.cefr?.value === cefr);
  if (!members.length) continue;
  learningSets.push({
    slug: `v2-cefr-${cefr.toLowerCase().replaceAll("_", "-")}`,
    name: `CEFR ${cefr.replace("PRE_A1", "Pre-A1")}`,
    description: `Tập hợp các Sense có mức ${cefr} khớp bằng chứng CEFR đã ghim từ nguồn Oxford. Đây là phân loại theo trình độ ngôn ngữ, không phải khối lớp.` ,
    grade: null,
    sortOrder: learningSets.length * 10,
    status: "SOURCE_VERIFIED",
    members: members.sort((a, b) => normalized(a.displayForm).localeCompare(normalized(b.displayForm)) || a.partOfSpeech.localeCompare(b.partOfSpeech) || a.proposalKey.localeCompare(b.proposalKey)).map((sense) => ({ proposalKey: sense.proposalKey, contentSha256: sense.contentSha256 }))
  });
}
for (const domain of taxonomy.domains.filter((item) => item.code !== "GENERAL_ENGLISH")) {
  const code = domain.code;
  const members = senses.filter((sense) => sense.domains.some((item) => item.code === code));
  if (!members.length) continue;
  const label = domain.labels.find((item) => item.language === "en")?.text ?? code;
  const slug = `v2-domain-${code.toLowerCase().replaceAll("_", "-")}`;
  learningSets.push({
    slug,
    name: `Gợi ý chuyên ngành: ${label}`,
    description: `Bộ học Development suy luận từ từ khóa nghĩa có dẫn chứng; chưa phải danh mục chính thức của ngành hoặc kỳ thi.`,
    grade: null,
    sortOrder: learningSets.length * 10,
    status: "INFERRED_REVIEWABLE",
    members: members.sort((a, b) => normalized(a.displayForm).localeCompare(normalized(b.displayForm)) || a.partOfSpeech.localeCompare(b.partOfSpeech) || a.proposalKey.localeCompare(b.proposalKey)).map((sense) => ({ proposalKey: sense.proposalKey, contentSha256: sense.contentSha256 }))
  });
}

const topics = taxonomy.topics.map((topic, index) => {
  const parent = topic.parentTopicId ? taxonomy.topics.find((item) => item.topicId === topic.parentTopicId) : null;
  const labelVi = topic.labels.find((item) => item.language === "vi")?.text ?? topic.code;
  const labelEn = topic.labels.find((item) => item.language === "en")?.text ?? topic.code;
  const members = senses.filter((sense) => sense.topics.some((item) => item.code === topic.code));
  return {
    code: topic.code,
    slug: topic.slug,
    name: labelVi,
    description: `${parent ? `Chủ đề con của ${parent.labels.find((item) => item.language === "vi")?.text ?? parent.code}. ` : ""}Gợi ý chủ đề Development suy luận từ dấu hiệu rõ trong định nghĩa/meaning hoặc POS; chưa được duyệt thủ công.`,
    parentCode: parent?.code ?? null,
    englishName: labelEn,
    status: "INFERRED_REVIEWABLE",
    sortOrder: index * 10,
    members: members.sort((a, b) => normalized(a.displayForm).localeCompare(normalized(b.displayForm)) || a.partOfSpeech.localeCompare(b.partOfSpeech) || a.proposalKey.localeCompare(b.proposalKey)).map((sense) => ({ proposalKey: sense.proposalKey, contentSha256: sense.contentSha256 }))
  };
}).filter((topic) => topic.members.length > 0);

const counts = {
  senses: senses.length,
  sourceVerifiedCefr: senses.filter((sense) => sense.cefr).length,
  topicSenseMemberships: senses.reduce((sum, sense) => sum + sense.topics.length, 0),
  sensesWithTopic: senses.filter((sense) => sense.topics.length).length,
  sensesWithSubtopic: senses.filter((sense) => sense.subtopics.length).length,
  domainSenseMemberships: senses.reduce((sum, sense) => sum + sense.domains.length, 0),
  sensesWithDomain: senses.filter((sense) => sense.domains.length).length,
  ageGroupAssignments: 0,
  schoolGradeAssignments: 0,
  examAssignments: 0,
  learningSets: learningSets.length,
  learningSetMemberships: learningSets.reduce((sum, set) => sum + set.members.length, 0)
};
const payload = {
  artifactType: "master-v2-development-learning-metadata",
  artifactVersion: "1.0.0",
  status: "DEVELOPMENT_ONLY_METADATA_OVERLAY",
  doesNotChangeContentOrReviewHash: true,
  doesNotApproveOrClearRights: true,
  sourcePins: {
    queuePath: path.relative(ROOT, QUEUE_PATH).replaceAll("\\", "/"), queueSha256: queueFile.sha256,
    candidatePath: path.relative(ROOT, CANDIDATE_PATH).replaceAll("\\", "/"), candidateSha256: candidateFile.sha256,
    runtimeSnapshotPath: path.relative(ROOT, RUNTIME_SNAPSHOT_PATH).replaceAll("\\", "/"), runtimeProjectionFingerprint: runtime.projectionFingerprint,
    oxfordInventoryPath: path.relative(ROOT, OXFORD_PATH).replaceAll("\\", "/"), oxfordInventorySha256: oxfordFile.sha256,
    taxonomyPath: path.relative(ROOT, TAXONOMY_PATH).replaceAll("\\", "/"), taxonomySha256: taxonomyFile.sha256,
    taxonomyId: taxonomy.taxonomyId, taxonomyVersion: taxonomy.taxonomyVersion
  },
  ruleset: { id: RULESET, topicAssignments: "INFERRED_REVIEWABLE", domainAssignments: "INFERRED_REVIEWABLE", cefrAssignments: "SOURCE_VERIFIED_ONLY", noAgeOrGradeInference: true, noExamInference: true },
  counts,
  topics,
  learningSets,
  senses
};
const body = `${JSON.stringify(payload, null, 2)}\n`;
const fileHash = hash(body);
writeFileSync(OUTPUT_PATH, body);
writeFileSync(OUTPUT_HASH_PATH, `${fileHash}  ${path.basename(OUTPUT_PATH)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT_PATH), sha256: fileHash, counts }, null, 2));
