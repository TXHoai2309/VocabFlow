import type { LearnerVocabularyBrowseItem } from "@vocabflow/contracts";
import { formatPartOfSpeech } from "../vocabulary/vocabulary-presentation";

export type GroupedVocabularyItem = {
  headword: string;
  primaryItem: LearnerVocabularyBrowseItem;
  senses: LearnerVocabularyBrowseItem[];
  partOfSpeechLabels: string[];
  senseCount: number;
};

/**
 * Groups a list of vocabulary browse items by headword (normalized lemma).
 * Preserves the order of appearance while consolidating multi-sense entries (e.g. 6 senses of "abuse").
 */
export function groupVocabularyByHeadword(items: LearnerVocabularyBrowseItem[]): GroupedVocabularyItem[] {
  const groups: GroupedVocabularyItem[] = [];
  const indexMap = new Map<string, number>();

  for (const item of items) {
    const normalizedKey = (item.word ?? "").trim().toLowerCase();
    if (!normalizedKey) continue;

    const existingIndex = indexMap.get(normalizedKey);
    const pos = formatPartOfSpeech(item.partOfSpeech);

    if (existingIndex !== undefined) {
      const existing = groups[existingIndex];
      existing.senses.push(item);
      if (pos && !existing.partOfSpeechLabels.includes(pos)) {
        existing.partOfSpeechLabels.push(pos);
      }
      existing.senseCount = existing.senses.length;

      // Prefer an item that has an image or verified short meaning as primary item if current doesn't
      if (!existing.primaryItem.imageUrl && item.imageUrl) {
        existing.primaryItem = { ...item };
      }
    } else {
      const group: GroupedVocabularyItem = {
        headword: item.word,
        primaryItem: item,
        senses: [item],
        partOfSpeechLabels: pos ? [pos] : [],
        senseCount: 1
      };
      indexMap.set(normalizedKey, groups.length);
      groups.push(group);
    }
  }

  return groups;
}
