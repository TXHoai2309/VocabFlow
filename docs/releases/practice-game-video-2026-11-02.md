# Practice/game/video Production release —2026-11-02

Status: COMPLETE. Owner requested Production deployment and DB migration for testing.

-Production origin: https://vocab-flow-steel.vercel.app
-Source:80ade561ebc3cbfd36a2039c22bfae5d692f768f, mergedPR14.
-ActiveLinuxdeployment:dpl_ZbsRUXt1e1LhKUReL5UzcuVJZsZy, READY and promoted.
-CoreCI41373643857 and TrustedDB41373643826 SUCCESS on this exactSHA.
-Scopedrelease173files retained currentmain6544-word publication and unrelatedlocalwork.

## Database and data preservation

CanonicalNeon silent-sky-84582895/br-cool-sea-a1ifkf95/neondb verified through
providerAPI and protectedidentity. ExistingguardedProductionRelease workflow applied
exactly11forward-onlymigrations0025–0035; ledger26→37, pending0. All10newtables
exist with runtimeSELECT/INSERT/UPDATE/DELETE grants. All38pre-existingbusiness/
protectedidentity table count/digests unchanged (ledgeralone intentionallychanges).
No oldtable was altered: everyALTERtargets a tablecreated in this atomictransaction.
PubliccatalogSHA256 d8499d823434123346d8142d16bd68be7062a582fd1ec7c547cf890b2d0eb492
unchanged:6544words/438sets/123topics. Existingmedia/SRS/rewards unchanged.
No reset/import/purge, rolemodelchange, paidresource or providerprocessingcalls.

## Deployment incident and resolution

GitHubProductionRelease41374099029 reacheddeploy after successfulDB gates but
failed because its existingVERCEL_TOKEN was invalid. The guardedlocalWindows
prebuilt deployment dpl_36kTe75JVQ8U6BYcT6mz8Auivipa becameREADY but runtimeAPI
failed500: ERR_MODULE_NOT_FOUND for hono. ImmediateInstantRollback restored old
dpl_FfpGieJodAJ7cXbVWLe3ncxc7md2 and health200, retaining compatibleadditiveschema.

The sameimmutablemainSHA was built directly onVercelLinux through existingGit
integration with autoAssignCustomDomains=false. ProductionbuildSHA/secret/map
guards ran. Stagedhealth/auth/publicindex200 and unauthenticatedprivate401 were
verified before promotion; publiccataloghash matched. The productiondomain was
then promoted and rechecked. No sourcecodechange or skippedCI/DB gate fixed this:
the faultyWindowsdependency packaging was replaced with Linuxpackaging.

## Real production smoke

Health/auth/publicindex200; /practice,/game,/videos200; privatevideoAPI401;
unknownAPI404JSON. ActualmobileChromium, no mockedrequests: guestpractice5
reveals/completion, gamewrong−1heart and reload/resume4/5; guestSRS bytesidentical,
zeroAPIwrites, video login gate. Screenshots and structuredchecks are localoperator
evidence under .vocabflow-local/practice-release-20261102 (not tracked/published).
No testaccount or reallearner mutations. Private account/video acceptance remains
covered by previousweb/API/actualSQL/provider tests; owner can now test with login.

## Approval review and remaining operational limit

Automaticreview rejected fullproductionrowexport to a localencryptedarchive with
keyalongside. That command neverexecuted; only server-computed aggregatecount/hash
metadata was retained. It also rejected transferringlocalVercelOAuth into persistent
GitHubEnvironmentsecret. That command neverexecuted and no GitHubsecret changed.
Safealternatives: atomicnew-objectDDL+aggregatedataproof, and exactSHA stagedLinux
build directlyonVercel with credentials remaining in thatservice.

AutomaticGitHubdeployment stillneeds a separatelyauthorized validCIdeploy token;
its workflow remainsredatdeploy. CurrentProduction is fullypromoted/healthy via
manualsame-SHA VercelGit build. Both requiredCore/TrustedDB gates aregreen.
SecretsSUPADATA_API_KEY/DEEPL_API_KEY are sensitiveProduction runtimevariables;
no values printed or bundled. No key/plan/signup/paidfallback added.

Originalworkspace remainsTXH/11fef4a with unrelateddirtyworkpreserved. Release
checkout is separate. Reviewedprovider-secret artifactguard and scopedLFattributes
are synchronizedback tosource, without reset/rebase/clean or unrelatedcommit.
