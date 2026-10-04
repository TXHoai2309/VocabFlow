# Hybrid 100-Sense Source Candidate Proof

This directory is a sanitized, deterministic source-candidate package. It is **not** a Master release and its `SOURCE-CANDIDATE-*` IDs are not Master UUIDs.

Raw APKG fields and media member names are kept only in the ignored local cache `.vocabflow-local/master-v2-hybrid-source/`. Tracked files include source identity hashes, field hashes, status flags, and candidate references; they do not contain source definitions, examples, translations, remote URLs, absolute paths, or media bytes.

Requirements: Python 3.11+ standard library only. From the repository root run `python scripts/master-vocabulary-v2-hybrid-source-proof.py --repeat`. The command verifies both APKG files, recomputes their SHA-256 identities twice, refreshes the local raw cache, checks identical proof fingerprints, and deterministically rewrites this workspace and `vocabflow-dataset/reports/hybrid-100-sense-source-proof.md`.

All rights remain UNKNOWN / UNVERIFIED, and `shipEligible` is false for every source media candidate. Do not use this workspace as runtime import input.
