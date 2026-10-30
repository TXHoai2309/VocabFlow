# US-63 verification — 2026-10-28

Scope: local source and built app, using fixture APIs in Chromium; no remote DB
or production access. The owner confirmed the nine-level design. The three
introductory groups have no published content and remain disabled.

## Tests

The following targeted Vitest run passed 242/242 tests in nine files:

```text
pnpm exec vitest run apps/web/src/features/learners/vocabulary-list-page.test.tsx apps/web/src/features/study/study-queue.test.ts apps/web/src/features/guest/guest-performance.test.ts apps/api/src/learner-vocabulary.test.ts apps/api/src/review-queue.test.ts apps/web/src/features/learners/topics-page.test.tsx apps/web/src/features/study/study-setup-page.test.tsx apps/web/src/features/guest/learning-fetch.test.ts apps/api/src/public-learning-index.test.ts --maxWorkers=2 --no-file-parallelism
```

Final availability-state handling added one case. The affected suite then passed
30/30 with:

```text
pnpm exec vitest run apps/web/src/features/learners/vocabulary-list-page.test.tsx --maxWorkers=1 --no-file-parallelism
```

The tests cover separate missing/blank CEFR matching, strict invalid/duplicate
parameter rejection, SQL page/count predicates, scope before queue capacity,
guest intersections/empty results, named options, unavailable foundations and
initial failure versus missing content.

## Browser and visual evidence

```text
pnpm exec playwright test e2e/learning-catalog-consistency.spec.ts e2e/nine-learning-levels.spec.ts --workers=1
```

Result: 4/4 PASS in Chromium. Account grade/topic/CEFR scope passes through setup;
guest covers initial loading, explicit Unclassified, 503/retry, no-results,
clear, reload, setup and actual guest study selection. Both use 375px and 1440px.
Reduced motion is enabled for the guest tests. Keyboard opens the native menu,
skips disabled options and toggles the supplementary disclosure.

Inspected local screenshots:

- `test-results/us59-catalog-375.png`, `us59-catalog-1440.png`.
- `test-results/us63-native-menu-375.png`, `us63-native-menu-1440.png`.
- `test-results/us63-guest-375.png`, `us63-guest-1440.png`.

These show fixture data, not a live local or production catalog. The popup is
OS/browser owned as specified in UX-CONTRACT.md; no authored-popup geometry claim.

## Static/build checks

- Web and API: `pnpm exec tsc -p apps/web/tsconfig.json --noEmit` and
  `pnpm exec tsc -p apps/api/tsconfig.json --noEmit` pass.
- `pnpm exec eslint` over all changed TS/TSX sources and the two browser specs,
  with `--max-warnings=0`, passes.
- `pnpm build` passes, including client secret/source-map scans. Existing
  large-main-chunk and ineffective-dynamic-import notices remain.
- `git diff --check` passes.
- Premium strict project audit: zero findings; JSON stored in this directory.
  `premium-ui.json` declares no additional project commands.
- Impeccable detector returned `[]` for changed filter/setup components.
- Changed TS/TSX search found no native product dialogs or clickable div/table
  header replacements. Native form controls, existing state components and the
  existing stylesheet remain canonical.
- DESIGN.md/UX-CONTRACT.md reviewed. No visual-token drift or new theme was
  introduced. UX contract records the new filter behavior; runtime token
  ownership remains `apps/web/src/styles.css`.

## Limits

No full-repository test/lint/typecheck result is claimed. The audited Docker DB
still lacks existing short-meaning/topic/display schema changes required by the
current app; this feature does not apply those migrations. No data activation,
content generation, audio/image request, provider spend or deployment occurred.
