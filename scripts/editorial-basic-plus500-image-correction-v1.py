"""Prepare one forward-only image correction without changing lexical content."""
import importlib.util
import json
from pathlib import Path

spec=importlib.util.spec_from_file_location('plus_authoring',Path(__file__).with_name('editorial-basic-plus500-v1.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ROOT=Path('.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001')


def main():
    base=ROOT/'dataset-complete-r0002.json';data=m.read(base)
    item=next(i for i in data['items'] if i['headword']=='phrase')
    target=ROOT/'image-corrections-r0001';orders_path=target/'work-orders.json'
    if orders_path.exists():
        orders=m.read(orders_path)
        assert orders['sourceDraft']==m.pin(base) and len(orders['jobs'])==1
    else:
        job_id=m.new_id()
        request={'prompt':'Friendly watercolor educational illustration matching BASIC-PLUS-500. One coherent square scene, neutral warm background. Illustrate phrase meaning a short group of words used together as an expression, without rendering actual words: a woman composing a letter at her desk. The sheet is entirely blank except ONE short group of THREE small solid colored rounded rectangles enclosed together by one curved brace; a small speech bubble contains the same three colored rectangles as a single group. Pen in hand, a plain sealed envelope nearby. NO handwriting, NO cursive strokes, NO simulated writing, NO alphabetic characters, NO readable words, NO numerals, NO logos, NO captions or watermarks anywhere. Rectangles must be plain solid shapes, not glyphs. Clean anatomically normal hands. Output a separate square PNG1600x1600.','outputMime':'image/png','minWidth':1024,'minHeight':1024,'allowedReadableText':[]}
        job={'jobId':job_id,'itemId':item['itemId'],'entryCode':item['entryCode'],'kind':'IMAGE','headword':item['headword'],'exampleId':None,'targetContentSha256':item['contentSha256'],'requestedFilename':job_id+'.png','requestSpec':request,'requestSpecSha256':m.stable(request),'provider':'MUSE_LOGGED_IN_UI','providerModel':None,'state':'NOT_SUBMITTED','output':None,'receipt':None,'sourceDraft':m.pin(base),'replacesJobId':item['media']['image']['jobId']}
        orders={'artifactType':'BASIC_PLUS500_IMAGE_CORRECTION_ORDERS','sourceDraft':m.pin(base),'jobs':[job]}
        m.save(orders_path,orders);m.save(target/'work-orders.sha256',(m.sha(orders_path.read_bytes())+'\n').encode())
    request={'artifactType':'MUSE_ONE_IMAGE_CORRECTION_REQUEST','sourceDraft':orders['sourceDraft'],'workOrdersSha256':m.pin(orders_path)['sha256'],'scope':'Only1replacementPNG; no text/audio edits, no new public links. Return one private small ZIP with PNG+mapping.json. Mapping exact jobId,itemId,kind,headword,filename,exactText:null,actualModel. Preserve old output.','zipFilename':'basic-plus-500-image-correction-01.zip','jobs':orders['jobs']}
    m.save(target/'muse-request-r0001.json',request)
    print(json.dumps({'jobs':1,'headword':'phrase','request':(target/'muse-request-r0001.json').as_posix(),'newJobId':orders['jobs'][0]['jobId']}))


if __name__=='__main__':main()
