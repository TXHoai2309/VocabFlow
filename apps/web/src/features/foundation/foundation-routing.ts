export function foundationRouteForLevel(value: string): string | null {
  return value === "intro-letters-sounds" ? "/foundation/learn?module=letters" : value === "intro-first-utterances" ? "/foundation/learn?module=utterances" : null;
}
