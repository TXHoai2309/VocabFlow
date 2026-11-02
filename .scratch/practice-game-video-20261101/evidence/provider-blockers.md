# Provider verification —2026-11-01

**Current:** credential/quota blockers resolved;15/16/19 accepted. Supadata actual native retrieval used1 free credit (99 remaining); DeepL actual EN→VI used33 free characters (999,967 remaining). No paid fallback, signup or upgrade. The initial investigation below is historical; see final sections for verified resolution.

Key-name/boolean-only inspection of .env,.env.local,.vocabflow-local/development.env and process found no YouTube/transcript/translation provider credentials or verified allowance configuration. No enabled connector tool offers these capabilities. No secrets printed, account signup/upgrade or processing API call made. Public documentation access only.

##15 native transcript blocker

[YouTube captions.download](https://developers.google.com/youtube/data/reference/rest/v3/captions/download) requires OAuth and permission to edit the source video; embedding an arbitrary public video supplies neither. This is not a general caption-download fallback.

[Supadata transcript documentation](https://docs.supadata.ai/get-transcript) requires an API key. Native-only timestamped retrieval would require mode=native,text=false plus actual returned English language/timing validation. Default auto can generate ASR and must never be used here. Docs price native retrieval at1 credit, including some unavailable outcomes. No account/key or remaining-credit/no-overage evidence is available, so no request is authorized by assumed free quota. No native-provider result has been verified.

Unblock15: configure a supported native-transcript credential securely and provide verifiable free/explicitly-approved allowance, remaining quota/hard no-charge limit and reuse terms. Then implement actual job/quota/error/idempotency integration and run a real allowed retrieval. No key in chat or tracked files.

##16 translation blocker

[DeepL plans](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans) currently distinguishes Developer total free characters from legacy Free monthly characters; old Free is no longer available for new purchase. This does not establish the workspace account tier or quota. [Usage endpoint](https://developers.deepl.com/api-reference/usage-and-quota/check-usage-and-limits) requires auth and reports account/key limits; unknown/no limit cannot be treated as free allowance. [Request limits](https://developers.deepl.com/docs/resources/usage-limits) bound request size; they are not spending approval. No workspace key, English→Vietnamese entitlement, reuse/data terms or verified allowance found. No translation request made.

Unblock16: securely configured provider with verified EN→VI support, free/approved plan, remaining allowance/hard charge limit and storage/reuse conditions. Then implement selected-segment preview/cache/source-version isolation/retry and verify one real allowed translation. No paid fallback.

14 imported English subtitles and player remain usable. Continue independent17→18→20.19 needs15+16+18;21 needs19+20. These dependencies stay honest, not marked done from mock/UI.

## Resolved credential/quota inspection after owner configured env

SUPADATA_API_KEY/DEEPL_API_KEY configured in ignored.env (names/booleans only inspected). Supadata official /v1/me200 Free(100/mo),used0,max100 before one actual native request,99 after; native15 ACCEPTED. DeepL /v2/usage200 count0,limit1000000,no paid products; /v3/languages EN/VI both stable/source+target.16 is now ACCEPTED after actual translation verification and web/API/SQL acceptance. DeepL terms7.4/7.5 allow retaining output,3.3.2 permits provider indefinite retention,8.3.11 prohibits personal data on Developer. Translation UI/server will require explicit reviewed nonpersonal content, display provider attribution and retention before sending. No paid upgrade. All prior missing-key statements above are historical.

DeepL live adapter Free endpoint success: one self-authored nonpersonal33-character English sentence translated to Vietnamese38characters, actual quota1000000→999967. Output saved locally for rollbackSQLreadback, no account/learner metadata sent. Adapter constrained to api-free.deepl.com, no paid endpoint fallback. Supadata actual native transcript source remains saved for rollback fixture reuse; further tests do not consume credits.
