# Video v1 provider configuration

Configure SUPADATA_API_KEY and DEEPL_API_KEY only in ignored local .env or the
server deployment secret store. Never use VITE_ variables for these keys. The
existing pnpm dev:api command reads .env; restart the API process after changing
its environment. Runtime bindings allowlist both names; web assets receive neither.

Supadata: verified Free100 credits/month, native timed English mode only,1 credit
per explicit start. Check plan/remaining allowance before dispatch. Unsupported
source/quota/provider failures preserve the SRT/VTT import route and original
YouTube player. Native responses are normalized/validated before immutable save.

DeepL: api-free.deepl.com only; verified EN→VI and finite Developer allowance of
1,000,000 total characters. Preview selected source/estimated characters and review
nonpersonal-content declaration before sending. Developer permits provider retention
and prohibits personal data; UI displays this and deepl.com attribution. Cache is
owner+learner+video+immutable source/version/hash+exact segment. Reads/resume do not
translate again. No ChatGPT model or OpenAI key is required for these features.

Last actual checks: Supadata100→99 credits, DeepL1,000,000→999,967 characters.
These are acceptance-time snapshots; runtime checks read live remaining allowance.
No overage, paid fallback or plan upgrade is authorized. Exhaustion disables
processing while saved content/manual import remain usable.

Prepared migrations0025–0035 require a separate reviewed release step. This task
performed only synthetic transaction-rollback local SQL rehearsal; no persistent
local/cloud migration or production deployment.
