"""Review the frozen first existing A1/A2 batch and propose reuse offline.

No new vocabulary/media, database writes or application changes.
"""
from collections import Counter
import csv
import hashlib
import html
import json
import os
from pathlib import Path

DATA=Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001')
LOCAL=Path('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001')
BASE=Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2')


def read(path):return json.loads(path.read_bytes())
def sha(blob):return hashlib.sha256(blob).hexdigest()
def pin(path):return {'path':path.as_posix(),'sha256':sha(path.read_bytes()),'byteLength':path.stat().st_size}
def write(path,value):
    blob=(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf8')
    if path.exists():assert path.read_bytes()==blob,'IMMUTABLE_REPORT_CONFLICT:'+str(path)
    else:path.write_bytes(blob)


# Explicit coordinator decisions after reading each of the frozen51 rows.
NOTES={
29275:'KEEP mạo từ a/an; không dùng làm chữ cái. An envelope/a chair phù hợp danh từ đếm được số ít.',
29278:'KEEP ability: năng lực thực hiện việc cụ thể; ví dụ explain difficult ideas và dịch khớp.',
29279:'KEEP able: cấu trúc be able to, khả năng/điều kiện làm việc; phân biệt competent.',
29280:'KEEP able: có năng lực trước danh từ assistant; không trộn ví dụ be able to.',
29285:'KEEP about trạng từ around: wandered about không có tân ngữ theo sau.',
29286:'KEEP about giới từ concerning: talked about the new library có đối tượng chủ đề.',
29287:'KEEP above trạng từ: examples above, vị trí được hiểu từ ngữ cảnh.',
29288:'KEEP above giới từ: clock above the door, quan hệ không gian rõ.',
29289:'KEEP abroad: ở/đến nước khác; study abroad dịch du học phù hợp ví dụ.',
29314:'KEEP accept acknowledge: accepted that the schedule had to change; không trộn receive.',
29315:'KEEP accept receive: accepted the invitation; nghĩa nhận lời và ví dụ khớp.',
30079:'KEEP accident chance: happy accident là tình cờ vui; không gắn ảnh tai nạn gây thương tích.',
30080:'KEEP accident mishap: minor accident blocked the road; tách khỏi chance.',
29322:'KEEP according to giới từ nêu nguồn timetable; không phân loại thành lời đồng tình.',
34670:'KEEP achieve: đạt mục tiêu sau nỗ lực; team achieved its goal khớp nghĩa/dịch.',
31353:'KEEP across giới từ: cycled across the footbridge có bổ ngữ; giữ riêng trạng từ.',
31354:'KEEP across trạng từ: swimming across không có bổ ngữ sau across.',
29335:'KEEP act respond: hành động nhanh để xử lý mưa; không phải diễn xuất.',
29336:'KEEP act danh từ deed: an act of kindness khớp hành động cụ thể.',
29337:'KEEP act perform: acts in a theatre company khớp diễn xuất.',
29338:'KEEP action activity: dancers in action là đang biểu diễn, tách steps-taken.',
29339:'KEEP action measures: took action to reduce waste là biện pháp giải quyết.',
34672:'KEEP active: bà duy trì hoạt động nhờ làm vườn; không suy thành mức lớp học.',
29340:'KEEP activity: drawing là hoạt động; câu và dịch tự nhiên.',
29341:'KEEP actor: người diễn nhân vật; practised là chính tả Anh-Anh hợp lệ.',
29342:'KEEP actress: nữ diễn viên; ví dụ phỏng vấn nói về vai diễn đúng đối tượng.',
30828:'KEEP actually: thông tin thực tế đối lập ấn tượng con đường ngắn.',
31364:'KEEP adult tính từ fully-grown: adult dogs không dịch thành người lớn.',
31365:'KEEP adult danh từ grown person: two adults là hai người lớn.',
30829:'KEEP adventure: trải nghiệm khám phá khác thường; mô tả nội dung không phải hướng dẫn trẻ vào nơi bỏ hoang.',
30830:'KEEP advertise: quảng bá vở kịch bằng poster, tách danh từ advertising.',
31366:'KEEP advertising: hoạt động quảng bá lớp học, không đổi sang động từ.',
30831:'KEEP advice: danh từ không đếm được; coach\'s advice và dịch khớp.',
30832:'KEEP affect động từ influence; tránh nhầm effect danh từ.',
30833:'KEEP afraid: sợ tiếng sấm; không thay câu hiện tại bằng clip câu loud noise.',
30834:'KEEP afternoon: sau trưa trước tối; không gắn audio câu football vào câu sửa hàng rào.',
30835:'KEEP again: thêm một lần nữa; read the final sentence again khớp.',
29352:'KEEP against opposition: voted against the proposal, không gắn ảnh tựa xe vào tường.',
29353:'KEEP against touching: bicycle against the wall, giữ khác opposition.',
29354:'KEEP age động từ: grandparents aged, mô tả lớn tuổi, không phải số tuổi.',
29355:'KEEP age danh từ historical period: age of steam travel là thời đại, không phải tuổi cá nhân.',
29356:'KEEP age danh từ years-lived: at the age of eight, tách historical period.',
30836:'KEEP ago: thời gian trước hiện tại, three days ago, ví dụ quá khứ khớp.',
30837:'KEEP agree accept-plan: agreed to share cost, cấu trúc agree to do.',
30838:'KEEP agree same-opinion: agree with Thu that..., giữ khác accept-plan.',
35656:'KEEP ah thán từ thể hiện nhận ra/hiểu; không ép làm từ vựng đồ vật.',
34685:'KEEP airline: hãng hàng không thêm chuyến bay; không phải aircraft.',
34686:'KEEP alive: còn sống; found the dog alive khớp vị trí tính từ sau danh từ.',
30092:'KEEP all trạng từ nhấn mạnh completely: all dry; không trộn determiner/pronoun.',
30093:'KEEP all determiner: all the blue folders trước cụm danh từ.',
30094:'KEEP all pronoun: all are ready quy chiếu chairs; số nhiều của động từ phù hợp.'}


def main():
    manifest_path=DATA/'input-manifest-r0001.json';raw=manifest_path.read_bytes();m=json.loads(raw)
    assert sha(raw)==(DATA/'input-manifest-r0001.sha256').read_text().strip()
    rows=m['inputRows'];by_id={r['runtimeVocabularyId']:r for r in rows}
    assert set(by_id)==set(NOTES) and len(rows)==51
    live=read(LOCAL/'live-capture-r0001.json');assert not live['differences']
    api={r['id']:r for r in live['apiRows']};assert set(api)==set(by_id)
    for source_pin in m['sourcePins']:assert pin(Path(source_pin['path']))==source_pin
    assets={a['mediaSha256']:a for a in read(BASE/'media/media-inventory.assets.json')['assets']}
    legacy=[r for r in read(BASE/'media/current-runtime-bindings.json')['bindings'] if r.get('frozenRuntimeVocabularyId') in by_id]
    old_by_id={};seen=set()
    for binding in legacy:
        key=(binding['frozenRuntimeVocabularyId'],binding['kind'],binding['mediaSha256'])
        if key in seen:continue
        seen.add(key);asset=assets[binding['mediaSha256']];p=Path(asset['local']['path'])
        valid=p.is_file() and pin(p)['sha256']==binding['mediaSha256']
        old_by_id.setdefault(key[0],[]).append({'kind':key[1],'assetSha256':key[2],'localPath':p.as_posix(),'bytesVerified':valid,'status':'HISTORICAL_CANDIDATE_NOT_NEWLY_SEMANTICALLY_OR_PHONETICALLY_ACCEPTED','sourceBinding':binding})
    package_paths=[Path('.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001/dataset-547-r0004.json'),Path('.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/dataset-complete-r0003.json'),Path('.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001/dataset-complete-r0003.json')]
    modern={};variant_examples=[]
    for package in package_paths:
        for item in read(package)['items']:
            rid=item.get('runtimeVocabularyId')
            if rid not in by_id:continue
            row=by_id[rid]
            assert item['headword']==row['headword'] and item['partOfSpeech']==row['partOfSpeech']
            exact=item.get('provenance',{}).get('sourceContentSha256')==row['sourceContentSha256'] and item['meaningVi']==row['meaningVi'] and item['definitionEn']==row['definitionEn'] and item['examples'][0]['en']==row['examples'][0]['en'] and item['examples'][0]['vi']==row['examples'][0]['vi']
            assert exact or rid in [31365,30833,30834], 'UNREVIEWED_VARIANT_SENSE'
            proposed={}
            for slot,binding in [('image',item['media']['image']),('wordAudio',item['media']['wordAudio']),('exampleAudio',item['media']['exampleAudio'][0])]:
                asset=Path(binding['assetPath']);receipt_path=Path(binding['receiptPath'])
                assert pin(asset)['sha256']==binding['sha256'] and asset.stat().st_size==binding['byteLength']
                assert pin(receipt_path)['sha256']==binding['receiptSha256']
                receipt=read(receipt_path);assert receipt['itemId']==item['itemId'] and receipt['jobId']==binding['jobId']
                if slot=='exampleAudio':
                    if not exact:
                        variant_examples.append({'runtimeVocabularyId':rid,'headword':row['headword'],'liveExampleEn':row['examples'][0]['en'],'availableClipText':item['examples'][0]['en'],'clip':binding,'decision':'DO_NOT_BIND_TO_DIFFERENT_LIVE_EXAMPLE'})
                        continue
                proposed[slot]={'status':'OFFLINE_REUSE_PROPOSAL_NOT_ACTIVATED','binding':binding,'providerDataset':pin(package),'sourceItemId':item['itemId'],'targetSourceContentSha256':row['sourceContentSha256'],'contextPolicy':'EXACT_FROZEN_SENSE_AND_EXAMPLE' if exact else 'SAME_RUNTIME_SENSE_SIMPLIFIED_VARIANT_WORD_IMAGE_ONLY','newPhoneticListeningClaim':False}
            modern[rid]={'exactSourceAndExample':exact,'slots':proposed}
    decisions=[]
    for row in rows:
        rid=row['runtimeVocabularyId'];e=row['historicalContentReview'];receipt_path=Path(e['receiptPath'])
        assert pin(receipt_path)['sha256']==e['receiptSha256']
        receipt=read(receipt_path)
        assert receipt['reviewerIdentity']==e['reviewerIdentity']
        assert any(x.get('proposalKey')==row['proposalKey'] and row['sourceContentSha256'] in [x.get('effectiveContentHash'),x.get('reviewedContentHash')] and (x.get('decision') or x.get('verdict') or x.get('disposition') or x.get('revisedDecision'))=='PASS' for x in receipt['entries'])
        runtime=api[rid];runtime_empty=not runtime.get('imageUrl') and not runtime.get('audioUrl') and not any(runtime.get('developmentMedia',{}).values())
        assert runtime_empty,'RUNTIME_MEDIA_CHANGED_REVIEW_REQUIRED'
        decisions.append({'runtimeVocabularyId':rid,'baselineRowId':row['baselineRowId'],'proposalKey':row['proposalKey'],'sourceContentSha256':row['sourceContentSha256'],'frozenRowSha256':sha((json.dumps(row,ensure_ascii=False,sort_keys=True,separators=(',',':'))).encode()),'headword':row['headword'],'partOfSpeech':row['partOfSpeech'],'cefr':row['currentCefr'],'meaningVi':row['meaningVi'],'definitionEn':row['definitionEn'],'examples':row['examples'],'contentDecision':'KEEP','reasonVi':NOTES[rid],'reviewer':'CURRENT_COORDINATOR_MANUAL_REVIEW','historicalIndependentReview':e,'freshIndependentReviewClaim':False,'newCefrAssessmentClaim':False,'schoolGradeAssigned':False,'runtimeMediaState':'EMPTY_LIVE_API','mediaProposal':modern.get(rid),'legacyCandidates':old_by_id.get(rid,[]),'databaseChangeProposed':False})
    summary={'artifactType':'TICKET10_BOUNDED_EDITORIAL_REVIEW_RESULT','batchId':m['batchId'],'state':'EDITORIAL_REVIEW_COMPLETE_RUNTIME_MEDIA_BINDING_PENDING','inputManifest':pin(manifest_path),'liveVerification':pin(LOCAL/'live-verification-r0001.json'),'ownedRows':51,'headwordGroups':35,'levels':m['levels'],'contentDispositions':dict(Counter(d['contentDecision'] for d in decisions)),'contentEdits':0,'existingRuntimeIdsPreserved':51,'liveRowsWithoutMedia':51,'exactExistingPackageReuseRows':sum(v['exactSourceAndExample'] for v in modern.values()),'sameSenseVariantRows':sum(not v['exactSourceAndExample'] for v in modern.values()),'proposedImageSlots':sum('image' in v['slots'] for v in modern.values()),'proposedWordAudioSlots':sum('wordAudio' in v['slots'] for v in modern.values()),'proposedExactExampleAudioSlots':sum('exampleAudio' in v['slots'] for v in modern.values()),'legacyCandidateBindingsDeduplicated':len(seen),'variantExampleClipsWithheld':len(variant_examples),'databaseWrites':0,'providerCalls':0,'newLexicalRecords':0,'newMediaJobs':0,'wholeTicketFamily10Complete':False,'runtimeGate':'Not applied: current local editorial namespace/media allowlist is pilot07-specific. Do not reuse its FIRST_WORDS tagging or claim these51 are active with media.','previewKind':'READ_ONLY_OFFLINE_COMPARISON_NOT_LEARNER_RUNTIME_INTEGRATION'}
    write(DATA/'editorial-dispositions-r0001.json',{'summary':summary,'decisions':decisions,'withheldVariantExampleAudio':variant_examples})
    write(DATA/'review-summary-r0001.json',summary)
    write(DATA/'media-reuse-proposal-r0001.json',{'inputManifest':pin(manifest_path),'sourcePackages':[pin(p) for p in package_paths],'runtimeActivation':False,'items':[{'runtimeVocabularyId':rid,**value} for rid,value in modern.items()],'withheldVariantExampleAudio':variant_examples,'preserveExistingSourceTextAndIds':True})
    with (DATA/'review-r0001.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.writer(f);writer.writerow(['runtimeId','word','POS','CEFR','decision','meaningVi','exampleEn','exampleVi','reviewNote','liveMedia','proposedMediaSlots'])
        for d in decisions:writer.writerow([d['runtimeVocabularyId'],d['headword'],d['partOfSpeech'],d['cefr'],d['contentDecision'],d['meaningVi'],d['examples'][0]['en'],d['examples'][0]['vi'],d['reasonVi'],d['runtimeMediaState'],','.join((d['mediaProposal'] or {}).get('slots',{}))])
    cards=[]
    for d in decisions:
        rid=d['runtimeVocabularyId'];proposal=(d['mediaProposal'] or {}).get('slots',{});media=[]
        for slot,label in [('image','Ảnh đề xuất'),('wordAudio','Audio từ đề xuất'),('exampleAudio','Audio câu khớp nguyên văn')]:
            if slot not in proposal:media.append('<p>'+label+': chưa có bản đề xuất khớp.</p>');continue
            asset=Path(proposal[slot]['binding']['assetPath']);relative=os.path.relpath(asset,LOCAL).replace('\\','/')
            media.append('<p>'+label+'</p>'+('<img loading="lazy" src="'+html.escape(relative,quote=True)+'" alt="'+html.escape(d['headword'],quote=True)+'">' if slot=='image' else '<audio controls preload="none" src="'+html.escape(relative,quote=True)+'"></audio>'))
        cards.append('<article id="id-'+str(rid)+'"><small>ID '+str(rid)+' · '+d['partOfSpeech']+' · '+d['cefr']+'</small><h2>'+html.escape(d['headword'])+'</h2><b>'+html.escape(d['meaningVi'])+'</b><p>'+html.escape(d['definitionEn'])+'</p><p>'+html.escape(d['examples'][0]['en'])+'<br>'+html.escape(d['examples'][0]['vi'])+'</p><p>'+html.escape(d['reasonVi'])+'</p><p>App local hiện chưa gắn media. Các file dưới đây là đề xuất dùng lại để đối chiếu.</p>'+''.join(media)+'<p><a href="http://127.0.0.1:5173/vocabulary/'+str(rid)+'">Xem nghĩa này trong app local</a></p></article>')
    page='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket10 · Rà soát51 nghĩa A1–A2</title><style>body{font:16px/1.6 system-ui;max-width:950px;margin:24px auto;padding:16px;color:#172033;background:#f4f6fb}article{background:white;padding:24px;border:1px solid #dce3ed;border-radius:12px;margin:20px 0}img{max-width:260px;height:240px;object-fit:contain}audio{display:block;max-width:100%}small{color:#53637b}</style><h1>Ticket10 · Rà soát51 nghĩa đang có</h1><p>27A1 ·24A2 ·35nhóm từ ·51KEEP về nội dung chữ. Không tạo thêm từ, ảnh hoặc TTS.</p><p>51nghĩa trên API hiện chưa có media. Đề xuất dùng lại20ảnh,20audio từ,17audio câu đúng nguyên văn; giữ riêng3clip khác câu. Đây là bảng đối chiếu offline, chưa áp dụng vào DB/app.</p>'+''.join(cards)+'</html>'
    (LOCAL/'review-gallery-r0001.html').write_text(page,encoding='utf8')
    print(json.dumps(summary))


if __name__=='__main__':main()
