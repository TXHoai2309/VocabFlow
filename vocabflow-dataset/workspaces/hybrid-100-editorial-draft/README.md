# Hybrid 100-Sense Editorial Draft

This is an offline, non-release workspace with 100 resolved candidate identity decisions and 98 project-authored DRAFT Sense records. It is not an APPROVED release and is not copied into the canonical Master.

## Workflow

1. `pnpm vocab:hybrid-100-editorial prepare` verifies the pinned Phase 2F.1A proof, reviews the five canonical identity collisions, and writes the semantic Pass A decision file. It does not allocate UUIDs.
2. `pnpm vocab:hybrid-100-editorial materialize` audits authored text against the ignored local comparison cache, allocates RFC 9562 UUIDv7 identities once, writes revision-1 DRAFT records, validates them, and repeats materialization to confirm stable IDs and fingerprint.
3. `pnpm vocab:hybrid-100-editorial validate` checks the materialized workspace and protected canonical file snapshot.

The direct development dependency `uuid@14.0.2` provides `v7()` generation. This version supports RFC 9562 UUIDv7, and the workspace verifies lowercase canonical text, version 7, and the RFC variant before accepting an ID.

`pass-a-content.json` contains independent English and Vietnamese authoring. `editorial-decisions.json` attaches that content to the pinned candidate IDs and records CEFR only as source evidence. `identity-registry.json` is authoritative after allocation; later text edits retain the existing IDs.

## Review boundary

Phase 2F.2A: pnpm vocab:hybrid-100-editorial-review regenerates the owner-review.json and the 100-row owner decision sheet after editorial corrections. It leaves final owner approval pending and never promotes records.

- Oxford structured grouping is the semantic backbone for Oxford-backed candidates. The ten 4600-only candidates were separately reviewed for one coherent teachable meaning.
- Source and media rights are unverified. No source prose, URL, pronunciation, Provenance, classification, or media is materialized.
- New Lexeme, Sense, and child records remain DRAFT. Existing canonical Sense reuse is pinned by revision, path, and content hash without changing those records.
- The canonical Master, root dataset manifest, and canary release are frozen against the file snapshot in `manifest.json`.
- Owner/editor review and any promotion decision belong to a later phase.

## UUID generator

`uuid@14.0.2` is a direct development dependency rather than a transitive dependency. The maintained `uuid` package documents `v7()` as its RFC 9562 version 7 generator and exposes `version()` for format checks.
