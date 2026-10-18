# V2 APKG Public Media Owner Attestation

- Attestation ID: `vocabflow-v2-public-media-owner-2026-10-18`
- Recorded: 2026-10-18
- Authority: explicit VocabFlow project-owner statement in the current release request
- Status: `OWNER_ATTESTED_FOR_PUBLIC_DISPLAY`

## Owner statement and scope

The owner states that VocabFlow has the right to use and publicly display the
APKG image and audio collection incorporated into VocabFlow V2. This
attestation authorizes public display/playback of the corresponding V2 media
on the VocabFlow website.

Runtime scope is limited to a single, current V2 Sense projection that has a
valid target identity, a current SHA-256 content hash, `PASS` content review,
`DRAFT` editorial status, and one unique non-ambiguous V2 media mapping. Only
signed Cloudinary authenticated URLs in the `Vocab/v2/images` or
`Vocab/v2/audio` namespaces are eligible. Word audio additionally requires an
exact pronunciation match to the Sense IPA and pronunciation evidence.
Example audio is limited to an accepted mapping whose stable `exampleKey`
matches exactly one example on that Sense.

The attestation excludes V1 media, unrelated Cloudinary resources, unmapped
assets, ambiguous mappings, multiple pronunciation choices, and example audio
without a current matching example key. It does not change any mapping review
status or media `rights_status` value.

## Evidence distinction

This is an owner attestation, not a formal third-party license, source-page
license, contract, or independent legal opinion. No third-party license
evidence is asserted by this record. Neon media rights fields remain
`UNKNOWN_REVIEW_REQUIRED`; the attestation is not written into the vocabulary
dataset or represented as a license clearance.

## Runtime control

Production and Preview must explicitly set
`VOCABFLOW_V2_PUBLIC_MEDIA_ATTESTATION_ID` to this exact ID. Missing or
mismatched values keep media URLs withheld. The API continues to require a
signed Cloudinary delivery URL and removes source identities, mapping evidence,
and Development-only media metadata from deployed responses. No Cloudinary
asset, Neon row, mapping, or rights status is changed by this attestation.
