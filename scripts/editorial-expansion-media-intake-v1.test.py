"""Archive-binding regressions using isolated TEST_ONLY copies, never production outputs."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec=importlib.util.spec_from_file_location('expansion_intake',Path(__file__).with_name('editorial-expansion-media-intake-v1.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
ACTUAL_ROOT=module.ROOT

class IntakeTests(unittest.TestCase):
    def setUp(self):
        parent=Path('.vocabflow-local/editorial-refresh-20261028/expansion-intake-test-only');parent.mkdir(parents=True,exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=parent)
        self.base=Path(self.temp.name).resolve()
        assert self.base.is_relative_to(parent.resolve()) # Verified recursive-cleanup target stays inside named test root.
        self.root=self.base/'media';self.root.mkdir();self.downloads=self.base/'downloads';self.downloads.mkdir()
        module.ROOT=self.root
        orders=module.read(ACTUAL_ROOT/'work-orders.json');self.job=next(j for j in orders['jobs'] if j['kind']=='WORD_AUDIO')
        orders['jobs']=[self.job]
        blob=module.guards.encode(orders);(self.root/'work-orders.json').write_bytes(blob);(self.root/'work-orders.sha256').write_text(module.sha(blob))
        # Real decodable existing audio bytes are TEST_ONLY fixtures, not new provider output.
        pilot=Path('.vocabflow-local/editorial-refresh-20261028/media-production-r0001/assets/audio')
        self.audio=next(pilot.glob('*.mp3')).read_bytes()
        self.row={'jobId':self.job['jobId'],'itemId':self.job['itemId'],'kind':self.job['kind'],'headword':self.job['headword'],'filename':self.job['requestedFilename'],'exactText':self.job['requestSpec']['text'],'actualVoice':'TEST_ONLY'}
    def tearDown(self):
        module.ROOT=ACTUAL_ROOT
        assert self.base.is_relative_to(Path('.vocabflow-local/editorial-refresh-20261028/expansion-intake-test-only').resolve())
        self.temp.cleanup()
    def archive(self,row=None,extra=None,media=None):
        path=self.downloads/'fixture.zip'
        with zipfile.ZipFile(path,'w') as z:
            z.writestr('mapping.json',json.dumps([self.row if row is None else row]));z.writestr(self.row['filename'],self.audio if media is None else media)
            if extra:z.writestr(*extra)
        return path
    def rejects(self,row=None,extra=None,media=None):
        path=self.archive(row,extra,media)
        with self.assertRaises(ValueError):module.intake(path,True,self.downloads)
        self.assertTrue(path.exists());self.assertFalse((self.root/'runs').exists())
    def test_verified_copy_then_literal_cleanup(self):
        source=self.archive();report=module.intake(source,True,self.downloads)
        self.assertTrue(report['deletedOriginalDownloadAfterVerifiedCopy']);self.assertFalse(source.exists())
        receipt=module.read(self.root/report['outputs'][0]['receiptPath']);self.assertEqual(receipt['output']['sha256'],module.sha(self.audio));self.assertFalse(receipt['runtimeEligible'])
    def test_repeated_same_zip_idempotent(self):
        source=self.archive();first=module.intake(source,False,self.downloads);second=module.intake(source,False,self.downloads)
        self.assertEqual(first['archiveSha256'],second['archiveSha256']);self.assertEqual(len(list((self.root/'runs').rglob('receipt.json'))),1)
    def test_wrong_item_id_is_rejected_before_cleanup(self):
        row=copy.deepcopy(self.row);row['itemId']='wrong';self.rejects(row)
    def test_changed_spoken_text_is_rejected(self):
        row=copy.deepcopy(self.row);row['exactText']='not the requested word';self.rejects(row)
    def test_unknown_job_is_rejected(self):
        row=copy.deepcopy(self.row);row['jobId']='unknown';self.rejects(row)
    def test_unmapped_media_is_rejected(self):self.rejects(extra=('extra.mp3',self.audio))
    def test_traversal_is_rejected(self):self.rejects(extra=('../escape.mp3',self.audio))
    def test_wrong_mime_is_rejected(self):self.rejects(media=b'not audio bytes')

if __name__=='__main__':unittest.main()
