#!/usr/bin/env python3
"""Isolated mutation tests; never modify any frozen file or Git identity."""
import copy
import hashlib
import importlib.util
import unittest
from unittest.mock import patch

from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "postpublish", Path(__file__).with_name("phase-2h2j-postpublish-integrity-verify.py"))
V = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V)


def blob_id(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


class PublishedIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reader = V.Reader()
        cls.manifest = cls.reader.read(V.WS + "/manifest.json")
        cls.paths = sorted(V.ALLOWLIST)
        cls.reader.preload(cls.paths)
        cls.valid = V.verify()

    def exception(self, which, working=None, blob=None, path=None, accepted=None, oid=None):
        actual_path = self.paths[which]
        original_oid, original_blob = self.reader.blobs[V.PUBLISHED, actual_path]
        data = self.reader.raw(actual_path) if working is None else working
        return V.verify_bytes(path or actual_path, accepted or V.sha(data), data,
                              original_blob if blob is None else blob,
                              oid or original_oid, original_oid)

    def test_valid_full_inventory_and_content(self):
        self.assertEqual(self.valid["verification-results.json"]["uniquePins"], 488)
        self.assertEqual(self.valid["content-invariant-results.json"]["cumulativeCorrections"], 40)
        self.assertEqual(len(self.valid["two-file-eol-allowlist.json"]["records"]), 2)

    def test_both_valid_original_dual_representations(self):
        for i in range(2):
            result = self.exception(i)
            self.assertTrue(result["exactTransformationVerified"])
            self.assertNotEqual(result["acceptedWorkingSha256"], result["gitContentSha256"])

    def test_unauthorized_source_byte_change(self):
        with self.assertRaisesRegex(ValueError, "Accepted working"):
            V.verify_bytes("source.json", V.sha(b"body\n"), b"Body\n", b"body\n", blob_id(b"body\n"), None)

    def test_third_source_newline_difference(self):
        with self.assertRaisesRegex(ValueError, "UNAUTHORIZED_BYTE_DIFFERENCE"):
            V.verify_bytes("third.json", V.sha(b"body\r\n"), b"body\r\n", b"body\n", blob_id(b"body\n"), None)

    def test_exception_path_change(self):
        with self.assertRaisesRegex(ValueError, "UNAUTHORIZED_BYTE_DIFFERENCE"):
            self.exception(0, path=self.paths[0] + ".renamed")

    def test_git_commit_pin_change(self):
        with self.assertRaisesRegex(ValueError, "Git commit pin changed"):
            V.git_identity(published=V.PARENT)

    def test_git_blob_id_change(self):
        with self.assertRaisesRegex(ValueError, "object ID mismatch"):
            self.exception(0, oid="0" * 40)

    def test_parent_blob_pin_change(self):
        p = self.paths[1]
        oid, blob = self.reader.blobs[V.PUBLISHED, p]
        with self.assertRaisesRegex(ValueError, "object pin mismatch"):
            V.verify_bytes(p, V.ALLOWLIST[p]["working"], self.reader.raw(p), blob, oid, "0" * 40)

    def test_accepted_working_sha_change(self):
        with self.assertRaisesRegex(ValueError, "Accepted working"):
            self.exception(0, accepted="0" * 64)

    def test_checkpoint05_nonterminal_byte_change(self):
        data = self.reader.raw(self.paths[0])
        with self.assertRaisesRegex(ValueError, "dual SHA256"):
            self.exception(0, working=b" " + data[1:])

    def test_checkpoint06_fewer_newlines(self):
        data = self.reader.raw(self.paths[1]).replace(b"\r\n", b"\n", 1)
        with self.assertRaises(ValueError):
            self.exception(1, working=data)

    def test_checkpoint06_more_newlines(self):
        with self.assertRaises(ValueError):
            self.exception(1, working=self.reader.raw(self.paths[1]) + b"\r\n")

    def test_checkpoint06_extra_cr(self):
        with self.assertRaises(ValueError):
            self.exception(1, working=self.reader.raw(self.paths[1]) + b"\r")

    def test_either_exception_unauthorized_git_body(self):
        for i in range(2):
            _, blob = self.reader.blobs[V.PUBLISHED, self.paths[i]]
            altered = b" " + blob[1:]
            with self.assertRaisesRegex(ValueError, "object pin mismatch"):
                self.exception(i, blob=altered, oid=blob_id(altered))

    def test_manifest_fingerprint_change(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["fingerprint"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "fingerprint mismatch"):
            V.fingerprint(manifest, V.FINGERPRINT)

    def test_manifest_body_rehashed_cannot_change_accepted_fingerprint(self):
        manifest = copy.deepcopy(self.manifest)
        manifest["effectiveDraftSenseCount"] -= 1
        manifest["fingerprint"] = V.digest({k: v for k, v in manifest.items() if k != "fingerprint"})
        with self.assertRaisesRegex(ValueError, "fingerprint mismatch"):
            V.fingerprint(manifest, V.FINGERPRINT)

    def test_artifact_hash_change(self):
        with self.assertRaisesRegex(ValueError, "Accepted working"):
            V.verify_bytes("artifact.json", "0" * 64, b"{}\n", b"{}\n", blob_id(b"{}\n"), None)

    def test_invalid_git_ancestry(self):
        with patch.object(V, "ancestry", return_value=False):
            with self.assertRaisesRegex(ValueError, "ancestry"):
                V.git_identity()

    def mutate_content(self, path, mutation, error):
        replacement = copy.deepcopy(self.reader.read(path))
        mutation(replacement)
        original_read = self.reader.read
        def read(name):
            return replacement if name == path else original_read(name)
        with patch.object(self.reader, "read", side_effect=read):
            with self.assertRaisesRegex(ValueError, error):
                V.content_invariants(self.reader, self.manifest)

    def test_original_proposal_disappears(self):
        self.mutate_content(V.WS + "/candidate-inventory.json", lambda d: d["records"].pop(), "Missing or duplicate")

    def test_correction_ledger_loses_id(self):
        self.mutate_content(V.WS + "/applied-draft-corrections.json", lambda d: d["corrections"].pop(), "Missing or duplicate")

    def test_correction_ledger_duplicates_id(self):
        self.mutate_content(V.WS + "/applied-draft-corrections.json",
                            lambda d: d["corrections"].append(copy.deepcopy(d["corrections"][0])), "Missing or duplicate")

    def test_unselected_content_change(self):
        def alter(d):
            d["records"][-1]["content"]["grammarNotesEn"] += " unauthorized"
        self.mutate_content(V.WS + "/cumulative-remediated-effective-draft-projection.json", alter, "Unselected change")

    def test_mapping_layer_missing(self):
        def alter(d):
            next(r for r in d["records"] if r["revisionLayers"])["revisionLayers"].pop()
        self.mutate_content(V.WS + "/cumulative-content-hash-mapping.json", alter, "mapping/lineage")

    def test_detached_receipt_missing_or_invalid(self):
        with self.assertRaisesRegex(ValueError, "receipt missing or invalid"):
            V.receipt(None)
        with self.assertRaisesRegex(ValueError, "receipt missing or invalid"):
            V.receipt({"batch04Fingerprint": "0" * 64})

    def test_conflicting_accepted_parent_pin(self):
        with self.assertRaisesRegex(ValueError, "Conflicting accepted pin"):
            V.extract_pins([{"path": "same.json", "sha256": "a"}, {"path": "same.json", "sha256": "b"}])

    def test_pin_inventory_scope_missing(self):
        with self.assertRaisesRegex(ValueError, "scope mismatch"):
            V.extract_pins([])


if __name__ == "__main__":
    unittest.main(verbosity=2)
