#!/usr/bin/env python3
"""Offline editorial boundaries, adversarial QA and persisted-prose replay."""
import copy
import hashlib
import importlib.util
import subprocess
import sys
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("phase-2h2b-editorial-draft.py")
spec = importlib.util.spec_from_file_location("editorial", SCRIPT)
editorial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(editorial)


class EditorialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output, cls.report, cls.fingerprint = editorial.build()
        cls.senses = cls.output["pilot-sense-proposals.json"]["senseProposals"]
        cls.reviews = cls.output["pilot-editorial-review.json"]["groups"]
        cls.groups, _, _, _, _ = editorial.inputs()
        cls.by_word = {g["normalizedHeadword"]: g for g in cls.groups}

    def findings(self, change, *, exact=None, grams=None, siblings=None, examples=None):
        proposal = copy.deepcopy(self.senses[0])
        change(proposal)
        audit = editorial.qa(proposal, self.by_word[proposal["normalizedHeadword"]], exact or set(), grams or set(), siblings or [], examples or Counter())
        return {f["code"]: f for f in audit["findings"]}

    def test_exact_accepted_pilot_coverage_and_unique_keys(self):
        self.assertEqual(len(self.reviews), 100)
        self.assertEqual({g["candidateGroupKey"] for g in self.groups}, {r["candidateGroupKey"] for r in self.reviews})
        self.assertEqual(len({r["candidateGroupKey"] for r in self.reviews}), 100)
        self.assertEqual(len({s["proposalKey"] for s in self.senses}), len(self.senses))
        self.assertEqual(len(self.senses), 155)

    def test_references_and_independent_sense_review(self):
        by_key = {s["proposalKey"]: s for s in self.senses}
        for review in self.reviews:
            self.assertTrue(review["senseProposalKeys"])
            self.assertTrue(review["independentSenseDecisionsRequired"])
            for key in review["senseProposalKeys"]:
                self.assertEqual(by_key[key]["candidateGroupKey"], review["candidateGroupKey"])
                self.assertEqual(by_key[key]["lexemeProposalKey"], review["lexemeProposalKey"])
                self.assertEqual(by_key[key]["sourceEvidenceReferences"], review["sourceEvidenceReferences"])

    def test_stable_batches_twenty_and_authored_hashes(self):
        batches = self.output["editorial-draft-batches.json"]["batches"]
        self.assertEqual([b["groupCount"] for b in batches], [20]*5)
        self.assertEqual([k for b in batches for k in b["groupKeys"]], [g["candidateGroupKey"] for g in self.groups])
        hashes = self.output["manifest.json"]["inputPins"]["authoredSourceHashes"]
        for path, record in hashes.items():
            text = (editorial.WORKSPACE/path).read_text(encoding="utf8")
            self.assertEqual(hashlib.sha256(text.encode("utf8")).hexdigest(), record["sha256LfUtf8"])

    def test_missing_and_duplicated_authored_content_rejected(self):
        original = Path.read_text
        def missing(path, *args, **kwargs):
            text = original(path, *args, **kwargs)
            return "\n".join(line for line in text.splitlines() if not line.startswith("abandon|")) if path.name == "batch-01.psv" else text
        with patch.object(Path, "read_text", missing), self.assertRaisesRegex(ValueError, "missing groups"):
            editorial.read_authored(self.groups)
        def duplicate(path, *args, **kwargs):
            text = original(path, *args, **kwargs)
            return text + text.splitlines()[0]+"\n" if path.name == "batch-01.psv" else text
        with patch.object(Path, "read_text", duplicate), self.assertRaisesRegex(ValueError, "Duplicate Sense"):
            editorial.build()

    def test_supported_pos_substantive_bilingual_associations(self):
        for s in self.senses:
            self.assertIn(s["partOfSpeechProposal"], editorial.POS)
            self.assertGreaterEqual(len(editorial.words(s["content"]["definitionEn"])), 5)
            self.assertNotEqual(s["content"]["definitionEn"], s["normalizedHeadword"])
            self.assertNotEqual(s["content"]["meaningVi"], s["content"]["definitionEn"])
            for example in s["content"]["examples"]:
                self.assertTrue(example["en"] and example["vi"])
                self.assertNotEqual(example["en"], example["vi"])

    def test_polysemy_actual_meanings_and_pos_not_just_counts(self):
        for word, required_pos, labels in [
            ("bank", {"NOUN"}, ["financial", "river"]),
            ("record", {"NOUN", "VERB"}, ["result", "information"]),
            ("light", {"NOUN", "VERB", "ADJECTIVE"}, ["illumination", "weight"]),
            ("run", {"NOUN", "VERB"}, ["move", "manage"]),
            ("water", {"NOUN", "VERB"}, ["liquid", "water"]),
        ]:
            senses = [s for s in self.senses if s["normalizedHeadword"] == word]
            self.assertGreater(len(senses), 1)
            self.assertTrue(required_pos <= {s["partOfSpeechProposal"] for s in senses})
            text = " ".join(s["content"]["definitionEn"]+" "+s["content"]["senseLabelEn"] for s in senses).lower()
            for token in labels:
                self.assertIn(token, text)
            self.assertEqual(len({s["content"]["definitionEn"] for s in senses}), len(senses))

    def test_multiword_and_conflicts_preserve_evidence(self):
        for word in ["a, an", "have to", "according to", "carbon dioxide"]:
            self.assertIn(word, {r["normalizedHeadword"] for r in self.reviews})
        self.assertTrue(any(g["priorityDimensions"]["POS_CONFLICT"] for g in self.groups))
        audits = self.output["pilot-quality-audit.json"]["senseAudits"]
        self.assertTrue(any(f["code"] == "POS_EVIDENCE_REVIEW" for a in audits for f in a["findings"]))
        for s in self.senses:
            c = s["classificationProposal"]
            self.assertEqual(c["status"], "UNRESOLVED")
            self.assertTrue(c["sourceCefrEvidence"])
            if c["contradiction"]:
                self.assertIsNone(c["candidateCefrForReview"])

    def test_all_decisions_unresolved_no_canonical_ids_or_publication(self):
        for row in self.senses + self.reviews + self.output["pilot-lexeme-proposals.json"]["groups"]:
            self.assertEqual(row["ownerDecision"], "UNRESOLVED")
            self.assertFalse(row.get("publicationEligible", False))
            self.assertIsNone(row.get("canonicalId"))
        for s in self.senses:
            self.assertEqual(s["identityDecision"], "UNRESOLVED")
            self.assertEqual(s["canonicalIdsAllocated"], 0)
        self.assertFalse(any(editorial.AUTH.values()))

    def test_existing_master_only_comparison_under_pins(self):
        compared = [s for s in self.senses if s["existingMasterComparison"]]
        self.assertEqual(len(compared), 29)
        for s in compared:
            for c in s["existingMasterComparison"]:
                self.assertEqual(c["identityClaim"], "NONE")
                self.assertTrue(c["recordPath"] and c["contentHash"])
                self.assertIn("sharedDefinitionTokens", c)
        original = editorial.load(editorial.INPUT/"lexeme-sense-identity-review.json")
        review = self.output["pilot-editorial-review.json"]
        self.assertEqual(review["protectedLegacyCases"], original["protectedLegacyCases"])
        self.assertEqual(review["runtime284"], original["runtime284"])

    def test_generated_provenance_and_rights_all_fields(self):
        for s in self.senses:
            self.assertEqual(s["sourceRights"], editorial.RIGHTS)
            for field, text in editorial.content_fields(s).items():
                p = s["fieldAuthorship"][field]
                self.assertEqual(p["sourceType"], "GENERATED")
                self.assertTrue(p["process"])
                self.assertEqual(p["textHash"], hashlib.sha256(text.encode("utf8")).hexdigest())
                for k in ["humanAuthor", "humanReviewer", "license", "reviewDate"]:
                    self.assertIsNone(p[k])

    def test_empty_and_headword_only_definitions_fail(self):
        for text in ["", self.senses[0]["normalizedHeadword"]]:
            f = self.findings(lambda s: s["content"].update(definitionEn=text))
            self.assertIn("MEANINGLESS_DEFINITION", f)

    def test_invalid_pos_and_usage_signal(self):
        self.assertIn("INVALID_POS", self.findings(lambda s: s.update(partOfSpeechProposal="FAKE")))
        self.assertIn("POS_DEFINITION_FORM", self.findings(lambda s: s.update(partOfSpeechProposal="VERB")))

    def test_bilingual_swaps_missing_pairs_and_numeric_polarity(self):
        self.assertIn("LANGUAGE_FIELD_ASSOCIATION", self.findings(lambda s: s["content"].update(definitionEn=s["content"]["meaningVi"])))
        self.assertIn("EXAMPLE_PAIR_ASSOCIATION", self.findings(lambda s: s["content"]["examples"][0].update(vi="")))
        for code, en, vi in [("EXAMPLE_NUMBER_MISMATCH", "There are 3 lamps.", "Có 4 chiếc đèn."), ("EXAMPLE_POLARITY_MISMATCH", "The gate is not open.", "Cổng đang mở.")]:
            self.assertIn(code, self.findings(lambda s: s["content"]["examples"][0].update(en=en, vi=vi)))

    def test_duplicate_definition_reused_example_and_conflation(self):
        definition = " ".join(editorial.words(self.senses[0]["content"]["definitionEn"]))
        example = " ".join(editorial.words(self.senses[0]["content"]["examples"][0]["en"]))
        self.assertIn("DUPLICATE_SENSE_DEFINITION", self.findings(lambda s: None, siblings=[definition]*2))
        self.assertIn("REUSED_EXAMPLE", self.findings(lambda s: None, examples=Counter({example: 2})))
        self.assertIn("POSSIBLE_SENSE_CONFLATION", self.findings(lambda s: s["content"].update(definitionEn="To describe something or anything without distinguishing the different meanings.")))

    def test_copied_source_passage_and_nonpilot_corpus_checked(self):
        passage = "A completely distinctive passage of eight separate words for comparison."
        self.assertIn("SOURCE_TEXT_SIMILARITY", self.findings(lambda s: s["content"].update(definitionEn=passage), grams=editorial.ngrams(passage)))
        row = {"sourceFields": {"example": passage}, "candidateSourceSenseGroups": []}
        exact, grams = editorial.source_passages([], {"NONPILOT": [row]})
        self.assertIn(" ".join(editorial.words(passage)), exact)
        self.assertTrue(grams)

    def test_fabricated_provenance_and_rights_fail(self):
        field = next(iter(self.senses[0]["fieldAuthorship"]))
        for key in ["humanAuthor", "humanReviewer", "license", "reviewDate"]:
            self.assertIn("MISSING_OR_INVENTED_PROVENANCE", self.findings(lambda s: s["fieldAuthorship"][field].update({key: "invented"})))
        self.assertIn("MISSING_OR_INVENTED_PROVENANCE", self.findings(lambda s: s.update(fieldAuthorship={})))
        self.assertIn("UNSUPPORTED_RIGHTS_CLEARANCE", self.findings(lambda s: s.update(sourceRights="CLEARED")))

    def test_approval_id_and_implicit_identity_reuse_fail(self):
        for change in [dict(ownerDecision="APPROVED"), dict(identityDecision="APPROVED"), dict(publicationEligible=True), dict(canonicalIdsAllocated=1)]:
            self.assertIn("UNAUTHORIZED_APPROVAL_OR_ID", self.findings(lambda s: s.update(change)))
        self.assertIn("UNAUTHORIZED_IDENTITY_REUSE", self.findings(lambda s: s.update(existingMasterComparison=[{"identityClaim": "POSSIBLE"}])))

    def test_unsupported_verified_or_conflicting_cefr_fails(self):
        for change in [dict(status="VERIFIED"), dict(contradiction=True, candidateCefrForReview="A1")]:
            self.assertIn("UNSUPPORTED_CEFR_ASSERTION", self.findings(lambda s: s["classificationProposal"].update(change)))

    def test_false_positives_remain_pending_no_linguistic_pass_claim(self):
        audit = self.output["pilot-quality-audit.json"]
        self.assertEqual(audit["summary"], {"PASS": 0, "REVIEW": 155, "FAIL": 0})
        self.assertTrue(any(f["code"] == "EXAMPLE_POLARITY_MISMATCH" for a in audit["senseAudits"] for f in a["findings"]))
        self.assertTrue(all(f["humanDecision"] == "UNRESOLVED" for a in audit["senseAudits"] for f in a["findings"]))
        self.assertEqual(self.output["validation-summary.json"]["externalVerification"]["status"], "NOT_EXECUTED_BY_GENERATOR")

    def test_persisted_replay_no_write_no_external_generation(self):
        with patch.object(Path, "write_text", side_effect=AssertionError("Replay wrote files")), patch.object(subprocess, "run", side_effect=AssertionError("External process")):
            result = editorial.run(True)
        self.assertEqual(result["artifactComparison"], "PASS")
        self.assertEqual(result["fingerprint"], self.fingerprint)

    def test_authored_text_drift_changes_fingerprint_and_fails_replay(self):
        original = Path.read_text
        def drift(path, *args, **kwargs):
            text = original(path, *args, **kwargs)
            return text.replace("Charging a delivery fee", "Requesting a delivery fee") if path.name == "batch-01.psv" else text
        with patch.object(Path, "read_text", drift):
            self.assertNotEqual(editorial.build()[2], self.fingerprint)
            with self.assertRaisesRegex(ValueError, "Replay drift"):
                editorial.run(True)

    def test_manifest_pins_and_frozen_release_boundary(self):
        manifest = self.output["manifest.json"]
        self.assertEqual(manifest["inputPins"]["phase2h2aFingerprint"], editorial.PHASE2A)
        self.assertEqual(manifest["inputPins"]["hybridReleaseHash"], "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c")
        self.assertEqual(manifest["inputPins"]["hybridTreeExpected"], "51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e")
        for name, expected in manifest["artifactHashes"].items():
            self.assertEqual(editorial.digest(self.output[name]), expected)
        self.assertEqual(self.fingerprint, editorial.digest({k: v for k, v in self.output.items() if k != "manifest.json"}))
        self.assertIn("SEPARATE_CANONICAL_AUTHORING_AUTHORIZATION", self.output["future-master-materialization-contract.json"]["hardGates"])

    def test_mutation_cli_flags_rejected(self):
        for flag in ["--apply", "--approve", "--publish", "--allocate-ids"]:
            process = subprocess.run([sys.executable, "-B", str(SCRIPT), flag], capture_output=True, text=True)
            self.assertEqual(process.returncode, 2)
            self.assertIn("unrecognized arguments", process.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
