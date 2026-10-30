import { localFirstWords } from "./editorial-local-preview";
import { unclassifiedCefrFilter } from "@vocabflow/contracts";
import { sql, type SQL } from "drizzle-orm";

/** Same absent/blank semantics as the guest index's matchesCefrFilter. */
export function catalogCefrFilter(value: string): SQL {
  if (value === "intro-first-words") return localFirstWords;
  return value === unclassifiedCefrFilter
    ? sql`NULLIF(trim(md.cefr), '') IS NULL`
    : sql`md.cefr = ${value}`;
}
