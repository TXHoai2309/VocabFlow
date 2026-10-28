import hashlib
import importlib.util
import tempfile
import unittest
import zipfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("read-english-vocabulary-4600-media-preview.py")
SPEC = importlib.util.spec_from_file_location("media4600preview", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class SingleAssetPreviewTests(unittest.TestCase):
    def test_reads_only_the_requested_member_and_preserves_bytes(self):
        content = b"source bytes\x00\xff"
        with tempfile.TemporaryDirectory() as folder:
            archive_path = Path(folder) / "one.apkg"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("101", content)
                archive.writestr("collection.anki21", b"not read by media preview")
            actual = MODULE.read_one(str(archive_path), "101", hashlib.sha256(content).hexdigest())
            self.assertEqual(actual, content)

    def test_rejects_hash_mismatch_and_non_numeric_archive_member(self):
        with tempfile.TemporaryDirectory() as folder:
            archive_path = Path(folder) / "one.apkg"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr("101", b"original")
            with self.assertRaisesRegex(ValueError, "PINNED_MEDIA_HASH_MISMATCH"):
                MODULE.read_one(str(archive_path), "101", "0" * 64)
            with self.assertRaisesRegex(ValueError, "PINNED_MEDIA_SOURCE_INVALID"):
                MODULE.read_one(str(archive_path), "../collection.anki21", "0" * 64)


if __name__ == "__main__":
    unittest.main(verbosity=2)
