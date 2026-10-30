"""Isolated additional500 ZIP intake; reuses proven guards and source-driven join."""
import argparse
import importlib.util
import json
from pathlib import Path

spec=importlib.util.spec_from_file_location('basic500_media',Path(__file__).with_name('editorial-basic500-media-v1.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ROOT=Path('.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('source',nargs='?',type=Path)
    p.add_argument('--cleanup-download',action='store_true')
    p.add_argument('--assemble',action='store_true')
    p.add_argument('--corrections',action='store_true')
    a=p.parse_args()
    assert not(a.assemble and a.corrections),'CORRECTION_ONLY_USES_ZIP_INTAKE'
    m.intake.ROOT=ROOT/'image-corrections-r0001' if a.corrections else ROOT
    if a.assemble:
        r=m.assemble(ROOT);print(json.dumps({k:v for k,v in r.items() if k not in ['missingJobIds','duplicateAssetHashesRequiringReview']}))
    else:
        assert a.source is not None,'SOURCE_ZIP_REQUIRED'
        r=m.intake.intake(a.source,cleanup=a.cleanup_download);print(json.dumps({'outputs':len(r['outputs']),'cleaned':r['deletedOriginalDownloadAfterVerifiedCopy'],'archiveSha256':r['archiveSha256']}))
