# US-85 — Selected segment translation (ticket16)

- Status: ACCEPTED
- Assignment: owner21 sequential. Blocker14 ACCEPTED;15 now ACCEPTED.
- Verified actual DeepL usage0/1000000 and EN/VI stable. Terms7.4/7.5 output reuse,
3.3.2 provider indefinite retention,8.3.11 Developer forbids personal data reviewed.

## Technical contract before code

Private POST preview{versionId,startMs,endMs}: server derives fully-contained
source cues, immutable hash, unicode char count; quota read-only confirms finite
free<=1m/no paid products plus EN→VI capability. Maximum50cues/20000source codepoints
and128KiB provider request, explicit empty/oversize, no truncation or30card limit.
Preview never translates. Show exact English scope/count/remaining/provider and
retention/nonpersonal-content review confirmation before start. Server requires
explicit acknowledgement. No names/account IDs/learner metadata sent to provider.

Add0032 private video_translation_runs keyed owner+learner+video+version+range,
source hash+original cue snapshot,targetVI/provider/created/revision/result/status.
POST start claims persistent processing before one provider POST; stricttext/lang/
counts/bounds. Entire selected cue text supplied as context plus orderedtextarray,
sourceEN,targetVI. Completed cached exact source identity; replay/refresh never
resubmits. Unknown delivery leaves uncertain status, no automatic paid/duplicate
retry. Valid response persisted once. Completed translations remain usable on
provider quota/error; source-version isolation enforced on reads, never oldVI on
new English. Error/empty/unknown/exhausted keeps English/player/import functional.

GET translations?versionId&page returns paged20 cached results. Viewer uses
bilingual/individual Vietnamese with DeepL(deepl.com) machine suggestion attribution;
selecting/opening does not call translate. Practice/history expose translatedtext
only for already-resolved question with exact original version/hash/cue; no future
answer texts. No translation request on score/resume/read. No SRS/rewards changes.

Acceptance: web preview→confirm→uncertain retry→savedVI→reload/cache/version swap,
quota/privacy/limits/errors; API authority/auth/CAS/cache bounds, actualSQL rollback
readback/private/no learning mutations; one real small nonpersonal translation in
verified quota. Lint/typecheck/build and group browser; final full gates after21.

READY FOR IMPLEMENTATION recorded before code.
Gate passed before implementation; current status is ACCEPTED.

Acceptance: actual DeepL Free EN→VI33chars output38chars, quota1000000→999967.23 API/schema tests PASS;20 unique controlled video flows (17 prior+3 translation) PASS including exact preview/privacyack/quota/uncertainretry/cache/reload/versionisolation/resolved-onlyVI/history. ActualSQL0032–33 rollback live-output readback/uniqueID/auth/no futuretext/no learninghashmutation PASS. Latest typecheck/lint/build+secret/map and strictUIaudit0 PASS; mobile screenshot inspected. No paid endpoint/fallback or cloud migration. Finalrootregression after19/21.
