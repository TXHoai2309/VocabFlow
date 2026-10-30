import type { VocabularyDto } from "@vocabflow/contracts";

type ExampleAudioSource = Pick<VocabularyDto, "developmentMedia" | "contentHash" | "masterSenseIdentity">;

export function developmentExampleAudioItems(vocabulary: ExampleAudioSource, exampleKey: string | undefined, exampleIndex: number, exampleText: string) {
  return (vocabulary.developmentMedia?.exampleAudio ?? []).filter((item) => {
    if (exampleKey) return item.exampleKey === exampleKey;
    // Preserve frozen keyless examples. Only a current sense/hash/index/text
    // binding may supply their audio, never a headword or text-only guess.
    return !item.exampleKey && item.originType === "GENERATED_EDITORIAL_LOCAL_PREVIEW"
      && Boolean(vocabulary.masterSenseIdentity) && Boolean(vocabulary.contentHash)
      && item.targetProposalKey === vocabulary.masterSenseIdentity
      && item.targetContentSha256 === vocabulary.contentHash
      && item.exampleIndex === exampleIndex && item.spokenText === exampleText;
  });
}
