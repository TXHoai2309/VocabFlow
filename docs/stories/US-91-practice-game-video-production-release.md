# US-91 — Release approved practice/game/video v1 to Production

- Status: IN PROGRESS
- Authority: owner request2026-11-02: deploy Production for testing and run DB.
- Dependency:21ticketsUS70–90 ACCEPTED; latestmain83c7842 is deployed.

## Contract before release implementation

Use an isolated release checkout from currentmain, transfer only approved
practice/game/video source/tests/contracts/additive0025–0035 migrations and docs.
Preserve unrelated source workspace, existingmain publication changes, catalog,
media and learning data. Owner deployment request authorizes the necessary
release commit/push/merge for immutableSHA pipeline; no history rewrite or reset.

Production target verified through Neon API and protectedidentity:
silent-sky-84582895/br-cool-sea-a1ifkf95/neondb. Preflight read-only passes,
11pending migrations match reviewed0025–0035. Record aggregate schema/count/digests BEFORE migration, with no row export. Prove
all10 featuretables absent, and everypending statement creates newobjects/adds
columns only to tables created in this same atomicmigration transaction. Existing
application rows/tables remain untouched; failedDDL rolls back as one transaction.
Keep priorappdeployment as compatible rollback. Existingproject reports zero PITR
retention; do not create paid snapshots/resources or changeplan.

Require greenCoreCI+TrustedDB on exactmainSHA; useexistingguarded forward-only
migration path before same-SHA Vercel deployment. OlderProductionRelease workflow
failed only atdeploy due invalidstoredVerceltoken. If repeated, waitworkflowstop
then existingguardedoperatorCLI with validlocalOAuth, no concurrentrelease or
safetybypass. Preserve releaseSHA/artifact checks; never fakeCI/provenance.

Provision SUPADATA_API_KEY/DEEPL_API_KEY as server-only production secrets using
existing localkeys, no values printed. Include their names/exactvalues in existing
artifact-secret scans and child-environment sanitization; focusedmeaningful tests
verify both before release. No auth/schemafoundation change or paidprovider.

Acceptance: cleanisolatedsource/type/build/lint/focused+remoteallgates; exactSHA
deployedREADY/canonicalalias; ledgerpending0/runtimegrants and pre-existing
row/catalog/media/learning digests unchanged. Production browser/API smoke private
401/auth/origin/deeplinks and guestpractice/game, visible originalYouTube where
authorized; no testwrites to reallearnerSRS. Record URL/release/recovery/evidence.

READY gate recorded before release implementation; now executing owner-authorized release.

Automatic approval review rejected a full local production-data archive (sensitive
rows plus decryptionkey alongside). That command did not execute. Use the safer
aggregate-only baseline and forward-only atomicDDL; no sensitivebackup workaround.

Pin newly tracked0025–0035 SQL and featuretracker/source-plan text to LF so
Windows/CI migration hashes and21ticket byte/SHA records remain consistent.
Approved originalspecSHA retained separately; no oldmigration bytes changed.
