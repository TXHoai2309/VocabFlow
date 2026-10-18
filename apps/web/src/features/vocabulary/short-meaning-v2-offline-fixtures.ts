import type { GlobalSearchResult, VocabularyDto } from "@vocabflow/contracts";

type OfflineSenseFixture = {
  proposalIdentity: string;
  contentHash: string;
  shortMeaningStatus: "VERIFIED" | "UNRESOLVED";
  vocabulary: VocabularyDto;
};

function vocabulary(input: {
  id: number;
  proposalIdentity: string;
  contentHash: string;
  word: string;
  partOfSpeech: string;
  vietnamese: string;
  shortMeaningVi?: string;
  definitionEn: string;
  exampleEn: string;
  exampleVi: string;
}): OfflineSenseFixture {
  return {
    proposalIdentity: input.proposalIdentity,
    contentHash: input.contentHash,
    shortMeaningStatus: input.shortMeaningVi ? "VERIFIED" : "UNRESOLVED",
    vocabulary: {
      id: input.id,
      word: input.word,
      ipa: null,
      vietnamese: input.vietnamese,
      ...(input.shortMeaningVi ? { shortMeaningVi: input.shortMeaningVi, shortMeaningStatus: "VERIFIED" as const } : {}),
      definitionEn: input.definitionEn,
      exampleEn: input.exampleEn,
      examples: [{ en: input.exampleEn, vi: input.exampleVi, exampleKey: `${input.proposalIdentity}:example-1` }],
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
      contentVersion: 1,
      masterSenseIdentity: input.proposalIdentity,
      partOfSpeech: input.partOfSpeech,
      contentHash: input.contentHash,
      contentReviewStatus: "PASS",
      editorialStatus: "DRAFT"
    }
  };
}

/** Small, checked-in examples copied from the hash-pinned offline V2 result artifact. */
export const shortMeaningV2OfflineFixtures = {
  banana: vocabulary({
    id: 29385,
    proposalIdentity: "EDITORIAL_2H2B:banana:fruit",
    contentHash: "3a2b896b3b6789ad0646bf9a7486c94b9997badc0000fdf074135ccb9902f603",
    word: "banana",
    partOfSpeech: "NOUN",
    vietnamese: "quả chuối dài, thường cong, có phần ruột mềm bên trong lớp vỏ",
    shortMeaningVi: "quả chuối",
    definitionEn: "A long, usually curved fruit with a soft inside and a peel removed before eating.",
    exampleEn: "He sliced a banana into his bowl of porridge.",
    exampleVi: "Anh ấy thái một quả chuối vào bát cháo yến mạch."
  }),
  aboutAdverb: vocabulary({
    id: 29285,
    proposalIdentity: "EDITORIAL_2H2B:about:around",
    contentHash: "151b95b800d7f013f04bb2e02eaac8982db0bd361f2cea6c3276e501f81be88d",
    word: "about",
    partOfSpeech: "ADVERB",
    vietnamese: "quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó",
    shortMeaningVi: "loanh quanh",
    definitionEn: "In various places within or near an area.",
    exampleEn: "The children wandered about while we packed the bags.",
    exampleVi: "Bọn trẻ đi quanh quẩn trong lúc chúng tôi xếp đồ vào túi."
  }),
  aboutPreposition: vocabulary({
    id: 29286,
    proposalIdentity: "EDITORIAL_2H2B:about:topic",
    contentHash: "cfce591b8503f250df5d3624e5f09594c03b3afad8bbea6c2084c83779e935a8",
    word: "about",
    partOfSpeech: "PREPOSITION",
    vietnamese: "về một chủ đề hoặc vấn đề",
    shortMeaningVi: "về",
    definitionEn: "Concerning the subject or issue being discussed.",
    exampleEn: "We talked about the new library after lunch.",
    exampleVi: "Chúng tôi nói về thư viện mới sau bữa trưa."
  }),
  ageHistoricalPeriod: vocabulary({
    id: 29355,
    proposalIdentity: "EDITORIAL_2H2B:age:historical-period",
    contentHash: "61ae678373764ed6d3a95adcbb97b30004d1846b90f59fbcc9deb247f268b5aa",
    word: "age",
    partOfSpeech: "NOUN",
    vietnamese: "giai đoạn lịch sử có một đặc điểm nổi bật",
    shortMeaningVi: "thời đại",
    definitionEn: "A period characterized by a particular way of life, technology or important feature.",
    exampleEn: "The exhibition explores the age of steam travel.",
    exampleVi: "Triển lãm tìm hiểu thời đại của giao thông chạy bằng hơi nước."
  }),
  ageYearsLived: vocabulary({
    id: 29356,
    proposalIdentity: "EDITORIAL_2H2B:age:years-lived",
    contentHash: "51cc678373764ed6d3a95adcbb97b30004d1846b90f59fbcc9deb247f268b5aa",
    word: "age",
    partOfSpeech: "NOUN",
    vietnamese: "số thời gian một người hoặc sinh vật đã sống",
    shortMeaningVi: "tuổi",
    definitionEn: "The length of time that a person or living thing has been alive.",
    exampleEn: "At the age of eight, she learned to swim.",
    exampleVi: "Lúc tám tuổi, cô ấy học bơi."
  }),
  indefiniteArticle: vocabulary({
    id: 29275,
    proposalIdentity: "EDITORIAL_2H2B:a, an:indefinite",
    contentHash: "b8c3441d3764bdbaa6522b5edba84fd08b26fdd726b932e4eb5809b8dde33f83",
    word: "a, an",
    partOfSpeech: "DETERMINER",
    vietnamese: "mạo từ không xác định dùng trước danh từ đếm được số ít; có thể biểu đạt ý một người hoặc một vật nhưng không phải lúc nào cũng cần dịch thành một",
    shortMeaningVi: "mạo từ không xác định",
    definitionEn: "Used with a singular countable noun to introduce someone or something, or to describe a member of a class without identifying a particular one.",
    exampleEn: "I found an envelope under a chair.",
    exampleVi: "Tôi tìm thấy một phong bì dưới một chiếc ghế."
  }),
  tearUnresolved: vocabulary({
    id: 33951,
    proposalIdentity: "PHASE_E_2026_10_12:tear:core-sense",
    contentHash: "7ccad1050180e9d15612cce3b6d85d08f4a5bfe4237681e40baa7b95ad644154",
    word: "tear",
    partOfSpeech: "VERB",
    vietnamese: "xé; làm rách",
    definitionEn: "To pull paper, cloth, or another material so that it separates or becomes damaged.",
    exampleEn: "Nora tore the outdated map into small pieces for recycling.",
    exampleVi: "Nora xé tấm bản đồ lỗi thời thành những mảnh nhỏ để tái chế."
  })
} satisfies Record<string, OfflineSenseFixture>;

export const bananaShortMeaningSearchResult: GlobalSearchResult = {
  type: "VOCABULARY",
  id: shortMeaningV2OfflineFixtures.banana.vocabulary.id,
  title: shortMeaningV2OfflineFixtures.banana.vocabulary.word,
  subtitle: shortMeaningV2OfflineFixtures.banana.vocabulary.shortMeaningVi!,
  subtitleLabel: "Nghĩa tiếng Việt",
  imageUrl: null,
  topic: null,
  level: null
};
