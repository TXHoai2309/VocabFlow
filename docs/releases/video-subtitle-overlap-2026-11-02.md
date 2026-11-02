# Overlapping subtitle hotfix —2026-11-02

Status: COMPLETE / US92 ACCEPTED.

Production: https://vocab-flow-steel.vercel.app
Source: e68a0bea2406b97cc2e40a05667df28aa8b36da4 / PR15
Linuxdeployment: dpl_Ax1qmKFYvFWh9jtwvUQuwUcnhUb1, READY/promoted.

## Reproduction and correction

Owner screenshot at63s: cue59.280–65.199 overlaps62.719–66.880. The viewer
usedfindIndex and selected the olderstill-activecue, lagginguntil65.199(2.48s
afternewcuestart). Exactclock63paused browserrepro failsbeforefix, passesafter.
currentCueIndex nowselects lateststartedactivecue(start<=time<end), keepsoriginal
sourceorder forequalstarts, ignoresfuture/expiredcues andinvalidclock.
No fixedtimeoffset, no source-rowrewrite or newproviderprocessing.

## Evidence

-14clock/boundary/gap/tie/backwardseek tests plus18actualAPI checks PASS.
-Fullvideo31PASS/1explicitliveplayerskip; native102cue reload/currentjump across
100cuepageboundary, buffering/pause/1.5speed/clickseek andsourceimmutability covered.
-Rootlint/typecheck/build+secret/mapscans PASS.
-CoreCI41383155074 attempt2SUCCESS; TrustedDB41383155082SUCCESS exactSHA.
 FirstCoreattempt had2existing freepractice reloadtesttimingfailures; bothsameSHA
 isolatedPASS and entireunchangedSHA rerunPASS. No test removal/suppression.
-RealproductionJS2overlap regressions: BEFORE2fail, AFTER2PASS(14.0s).
 Account/Hono/service/repository/mediaIOfixtures isolated; no realaccountwrites,
 nocredentials/privateDBread/providerquota use. This tests shippedbrowserassets.
-StagedLinuxexactJSbytesmatchlocalfixedbuild, APIhealth/auth/publicindex200 and
 unauthenticatedprivate401 beforepromotion. Postpromotioncanonicaltarget/APIchecksPASS;
 publiccataloghashunchanged d8499d823434123346d8142d16bd68be7062a582fd1ec7c547cf890b2d0eb492.

## Limits and operations

PrivateChrome session couldnotbeaccessed because ComputerUse URLconfidencepolicy
stoppedautomation; no furtherpersonalbrowserinput used. Exactvisible screenshot
text/timestamps were enough to reproducethe appselectionbug. This doesnotassert
allprovider timestampsword-perfect or change the originalaudio/source timing.

No migrationsadded; productionworkflowverifiedpending0. ExistingGitHubdeploytoken
stillinvalid; afterworkflowstopped, manualstagedVercelGitLinuxbuild ofsamegreenSHA
wasvalidatedandpromoted. No GitHubsecret/token transfer, newcredential, paidprovider
orcatalog/media/SRS/rewardmutation. Originaldirtyworkspace/TXH11fef4apreserved;
onlyexact-baseline-matching viewer/E2Efiles andnewhelper/test synchronizedback.
Evidence logs remain ignoredlocal .vocabflow-local/subtitle-fix-20261102.
