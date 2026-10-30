# ADR0003 — Owner-publication catalog and active release verification

- Date:2026-10-30
- Status: ACCEPTED for the owner-authorized Production replacement.
- Authority: owner retires old vocabulary, selects547/500/500Muse packages,
  prioritizes Production, and explicitly approves “Cho phép commit/push và tiếp
  tục đến khi prod hoàn tất” in response to the request that included CI repair.

The deployed catalog now has an independent owner-publication authority, not
a canonical Master V2 authoring/promotions pipeline. The selected content and
Cloudinary bindings are frozen in `data/owner-publication/catalog-1547-r0001.json`.
This reviewed public publication manifest contains no account rows, credentials,
DB dump or raw media/source workbench. Original licenses/attribution are retained.
The separate private operational plan pins Production source-identity mapping,
backup and exactly6,411retired IDs; it is never committed.

`pnpm test` verifies all application, domain, API/auth/household, database,
migration/privilege, deployment/release safety and active tooling contracts.
It also verifies every selected content hash, all4,641bindings/4,640assets,
900/647identity counts, package/topic closure and the139/731/544/132/1levels.

31explicitly enumerated tests of retired canonical Master V2 authoring,
promotion/curation and historical snapshot states are preserved as an archive
audit. Their source hashes and reasons are recorded in
`scripts/owner-publication-release-test-scope.json`. No app/auth/DB/release-safety
test can be archived there; new tests run by default. The frozen historical
runner remains available. An actual replay of its10checks reported3PASS,
5FAIL and2blocked; those results are retained and never labeled PASS. These
old authoring artifacts do not authorize or define the new published catalog.
`pnpm test:archived-authoring` runs the original broader audit when required.
This is an explicit change of product verification scope, not a claim that the
old snapshot checks were repaired or passed.

Offline test fixtures removed by commit86a08f1are restored from pinned source
commitf88e045for active legacy adapter fixtures. Hydration never overwrites a
current authoring file and stages nothing. Private/local/generated directories
are excluded from source lint/test discovery, with all deployed/source folders
still checked. Existing dynamic JSON/SQL types in historical operator tooling
have narrow documented lint exceptions; global rules and app boundaries remain.

The previous shared CI branch is unavailable/failed53000. A new dedicated empty
project `round-pine-05524116`, branch `br-fancy-snow-aoirkprq`, is the test target.
It was created empty, not copied from Production/Development. CI retains its
purpose-specific bootstrap/provision/migration/runtime roles and isolated reset
policy. Test SQL integration runs only in trusted CI. Production/Development
canonical targets and their customer data are unchanged by this test repair.

Production still requires matching immutable main SHA, passing active Core CI
and Trusted DB integration, provider/DB identity, additive migrations and a
verified compatible runtime before data cutover. Vercel's direct Git auto-deploy
is disabled so a main push cannot race migration/release validation. New owner
media is uploaded before cutover; old Cloudinary retirement requires live1,547
verification, fresh references, matching versions and original backups. Shared
Development resources and unrelated project resources remain protected.
