import base64
import importlib.util
import json
from pathlib import Path
import stat
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("archive_intake", Path(__file__).with_name("editorial-media-archive-v1.py"))
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6R6sAAAAASUVORK5CYII=")


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.workspace = Path.cwd().resolve()
        self.parent = self.workspace / ".vocabflow-local" / "media-archive-tests-v1"
        self.parent.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(prefix="fixture-", dir=self.parent)
        self.fixture = Path(self.temporary.name).resolve()
        self.assertTrue(self.fixture.is_relative_to(self.parent.resolve()))
        self.addCleanup(self.cleanup_verified_fixture)
        self.root = self.fixture / "production"
        self.downloads = self.fixture / "downloads"
        self.root.mkdir()
        self.downloads.mkdir()
        self.draft = self.fixture / "draft.json"
        self.draft.write_bytes(tool.encode({"items": [{"runtimeVocabularyId": 30185, "headword": "dog"}]}))
        self.order = {"jobId": "job-dog", "kind": "IMAGE", "target": {"runtimeVocabularyId": 30185, "proposalKey": "existing:dog", "masterSenseId": None},
                      "executionAllowed": True, "state": "AUTHORIZED_FOR_PRODUCTION", "relativeAttemptRoot": "runs/run/job-dog/attempt-0001",
                      "attemptId": "attempt-dog", "manifestPin": {"path": "draft.json", "byteSha256": tool.sha(self.draft.read_bytes())},
                      "draftVariantId": "draft-dog", "exampleDraftRef": None, "sourceDraftDependencyHash": "dependency-hash", "providerRequestHash": "request-hash",
                      "request": {"brief": "One friendly dog."}}
        self.write_orders()
        self.mapping = [{"word": "dog", "kind": "image", "exactText": "dog", "filename": "dog-image.png", "actualVoice": None}]

    def cleanup_verified_fixture(self):
        # Verify the resolved recursive cleanup target before TemporaryDirectory removes it.
        self.assertEqual(self.fixture.parent, self.parent.resolve())
        self.assertTrue(self.fixture.name.startswith("fixture-"))
        self.temporary.cleanup()

    def write_orders(self):
        b = tool.encode({"sourceDraft": {"path": self.draft.relative_to(self.workspace).as_posix(), "byteSha256": tool.sha(self.draft.read_bytes())}, "jobs": [self.order]})
        (self.root / "work-orders.json").write_bytes(b)
        (self.root / "work-orders.sha256").write_text(tool.sha(b) + "\n")

    def zip(self, name="batch.zip", members=None, mapping=None):
        p = self.downloads / name
        with zipfile.ZipFile(p, "w") as z:
            for filename, content in members or [("images/dog-image.png", PNG)]:
                raw = zipfile.ZipInfo(filename)
                raw.filename = filename
                raw.orig_filename = filename
                z.writestr(raw, content)
            z.writestr("mapping.json", tool.encode(mapping if mapping is not None else self.mapping))
        return p

    def run_intake(self, source, cleanup=False):
        return tool.intake(source, self.root, cleanup, self.downloads)

    def test_valid_archive_cleanup_and_exact_receipt(self):
        source = self.zip()
        r = self.run_intake(source, cleanup=True)
        self.assertTrue(r["deletedSource"])
        self.assertFalse(source.exists())
        self.assertEqual(r["outputs"], 1)
        metadata = tool.read_json(self.root / r["metadataRelative"])
        receipt = tool.read_json(self.root / metadata["outputs"][0]["receiptRelative"])
        self.assertEqual(receipt["target"], self.order["target"])
        self.assertEqual(receipt["output"]["sha256"], tool.sha(PNG))
        self.assertEqual(receipt["output"]["dimensions"], {"width": 1, "height": 1})
        self.assertFalse(receipt["runtimeEligible"])

    def test_idempotent_replay_preserves_receipt_bytes(self):
        source = self.zip()
        first = self.run_intake(source)
        receipt_path = self.root / self.order["relativeAttemptRoot"] / "receipt.json"
        before = receipt_path.read_bytes()
        self.assertEqual(self.run_intake(source), first)
        self.assertEqual(receipt_path.read_bytes(), before)

    def test_same_archive_downloaded_under_another_name_is_idempotent(self):
        source = self.zip()
        first = self.run_intake(source)
        duplicate = self.downloads / "batch (1).zip"
        duplicate.write_bytes(source.read_bytes())
        self.assertEqual(self.run_intake(duplicate), first)

    def test_path_traversal_absolute_and_windows_ads_rejected(self):
        for name in ("../dog-image.png", "/dog-image.png", "images\\dog-image.png", "images/dog-image.png:ads", "images/CON.png"):
            with self.subTest(name=name):
                source = self.zip(members=[(name, PNG)])
                with self.assertRaises(ValueError):
                    self.run_intake(source)
                self.assertFalse((self.root / "provider-bundles").exists())

    def test_case_collision_rejected(self):
        source = self.zip(members=[("images/dog-image.png", PNG), ("images/DOG-IMAGE.PNG", PNG)])
        with self.assertRaisesRegex(ValueError, "CASE_OR_PATH_COLLISION"):
            self.run_intake(source)

    def test_zip_symlink_rejected(self):
        source = self.downloads / "link.zip"
        with zipfile.ZipFile(source, "w") as z:
            i = zipfile.ZipInfo("images/dog-image.png")
            i.create_system = 3
            i.external_attr = (stat.S_IFLNK | 0o777) << 16
            z.writestr(i, "../../outside.png")
            z.writestr("mapping.json", tool.encode(self.mapping))
        with self.assertRaisesRegex(ValueError, "ZIP_SPECIAL_FILE"):
            self.run_intake(source)

    def test_unknown_job_and_omitted_target_rejected(self):
        source = self.zip(mapping=[dict(self.mapping[0], word="cat")])
        with self.assertRaisesRegex(ValueError, "UNKNOWN_OR_AMBIGUOUS_JOB"):
            self.run_intake(source)
        self.order["executionAllowed"] = False
        self.write_orders()
        with self.assertRaisesRegex(ValueError, "JOB_NOT_AUTHORIZED"):
            self.run_intake(self.zip())

    def test_incorrect_exact_audio_text_rejected(self):
        self.order.update(kind="EXAMPLE_AUDIO", request={"text": "The dog is small."}, exampleDraftRef="new-example")
        self.write_orders()
        mapping = [{"word": "dog", "kind": "example", "exactText": "The dog is big.", "filename": "dog-example.mp3", "actualVoice": "reported-only"}]
        source = self.zip(members=[("audio/dog-example.mp3", b"ID3" + b"a" * 32)], mapping=mapping)
        with self.assertRaisesRegex(ValueError, "INCORRECT_EXACT_TEXT"):
            self.run_intake(source)

    def test_different_bytes_cannot_overwrite_attempt(self):
        source = self.zip()
        self.run_intake(source)
        second = self.zip(name="other.zip", members=[("images/dog-image.png", PNG + b"changed")])
        with self.assertRaisesRegex(ValueError, "ATTEMPT_OUTPUT_CONFLICT"):
            self.run_intake(second)

    def test_wrong_download_root_cannot_cleanup(self):
        source = self.zip()
        wrong = self.fixture / "not-downloads"
        wrong.mkdir()
        outside = wrong / source.name
        outside.write_bytes(source.read_bytes())
        with self.assertRaisesRegex(ValueError, "SOURCE_MUST_BE_DIRECT_DOWNLOAD_ZIP"):
            self.run_intake(outside, cleanup=True)
        self.assertTrue(outside.exists())

    def test_mapping_rows_without_members_never_counted_as_outputs(self):
        mapping = self.mapping + [{"word": "cat", "kind": "word", "exactText": "cat", "filename": "cat-word.mp3", "actualVoice": "unverified"}]
        self.assertEqual(self.run_intake(self.zip(mapping=mapping))["outputs"], 1)

    def test_invalid_magic_rejected_before_writes(self):
        with self.assertRaisesRegex(ValueError, "INVALID_MEDIA_BYTES"):
            self.run_intake(self.zip(members=[("images/dog-image.png", b"not-a-png")]))
        self.assertFalse((self.root / "runs").exists())

    def test_modified_workorder_pin_rejected(self):
        source = self.zip()
        (self.root / "work-orders.json").write_bytes((self.root / "work-orders.json").read_bytes() + b" ")
        with self.assertRaisesRegex(ValueError, "WORK_ORDERS_PIN_MISMATCH"):
            self.run_intake(source)


if __name__ == "__main__":
    unittest.main()
