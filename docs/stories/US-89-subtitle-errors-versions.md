# US-89 — Subtitle source errors and immutable replacement (ticket19)

- Status: ACCEPTED
- Assignment: owner21 sequential; blockers15/16/18 ACCEPTED, actualnative/translationverified.

## Technical contract before code

Add0034 private source-cue reports, key owner/learner/video/version/cue; first
reason text/timing, stableactionID+timestamp, requestidentityunique. API ownership
and sourcecue validation before insert, coalesce samecue, conflictchangedreceipt.
Private GET reports version bound<=5000cues; POST report never modifies shared
source/content or prior first outcomes. Source corrections use existing import
new immutable version, oldEN/VI/answerpins preserved, sourceattribution explicit.

Practice create excludes reportedcueIDs only in selected pinnedversion, no source
widening; zeroeligible explains. New report-source(reason) action maps current
opaquequestion to realcue server-side, persistsreport before canonical technical
firstresult. Existing reported unresolvedcue is technical even ifanswer sent;
never treat sourceerror as knowledgewrong. CAS/replay preserves firstoutcome if
alreadyresolved, reportlater adds sourceflag inhistory/feedback without regrade.
Semanticreceipt includesreportreason. No SRS/reward/catalog write/provider call.

Watch percue buttons use one versionreportsresource, stablependingID/errorretry;
practice reporttext/timing saves through same pendingaction lifecycle, masked
word not revealed before serverconfirmation. Feedback/history annotate source
reports separate from firstresult. Switchimport/nativeversion preserves oldactive
pin ifvalid, never regenerateanswers or attach oldVI to newtext. Full replacement
flow includes oldtranslation+submittedresult, newimportversion and oldreopen.

Acceptance: browser report→newattempt excludes+technicaloutcome/retry; oldtranslated
history afterreplacement/reload unchanged, oldcache onlyoldversion, native/manual
attribution. Private API/CAS/forgedcue/id conflicts and SQLrollback readback/replay/
no learning writes. Lint/typecheck/build and wholevideo. No done without evidence.

READY FOR IMPLEMENTATION recorded before code. Gate passed before implementation; current status is ACCEPTED.

Acceptance:22 controlled video browser/24API-schema/latest typecheck/lint/build + actualSQL34 rollback PASS. Report→technicalfirstresult/uncertainretry/excludeonlyreportedcue/newsourceversion verified; oldsourceEN/VI/firstresult remainimmutablewithsourceflag. HistoryDTOmissing sourceReport caught bybrowser/typecheck, fixedandrerunall23video(22PASS1liveSkip)+schemaAPI PASS. PrivateACL/readback/no learning/catalogchanges. Finalwholegroupgates after21.
