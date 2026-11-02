# US-92 — Fix stale current subtitle during overlapping cues

- Status: IN PROGRESS
- Authority: owner reports Production video28d3d6de-b4b3-41bd-a04a-25194e38a482
  subtitles lag about one cue, screenshots2026-11-02. Continue approved prod test/fix.
- Dependencies: US83/US91 accepted. Currentmain80ade561.

## Contract before code

Reproduce exact screenshot timings57.039/58.295/59.280/62.719/65.199/66.880s
through actual web viewer and service boundaries; player controlled only atI/O.
Determine stale active-cue selection vs polling/seek latency vs sourceoffset.
If overlaps cause lag, active single cue must be the latest-started cue whose
start<=playerTime<end, retaining originalsourceorder for equalstarts; nofuturecue,
no expiredcue/no artificialtimeoffset. Imported/provider source and immutable
hashes/history/translation/segment ranges remain byteidentical. No newprovider
processing, DBmigration, schema/source rewrite, media/TTS/ASR or SRS/reward changes.

Acceptance: testred beforefix at63s thenPASS; chainedoverlaps/boundaries/gaps/
backwardseek/paused/buffering/speed plus same-start tie; currentjump pagination
uses correctedcue; API/firstresults/private/no-provider regressions. Existing
controls/design/accessibility preserved, no newUIprimitive. Focusedtests/build/
type/lint and wholevideoE2E; remoteCore/TrustedDB perexistingrelease gates before
same-SHA stagedLinux productionbuild/health/privacy/catalogsmoke thenpromotion.
Privatepage read throughuserbrowser only ifaccessible, no service-roleprivate
rowexport or secret transfer. Preserve alloriginaldirtywork throughisolatedcheckout.

READY contract recorded before implementation; now reproducing user screenshot.
Chrome ComputerUse failed URLconfidence policy; no further personalbrowserinput.
Source reproduction uses only visible screenshot text/timings, no privateDBread.

## Local acceptance evidence

Exact screenshot63s browserrepro failedbeforefix and passesafterfix. 14pureclock
regressions and18actualAPI testsPASS(32total); fullvideo31PASS/1explicitliveplayer
skip(49.9s), including nativeoverlaps102cue/reload/pagejump, chainboundaries,
backwardseek/paused/buffering1.5speed/source-byte invariance/noextraextraction.
Rootlint/typecheck/build/secret+map scans anddiffcheckPASS. RemoteCI/prodreload
verification pending; story remainsINPROGRESS until deployedhotfix isverified.
