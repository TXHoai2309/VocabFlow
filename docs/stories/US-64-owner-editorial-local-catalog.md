# US-64 — Replace the local vocabulary catalog with the owner's Muse packages

- Status: IMPLEMENTED / READY FOR OWNER CHECK
- Owner authorization,2026-10-30:“giữ lại các từ hôm qua đến nay bắt đầu soạn
  mới qua muse, xóa sạch những data cũ đi”. This replaces the earlier ticket10
  priority and authorizes a dedicated local catalog replacement,not remote work.
- Keep exactly EXPANSION547,BASIC500,BASICPLUS500:1547selected entries,1547unique
  headwords,all with image/word audio/example audio. No new provider generation.
-905references reuse existing runtime IDs;642allocate new local integer IDs
  above the old maximum. These are not canonical Master identity allocations.
- Remove exactly6436other vocabulary rows from local DB after a verified
  backup/restore rehearsal. Rebuild lexical collections/topic memberships from
  the selected packages. No TRUNCATE/reset of the database or auth tables.
- Preserve accounts,households,learners,settings,foundation08/09,roles,identity,
  schema/migration history. Preserve progress for retained IDs;remove progress,
  bookmarks and review references only for retired words. Guest state requires
  a versioned,cross-tab-locked catalog reconciliation;settings remain intact.
- Archive old source packages/evidence and keep the private pre-change backup;
  no filesystem purge of originals or historical handoffs.
- Record owner media-use attestation for the selected jobs. This is not a
  legal determination or expert phonetic review. Preserve WordNet license and
  attribution for547definitions and exact existing-editorial lineage for500.
- Add a separate owner-local projection with honest OWNER_SELECTED_LOCAL
  review metadata;never fabricate independent Master review receipts/PASS.
  Its dataset mode/table/media route are unavailable outside dedicated local
  Development. Existing legacy/V2 deployed behavior remains unchanged.
- Reuse the current UI. Normal image/word/example audio controls display the
  selected files;no developer provenance/unknown-rights banners in this owner
  catalog. Source/license evidence remains in the common manifest.

## Acceptance

1. Dry-run manifest has exact keep/delete/new-ID lists,source pins,media checks
   and ownership/source evidence before deletion. Backup restore rehearsal PASS.
2. Local DB/API expose exactly1547selected words and no retired ID,with all
   selected text/media/CEFR and curated FIRST_WORDS tags. All topics/sets/counts
   and study scopes agree;empty intersections stay empty.
3. All4641slot bindings have verified bytes/receipts;audio example exact text
   matches. Existing media originals and receipts remain immutable.
4. All905retained IDs and their progress are preserved;all nonlexical/foundation
   fingerprints and migration-history prefix remain unchanged.
5. Focused API/guest/queue/progress/production-gating tests,typecheck/lint/build
   and real browser image/audio/study checks pass. Idempotent rerun writes nothing.
6. Update progress/changelog/roadmap/tickets and hand off common JSON,backup
   index and verification. No remote DB,commit,push,deploy or fresh Muse jobs.


## Implementation evidence — 2026-10-30

All six acceptance criteria passed for the dedicated local scope. Atomic apply
and backup/restore rehearsal passed; idempotent rerun returned no writes.
221 tests/15 files pass, scoped API/web typecheck and changed TypeScript lint
pass, build/secret/source-map checks pass. Real API/account-service checks and
browser guest collection/setup/study with actual image/word/sentence playback
pass. Account browser login and all-file expert listening were not performed.
Root typecheck has existing tooling errors outside this slice; see checks JSON.
No agent review ratings, remote/provider writes, commit, push or deploy.

[Result and common JSON locations](../plans/editorial-refresh-2026-10-28/owner-local-catalog-replacement-2026-10-30.md).
The owner's next UI check is not yet recorded as story acceptance.
