"""Boundary and hostile archive canaries for the offline multipart importer."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
import warnings
import zipfile

spec = importlib.util.spec_from_file_location('intake5000', Path(__file__).with_name('editorial-expansion-5000-intake-v1.py'))
intake = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intake)


class MultipartSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def parts(self, blob):
        cuts = [0, 7, 43, len(blob) - 11, len(blob)]
        paths = []
        for i, (a, b) in enumerate(zip(cuts, cuts[1:])):
            p = self.root / ('part' + str(i + 1))
            p.write_bytes(blob[a:b])
            paths.append(p)
        return paths

    def archive(self, names):
        stream = io.BytesIO()
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_DEFLATED) as z:
                for name in names:
                    z.writestr(name, b'content across boundaries' * 100)
        return stream.getvalue()

    def test_seek_and_read_across_every_boundary(self):
        blob = self.archive(['safe.json'])
        with intake.PartsReader(self.parts(blob)) as r:
            self.assertEqual(r.read(), blob)
            for start, size in [(0, 10), (6, 50), (42, 7), (len(blob) - 15, 30)]:
                r.seek(start)
                self.assertEqual(r.read(size), blob[start:start + size])
            r.seek(-4, 2)
            self.assertEqual(r.read(), blob[-4:])
            with self.assertRaises(ValueError):
                r.seek(-1)

    def test_zip_library_reads_split_headers_payload_and_directory(self):
        paths = self.parts(self.archive(['safe.json']))
        reader, z = intake.open_archive(paths)
        try:
            self.assertEqual(z.read('safe.json'), b'content across boundaries' * 100)
        finally:
            z.close()
            reader.close()

    def test_truncated_archive_rejected(self):
        with self.assertRaises(zipfile.BadZipFile):
            intake.open_archive(self.parts(self.archive(['safe.json'])[:-25]))

    def test_unsafe_paths_rejected_before_extraction(self):
        for name in ['../escape.txt', '/escape.txt', 'C:/escape.txt', 'media\\escape.txt', './escape.txt']:
            # Windows ZipInfo normalizes backslashes while writing. Construct the
            # hostile local and central names after writing to exercise the reader.
            blob = self.archive([name.replace('\\', '/')])
            if '\\' in name:
                blob = blob.replace(name.replace('\\', '/').encode(), name.encode())
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'UNSAFE_PATH'):
                intake.open_archive(self.parts(blob))
        self.assertFalse((self.root.parent / 'escape.txt').exists())

    def test_duplicate_path_rejected(self):
        with self.assertRaisesRegex(ValueError, 'DUPLICATE_ARCHIVE_PATH'):
            intake.open_archive(self.parts(self.archive(['a.json', 'a.json'])))

    def test_windows_device_and_ambiguous_names_rejected(self):
        for name in ['NUL.txt', 'media/COM1', 'a.json.', 'a.json ']:
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'UNSAFE_WINDOWS_PATH'):
                intake.open_archive(self.parts(self.archive([name])))

    def test_symlink_rejected(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as z:
            link = zipfile.ZipInfo('link')
            link.create_system = 3
            link.external_attr = 0o120777 << 16
            z.writestr(link, '../elsewhere')
        with self.assertRaisesRegex(ValueError, 'ARCHIVE_SYMLINK'):
            intake.open_archive(self.parts(stream.getvalue()))

    def test_crc_corruption_rejected(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_STORED) as z:
            z.writestr('safe.json', b'target payload' * 30)
        blob = bytearray(stream.getvalue())
        blob[blob.index(b'target payload')] ^= 1
        reader, z = intake.open_archive(self.parts(blob))
        try:
            with self.assertRaises(zipfile.BadZipFile):
                z.read('safe.json')
        finally:
            z.close()
            reader.close()


if __name__ == '__main__':
    unittest.main()
