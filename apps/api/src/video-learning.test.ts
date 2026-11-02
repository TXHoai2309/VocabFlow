import {createManagementService} from "./video-management";
import {memoryManagementRepository} from "./video-management.test-support";
import {videoPracticeResultsSchema} from "@vocabflow/contracts";
import {createSourceReportService} from "./video-source";
import type {SourceReports} from "@vocabflow/contracts";
import {createTranslationService,type StoredTranslation} from "./video-translation";
import {deeplProvider} from "./video-providers";
import { createNativeService, type StoredNativeRun } from "./video-native";
import { supadataProvider } from "./video-providers";
import { videoPracticeHistoryPage, videoPracticeResults } from "@vocabflow/learning-domain";
import { createVideoPracticeService } from "./video-practice";
import type { VideoPracticeState } from "@vocabflow/learning-domain";
import { emptyVideoWatch, type StoredVideoWatch } from "@vocabflow/learning-domain";
import { describe, expect, it } from "vitest";
import type { VideoLibraryEntry, VideoTranscript } from "@vocabflow/contracts";
import { createApp } from "./index";
import { createVideoLibraryService } from "./video-learning";
const learner = "00000000-0000-4000-8000-000000000001", youtubeId = "M7lc1UVf-VE";
function fixture(providerRequest?: typeof fetch,translationRequest?: typeof fetch) {
  const nativeRuns=new Map<string,StoredNativeRun>();
  const watches = new Map<string, StoredVideoWatch>();
  const stored = new Map<string, VideoLibraryEntry>(), transcripts = new Map<string, VideoTranscript>(); let writes = 0;
  const key = (owner: string, id: string) => `${owner}:${id}`;
  const practiceStates = new Map<string, VideoPracticeState>();
  const library = createVideoLibraryService({ authorize: async (user, target) => ["owner", "same-household-parent"].includes(user) && target === learner,
      repository: { watch: async (owner, learner, video) => structuredClone(watches.get(owner+':'+learner+':'+video) ?? emptyVideoWatch()),
      saveWatch: async (owner, learner, video, state, revision) => { const key=owner+':'+learner+':'+video; if ((watches.get(key)?.revision ?? 0)!==revision) return false; watches.set(key,structuredClone(state)); return true; },
      transcripts: async (owner, _learner, video) => [...transcripts.entries()].filter(([id, item]) => id.startsWith(`${owner}:`) && item.videoId === video).map(([, { cues: _cues, ...item }]) => item).reverse(),
        transcript: async (owner, _learner, video, version) => { const item = transcripts.get(key(owner, version)); return item?.videoId === video ? structuredClone(item) : null; },
        insertTranscript: async (owner, _learner, item) => { if(deletions.blocked.version.has([owner,_learner,item.videoId,item.versionId].join(":")))return;if (!transcripts.has(key(owner, item.versionId))) { transcripts.set(key(owner, item.versionId), structuredClone(item)); writes++; } },
        list: async (owner, _learner, page) => { const items = [...stored.entries()].filter(([id]) => id.startsWith(`${owner}:`)).map(([, entry]) => entry); return { page, pageSize: 20, total: items.length, items: items.slice((page - 1) * 20, page * 20) }; },
        read: async (owner, _learner, id) => structuredClone(stored.get(key(owner, id)) ?? null),
        findSource: async (owner, _learner, source) => structuredClone([...stored.entries()].find(([id, entry]) => id.startsWith(`${owner}:`) && entry.youtubeId === source)?.[1] ?? null),
        insert: async (owner, _learner, entry) => { if(deletions.blocked.video.has([owner,_learner,entry.id].join(":")))return;if (!stored.has(key(owner, entry.id)) && ![...stored.entries()].some(([id, item]) => id.startsWith(`${owner}:`) && item.youtubeId === entry.youtubeId)) { stored.set(key(owner, entry.id), structuredClone(entry)); writes++; } } }
  });
  const sourceRows=new Map<string,SourceReports[number]>();const sourceReportService=createSourceReportService(library,{list:async(o,l,v,version)=>[...sourceRows.entries()].filter(([key])=>key.startsWith([o,l,v,version].join(':')+':')).map(([,r])=>structuredClone(r)),insert:async(o,l,v,version,report)=>{const key=[o,l,v,version,report.cueId].join(':');if(sourceRows.has(key)||[...sourceRows.entries()].some(([k,r])=>k.startsWith([o,l,v].join(':')+':')&&r.actionId===report.actionId))return;sourceRows.set(key,structuredClone(report));}});
  const practiceService = createVideoPracticeService(library, {
    history: async (owner, learner, video, page) => videoPracticeHistoryPage([...practiceStates.entries()].filter(([key])=>key.startsWith([owner,learner,video].join(':')+':')).map(([,state])=>({state,createdAt:new Date().toISOString()})),page),
    results: async (owner,learner,video,id,page) => {const state=practiceStates.get([owner,learner,video,id].join(':'));return state?videoPracticeResults({state,createdAt:"2026-11-01T00:00:00.000Z"},page):null;},
    read: async (owner, learner, video, id) => structuredClone(practiceStates.get([owner,learner,video,id].join(':')) ?? null),
    insert: async (owner, learner, state) => { const key=[owner,learner,state.videoId,state.sessionId].join(':'); if(!practiceStates.has(key))practiceStates.set(key,structuredClone(state)); },
    replace: async (owner, learner, state, revision) => { const key=[owner,learner,state.videoId,state.sessionId].join(':'); if(practiceStates.get(key)?.revision!==revision)return false;practiceStates.set(key,structuredClone(state));return true; }
  },async(owner,learner,video,version,hash,cue)=>{const run=[...translationRuns.entries()].find(([key,r])=>key.startsWith([owner,learner,video,version].join(':')+':')&&r.hash===hash&&r.status==='success'&&r.items.some(item=>item.id===cue))?.[1];const item=run?.items.find(item=>item.id===cue);return item?{text:item.vietnamese,provider:'DeepL (deepl.com)'}:null;},sourceReportService);
  const translationRuns=new Map<string,StoredTranslation>(),translationKey=(o:string,l:string,v:string,scope:{versionId:string;startMs:number;endMs:number})=>[o,l,v,scope.versionId,scope.startMs,scope.endMs].join(':');
  const translationService=createTranslationService(library,{
    read:async(o,l,v,scope)=>structuredClone(translationRuns.get(translationKey(o,l,v,scope))??null),
    insert:async(o,l,v,run)=>{const k=translationKey(o,l,v,run);if(translationRuns.has(k)||[...translationRuns.entries()].some(([key,r])=>key.startsWith([o,l,v].join(':')+':')&&r.requestId===run.requestId))return false;translationRuns.set(k,structuredClone(run));return true;},
    replace:async(o,l,v,run,revision)=>{const k=translationKey(o,l,v,run);if(translationRuns.get(k)?.revision!==revision)return false;translationRuns.set(k,structuredClone(run));return true;},
    list:async(o,l,v,version,hash,page)=>{const all=[...translationRuns.entries()].filter(([key,r])=>key.startsWith([o,l,v,version].join(':')+':')&&r.hash===hash&&r.status==='success').map(([,r])=>{const {revision:_revision,...result}=r;void _revision;return result;});return{page,pageSize:20,total:all.length,items:all.slice((page-1)*20,page*20)};}
  },deeplProvider('controlled-test:fx',translationRequest??(async(input,init)=>{const url=String(input);if(url.includes('/usage'))return Response.json({character_count:0,character_limit:1000000});if(url.includes('/languages'))return Response.json([{lang:'en',usable_as_source:true,usable_as_target:true,status:'stable'},{lang:'vi',usable_as_source:true,usable_as_target:true,status:'stable'}]);const body=JSON.parse(String(init?.body));return Response.json({translations:body.text.map((text:string)=>({text:'VI: '+text}))});})));
  const nativeService=createNativeService(library,{
    read:async(owner,learner,video)=>structuredClone(nativeRuns.get([owner,learner,video].join(':'))??null),
    insert:async(owner,learner,video,run)=>{const k=[owner,learner,video].join(':');if(nativeRuns.has(k))return false;nativeRuns.set(k,structuredClone(run));return true;},
    replace:async(owner,learner,video,run,revision)=>{const k=[owner,learner,video].join(':');if(nativeRuns.get(k)?.revision!==revision)return false;nativeRuns.set(k,structuredClone(run));return true;}
  },supadataProvider(providerRequest?'controlled-test-key':undefined,providerRequest));
  const deletions=memoryManagementRepository({videos:()=>[...stored.entries()].map(([key,entry])=>({owner:key.slice(0,-37),learner,entry})),sources:()=>[...transcripts.entries()].map(([key,entry])=>({owner:key.slice(0,-37),learner,entry})),removeVideo:(o,_l,v)=>{stored.delete(o+':'+v);},removeSources:(o,_l,v,ids)=>{for(const [key,entry]of transcripts)if(key.startsWith(o+':')&&entry.videoId===v&&ids.has(entry.versionId))transcripts.delete(key);},watches,native:nativeRuns,sessions:practiceStates,translations:translationRuns,reports:sourceRows});
  const videoManagementService=createManagementService(library,deletions.repository);
  const app = createApp({videoManagementService,sourceReportService,translationService,nativeService,readSession: async request => request.headers.get("x-user") ? { user: { id: request.headers.get("x-user")! } } : null,videoLibraryService:library,videoPracticeService:practiceService});
  async function request(path = "", body?: unknown, owner = "owner", target = learner) { return app.request(`http://localhost/api/learners/${target}/video-library${path}`, { headers: { "x-user": owner, "Content-Type": "application/json" }, ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) }); }
  return { request, stored, transcripts, practiceStates,translationRuns,sourceRows,deletions, writes: () => writes };
}
describe("private single-video library", () => {
  it("a native provider response arriving after confirmed whole-video deletion cannot recreate its source", async () => {
    let unblock!:()=>void,started!:()=>void;const gate=new Promise<void>(resolve=>{unblock=resolve;}),ready=new Promise<void>(resolve=>{started=resolve;});let extraction=0;
    const f=fixture(async input=>{if(String(input).endsWith('/me'))return Response.json({plan:'Free',maxCredits:100,usedCredits:0});extraction++;started();await gate;return Response.json({lang:'en',content:[{text:'This is delayed source.',offset:1000,duration:2000}]});});const id=crypto.randomUUID();await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`});const pending=f.request(`/${id}/native-transcript`,{requestId:crypto.randomUUID()});await ready;const removed=await f.request(`/${id}/management/delete`,{actionId:crypto.randomUUID(),scope:{kind:'video',id},expectedRevision:0,confirmed:true});expect(removed.status).toBe(200);unblock();expect((await pending).status).not.toBe(200);expect(f.transcripts.size).toBe(0);expect(f.stored.size).toBe(0);expect(extraction).toBe(1);
  });
  it("private management preview/confirmation/replay/epoch and whole-video tombstone preserve another owner", async () => {
    const f=fixture(),id=crypto.randomUUID(),versionId=crypto.randomUUID();await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`});await f.request(`/${id}/transcripts`,{versionId,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nThis is private source.'});const other=crypto.randomUUID();await f.request('',{videoId:other,url:`https://youtu.be/${youtubeId}`},'same-household-parent');const base=`/${id}/management`;
    expect((await f.request(`${base}?kind=version&page=1`,undefined,'same-household-parent')).status).toBe(404);expect((await f.request(base+'/preview',{kind:'video',id},'foreign')).status).toBe(403);expect((await f.request(base+'/preview',{kind:'video',id},'')).status).toBe(401);expect((await f.request(`${base}?kind=version&page=0`)).status).toBe(400);
    const preview=await(await f.request(base+'/preview',{kind:'version',id:versionId})).json();expect(preview.counts.versions).toBe(1);const input={actionId:crypto.randomUUID(),scope:{kind:'version',id:versionId},expectedRevision:0,confirmed:true};expect((await f.request(base+'/delete',{...input,confirmed:false})).status).toBe(400);
    const [a,b]=await Promise.all([f.request(base+'/delete',input),f.request(base+'/delete',input)]);expect(a.status).toBe(200);expect(b.status).toBe(200);const result=await a.json();expect(result.dataRevision).toBe(1);expect(await b.json()).toEqual(result);expect((await f.request(`/${id}/transcripts`,{versionId:crypto.randomUUID(),format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nOld client attempts writing.'})).status).toBe(409);
    const full={actionId:crypto.randomUUID(),scope:{kind:'video',id},expectedRevision:1,confirmed:true};const removed=await(await f.request(base+'/delete',full)).json();expect(removed.deleted).toBe(true);expect(await(await f.request(base+'/delete',full)).json()).toEqual(removed);expect((await f.request(base+'/delete',{...full,scope:{kind:'video',id:other}})).status).toBe(409);expect((await f.request(`/${id}`)).status).toBe(404);expect((await f.request(`/${other}`,undefined,'same-household-parent')).status).toBe(200);expect((await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`})).status).toBe(503);
  });
  it("source report records technical first outcome, excludes new gaps and keeps original translated/version history", async () => {
    const f=fixture(),id=crypto.randomUUID(),versionId=crypto.randomUUID();await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`});await f.request(`/${id}/transcripts`,{versionId,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nWe are learning English.\n\n2\n00:00:04,000 --> 00:00:06,000\nThis is another sentence.'});const path=`/${id}/practice-sessions`,sessionId=crypto.randomUUID(),config={sessionId,versionId,startMs:1000,endMs:6000};let state=await(await f.request(path,config)).json();const action={actionId:crypto.randomUUID(),questionId:state.current.questionId,kind:'report-source',reason:'timing'};state=await(await f.request(`${path}/${sessionId}/actions`,action)).json();expect(state.feedback.outcome).toBe('technical');expect(state.feedback.sourceReport).toBe('timing');expect(await(await f.request(`${path}/${sessionId}/actions`,action)).json()).toEqual(state);expect((await f.request(`${path}/${sessionId}/actions`,{...action,reason:'text'})).status).toBe(409);
    const reportPath=`/${id}/transcripts/${versionId}/reports`, reports=await(await f.request(reportPath)).json();expect(reports).toHaveLength(1);expect(reports[0].cueId).toBe('cue-1');expect((await f.request(reportPath,{actionId:crypto.randomUUID(),cueId:'cue-999',reason:'text'})).status).toBe(400);expect((await f.request(reportPath,undefined,'same-household-parent')).status).toBe(404);
    const fresh=await(await f.request(path,{...config,sessionId:crypto.randomUUID()})).json();expect(fresh.total).toBe(1);expect(fresh.current.maskedText).not.toContain('We are');const old=await(await f.request(`${path}/${sessionId}/results`)).json();expect(videoPracticeResultsSchema.safeParse(old).success).toBe(true);expect(old.items[0]).toMatchObject({text:'We are learning English.',outcome:'technical',sourceReport:'timing'});
    const replacement=crypto.randomUUID();await f.request(`/${id}/transcripts`,{versionId:replacement,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nThis is corrected English.'});expect((await(await f.request(path,{...config,versionId:replacement,sessionId:crypto.randomUUID(),endMs:3000})).json()).total).toBe(1);expect((await(await f.request(`${path}/${sessionId}/results`)).json()).items).toEqual(old.items);
  });
  it("translation preview derives selected source/quota and reuses a private immutable EN-VI result without duplicate calls", async () => {
    let posts=0;const bodies:unknown[]=[];const f=fixture(undefined,async(input,init)=>{const url=String(input);if(url.endsWith('/usage'))return Response.json({character_count:0,character_limit:1000000});if(url.includes('/languages'))return Response.json([{lang:'en',usable_as_source:true,usable_as_target:true,status:'stable'},{lang:'vi',usable_as_source:true,usable_as_target:true,status:'stable'}]);posts++;bodies.push(JSON.parse(String(init?.body)));return Response.json({translations:[{text:'Chúng ta đang học tiếng Anh.'}]});});
    const id=crypto.randomUUID(),versionId=crypto.randomUUID();await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`});await f.request(`/${id}/transcripts`,{versionId,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nWe are learning English.\n\n2\n00:00:05,000 --> 00:00:08,000\nOutside selected source.'});const scope={versionId,startMs:1000,endMs:3000},path=`/${id}/translations`,requestId=crypto.randomUUID();
    const preview=await(await f.request(path+'/preview',scope)).json();expect(preview.cues).toHaveLength(1);expect(preview.characters).toBe(24);expect(posts).toBe(0);expect((await f.request(path,{...scope,requestId})).status).toBe(400);
    const body={...scope,requestId,reviewedNonpersonal:true};const [a,b]=await Promise.all([f.request(path,body),f.request(path,body)]);expect(a.status).toBe(200);expect(b.status).toBe(200);const result=await(await f.request(path,body)).json();expect(result.status).toBe('success');expect(result.items[0].vietnamese).toBe('Chúng ta đang học tiếng Anh.');expect(posts).toBe(1);expect(bodies[0]).toMatchObject({source_lang:'EN',target_lang:'VI',text:['We are learning English.'],context:'We are learning English.'});
    expect((await(await f.request(`${path}?versionId=${versionId}`)).json()).total).toBe(1);expect((await f.request(path+'/preview',scope,'same-household-parent')).status).toBe(404);expect((await f.request(path,body,'foreign')).status).toBe(403);expect((await f.request(`${path}?versionId=${versionId}&page=0`)).status).toBe(400);
    const second=crypto.randomUUID();await f.request(`/${id}/transcripts`,{versionId:second,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nWe are learning English.'});expect((await(await f.request(`${path}?versionId=${second}`)).json()).items).toEqual([]);expect((await f.request(path,{...body,versionId:second})).status).toBe(409);expect(posts).toBe(1);
  });
  it("translation never dispatches when quota/entitlement is unknown and uncertain delivery never creates another translation", async () => {
    for(const mode of ['quota','uncertain']){let posts=0;const f=fixture(undefined,async(input)=>{const url=String(input);if(url.endsWith('/usage'))return mode==='quota'?Response.json({character_count:1,character_limit:1000000000000}):Response.json({character_count:0,character_limit:1000000});if(url.includes('/languages'))return Response.json([{lang:'en',usable_as_source:true,usable_as_target:true,status:'stable'},{lang:'vi',usable_as_source:true,usable_as_target:true,status:'stable'}]);posts++;throw new Error('controlled timeout');});const id=crypto.randomUUID(),versionId=crypto.randomUUID();await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`});await f.request(`/${id}/transcripts`,{versionId,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nThis is a source.'});const body={versionId,startMs:1000,endMs:3000,requestId:crypto.randomUUID(),reviewedNonpersonal:true};const first=await f.request(`/${id}/translations`,body);if(mode==='quota'){expect(first.status).toBe(503);expect(posts).toBe(0);}else{expect((await first.json()).status).toBe('uncertain');expect((await(await f.request(`/${id}/translations`,body)).json()).status).toBe('uncertain');expect(posts).toBe(1);}}
  });
  it("native transcript is fetched once in Free quota and retains real timing/language/source through private readback", async () => {
    const calls: string[] = []; const f = fixture(async (input, init) => { const url=String(input);calls.push(url); expect((init?.headers as Record<string,string>)["x-api-key"]).toBe("controlled-test-key"); return Response.json(url.endsWith('/me')?{plan:"Free (100/mo)",maxCredits:100,usedCredits:0}:{lang:"en",content:[{text:"This is native speech.",offset:1000,duration:2000,lang:"en"}]}); });
    const id=crypto.randomUUID(),requestId=crypto.randomUUID();await f.request("",{videoId:id,url:`https://youtu.be/${youtubeId}`});const base=`/${id}/native-transcript`;
    const [a,b]=await Promise.all([f.request(base,{requestId}),f.request(base,{requestId:crypto.randomUUID()})]);expect(a.status).toBe(200);expect(b.status).toBe(200);
    expect((await (await f.request(base,{requestId})).json()).status).toBe("success");expect(calls.filter(url=>url.includes('/transcript?'))).toHaveLength(1);const url=new URL(calls.find(url=>url.includes('/transcript?'))!);expect(url.searchParams.get('mode')).toBe('native');expect(url.searchParams.get('text')).toBe('false');
    const transcript=await(await f.request(`/${id}/transcripts/${requestId}`)).json();expect(transcript).toMatchObject({source:"supadata-native",cues:[{startMs:1000,endMs:3000,text:"This is native speech."}]});const count=calls.length;
    expect((await f.request(base,undefined,"same-household-parent")).status).toBe(404);expect((await f.request(base,{requestId},"foreign")).status).toBe(403);expect(calls).toHaveLength(count);
    expect((await f.request(base,{requestId,mode:"generate"})).status).toBe(400);expect(JSON.stringify(await(await f.request(base)).json())).not.toContain("controlled-test-key");
  });
  it("native async jobs poll the same server-held identity, never start a second extraction", async () => {
    let starts=0,polls=0;const f=fixture(async input=>{const url=String(input);if(url.endsWith('/me'))return Response.json({plan:"Free",maxCredits:100,usedCredits:2});if(url.includes('/transcript?')){starts++;return Response.json({jobId:"controlled-job"},{status:202});}polls++;return Response.json(polls===1?{status:"active"}:{status:"completed",lang:"en",content:[{text:"We are listening now.",offset:4000,duration:2000}]});});const id=crypto.randomUUID();await f.request("",{videoId:id,url:`https://youtu.be/${youtubeId}`});const base=`/${id}/native-transcript`;
    expect((await(await f.request(base,{requestId:crypto.randomUUID()})).json()).status).toBe("waiting");expect(JSON.stringify(await(await f.request(base)).json())).not.toContain("controlled-job");expect((await(await f.request(base+'/poll',{})).json()).status).toBe("waiting");expect((await(await f.request(base+'/poll',{})).json()).status).toBe("success");expect(starts).toBe(1);expect(polls).toBe(2);
  });
  it("native quota is fail-closed and ambiguous requests never redispatch; malformed or different-language sources cannot succeed", async () => {
    for(const quota of [{plan:"Free",maxCredits:100,usedCredits:100},{plan:"Pro",maxCredits:3000,usedCredits:0},null]){let starts=0;const f=fixture(async input=>{if(String(input).endsWith('/me'))return quota?Response.json(quota):new Response('',{status:503});starts++;return Response.json({});});const id=crypto.randomUUID();await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`});expect((await(await f.request(`/${id}/native-transcript`,{requestId:crypto.randomUUID()})).json()).status).toBe('failed');expect(starts).toBe(0);}
    for(const data of [null,{lang:'vi',content:[{text:'This is not English.',offset:0,duration:2000}]},{lang:'en',content:'plain text'},{lang:'en',content:[]}]){let starts=0;const f=fixture(async input=>{if(String(input).endsWith('/me'))return Response.json({plan:'Free',maxCredits:100,usedCredits:0});starts++;if(data===null)throw new Error('controlled network failure');return Response.json(data);});const id=crypto.randomUUID();await f.request('',{videoId:id,url:`https://youtu.be/${youtubeId}`});const path=`/${id}/native-transcript`,first=await(await f.request(path,{requestId:crypto.randomUUID()})).json();expect(first.status).toBe(data===null?'uncertain':'failed');expect(await(await f.request(path,{requestId:crypto.randomUUID()})).json()).toEqual(first);expect(starts).toBe(1);expect((await(await f.request(`/${id}/transcripts`)).json()).items).toEqual([]);}
  });
  it("canonicalizes supported one-video URLs, deduplicates source and replays the same creation", async () => {
    const f = fixture(); const id = crypto.randomUUID();
    const first = await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}?si=tracking` }); expect(first.status).toBe(200);
    const video = await first.json(); expect(video).toMatchObject({ id, youtubeId, canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}` });
    for (const url of [`https://www.youtube.com/watch?v=${youtubeId}`, `https://m.youtube.com/shorts/${youtubeId}`, `https://youtube.com/embed/${youtubeId}`]) expect(await (await f.request("", { videoId: crypto.randomUUID(), url })).json()).toEqual(video);
    expect(await (await f.request("", { videoId: id, url: video.canonicalUrl })).json()).toEqual(video);
    expect((await f.request("", { videoId: id, url: "https://youtu.be/abcdefghijk" })).status).toBe(409);
    expect(await (await f.request(`/${id}`)).json()).toEqual(video); expect((await (await f.request()).json()).items).toEqual([video]); expect(f.writes()).toBe(1);
  });
  it("never fetches or stores non-video, playlist, forged-host or credential-bearing URLs", async () => {
    const f = fixture();
    for (const url of ["javascript:alert(1)", "https://127.0.0.1/watch?v=M7lc1UVf-VE", "https://youtube.com.attacker.invalid/watch?v=M7lc1UVf-VE", "https://www.youtube.com/playlist?list=PL123", `https://www.youtube.com/watch?v=${youtubeId}&list=PL123`, "https://www.youtube.com/@channel", `https://name:password@youtube.com/watch?v=${youtubeId}`, `https://youtube.com:8443/watch?v=${youtubeId}`, `https://youtube.com/watch?v=${youtubeId}&v=abcdefghijk`, "https://youtu.be/short", "file:///etc/passwd"]) expect((await f.request("", { videoId: crypto.randomUUID(), url })).status).toBe(400);
    expect(f.writes()).toBe(0);
  });
  it("requires session, learner authorization and row ownership even for another parent in the household", async () => {
    const f = fixture(); const id = crypto.randomUUID(); await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}` });
    expect((await f.request("", undefined, "")).status).toBe(401); expect((await f.request(`/${id}`, undefined, "foreign")).status).toBe(403);
    expect((await f.request(`/${id}`, undefined, "owner", crypto.randomUUID())).status).toBe(403);
    expect((await f.request(`/${id}`, undefined, "same-household-parent")).status).toBe(404);
    expect((await (await f.request("", undefined, "same-household-parent")).json()).total).toBe(0);
    expect((await f.request("", { videoId: crypto.randomUUID(), url: `https://youtu.be/${youtubeId}` }, "same-household-parent")).status).toBe(200); expect(f.writes()).toBe(2);
    expect((await f.request(`/${id}`)).headers.get("cache-control")).toBe("no-store");
  });
  it("validates input/pages and serializes concurrent duplicate link/ID writes", async () => {
    const f = fixture(); const body = { videoId: crypto.randomUUID(), url: `https://youtu.be/${youtubeId}` };
    const responses = await Promise.all([f.request("", body), f.request("", body), f.request("", { ...body, videoId: crypto.randomUUID() })]);
    const values = await Promise.all(responses.map(response => response.json())); expect(values[0]).toEqual(values[1]); expect(values[1]).toEqual(values[2]); expect(f.writes()).toBe(1);
    expect((await f.request("", { ...body, ownerUserId: "other" })).status).toBe(400);
    for (const query of ["?page=0", "?page=abc", "?page=1&page=2", "?owner=other"]) expect((await f.request(query)).status).toBe(400);
    const second = await (await f.request("?page=2")).json(); expect(second.items).toEqual([]); expect(second.total).toBe(1);
  });
  it("imports immutable timed SRT/VTT versions, strips markup, replays once and protects ownership", async () => {
    const f = fixture(), id = crypto.randomUUID(); await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}` });
    const versionId = crypto.randomUUID(), text = "1\n00:00:01,000 --> 00:00:03,500\nHello <b>world</b>.\n\n2\n00:00:03,000 --> 00:00:05,000\nThis is English.";
    const input = { versionId, format: "srt", language: "en", text }, path = `/${id}/transcripts`;
    const first = await f.request(path, input); expect(first.status).toBe(200); const transcript = await first.json();
    expect(transcript.cues).toEqual([{ id: "cue-1", startMs: 1000, endMs: 3500, text: "Hello world." }, { id: "cue-2", startMs: 3000, endMs: 5000, text: "This is English." }]);
    expect(await (await f.request(path, input)).json()).toEqual(transcript); expect((await f.request(path, { ...input, text: text.replace("Hello", "Welcome") })).status).toBe(409);
    expect((await f.request(path, { ...input, versionId: crypto.randomUUID(), format: "vtt", text: "WEBVTT\n\n00:01.000 --> 00:04.000 align:start\nWelcome to the video." })).status).toBe(200);
    expect((await (await f.request(path)).json()).items).toHaveLength(2); expect(await (await f.request(`${path}/${versionId}`)).json()).toEqual(transcript);
    expect((await f.request(`${path}/${versionId}`, undefined, "same-household-parent")).status).toBe(404); expect((await f.request(path, input, "foreign")).status).toBe(403); expect(f.writes()).toBe(3);
  });
  it("rejects invalid timing, language, size and text-only pseudo subtitles without any import write", async () => {
    const f = fixture(), id = crypto.randomUUID(); await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}` });
    const base = { versionId: crypto.randomUUID(), format: "srt", language: "en", text: "1\n00:00:01,000 --> 00:00:03,000\nHello world." };
    for (const input of [{ ...base, language: "vi" }, { ...base, text: "Hello world no timing" }, { ...base, text: base.text.replace("03,000", "00,500") }, { ...base, text: base.text.replace("Hello world.", "こんにちは世界") }, { ...base, text: "x".repeat(524289) }, { ...base, text: "1\n00:99:01,000 --> 00:99:03,000\nHello world." }]) expect((await f.request(`/${id}/transcripts`, input)).status).toBe(400);
    expect(f.writes()).toBe(1);
  });
  it("saves private bookmark/position once under CAS and validates source ranges and ownership", async () => {
    const f = fixture(), id = crypto.randomUUID(), versionId = crypto.randomUUID(); await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}` });
    await f.request(`/${id}/transcripts`, { versionId, format: "srt", language: "en", text: "1\n00:02:10,000 --> 00:02:50,000\nWe are learning English." });
    const path = `/${id}/watch-state`, bookmark = { actionId: crypto.randomUUID(), kind: "bookmark", versionId, startMs: 130000, endMs: 170000, label: "Difficult segment" };
    const responses = await Promise.all([f.request(`${path}/actions`, bookmark), f.request(`${path}/actions`, bookmark)]); expect(responses.map(response => response.status)).toEqual([200, 200]);
    const state = await (await f.request(path)).json(); expect(state.revision).toBe(1); expect(state.bookmarks).toHaveLength(1); expect(JSON.stringify(state)).not.toContain("fingerprint");
    expect((await f.request(`${path}/actions`, { ...bookmark, label: "Changed" })).status).toBe(409);
    expect((await f.request(`${path}/actions`, { ...bookmark, actionId: crypto.randomUUID(), endMs: 171000 })).status).toBe(400);
    const position = { actionId: crypto.randomUUID(), kind: "position", positionMs: 145000 };
    expect((await f.request(`${path}/actions`, position)).status).toBe(200); expect((await f.request(`${path}/actions`, position)).status).toBe(200);
    expect((await (await f.request(path)).json()).positionMs).toBe(145000); expect((await (await f.request(path)).json()).revision).toBe(2);
    expect((await f.request(path, undefined, "same-household-parent")).status).toBe(404); expect((await f.request(`${path}/actions`, position, "foreign")).status).toBe(403);
  });
  it("pins gap-fill to the selected segment, hides answers, normalizes apostrophes and keeps first outcomes", async () => {
    const f = fixture(), id = crypto.randomUUID(), versionId = crypto.randomUUID(), sessionId = crypto.randomUUID(); await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}` });
    await f.request(`/${id}/transcripts`, { versionId, format: "srt", language: "en", text: "1\n00:02:10,000 --> 00:02:20,000\nWe don't go.\n\n2\n00:02:21,000 --> 00:02:40,000\nThis is wonderful.\n\n3\n00:04:00,000 --> 00:04:10,000\nOutside the selected segment.\n\n4\n00:04:11,000 --> 00:04:15,000\n[Music]" });
    const base = `/${id}/practice-sessions`, input = { sessionId, versionId, startMs: 130000, endMs: 170000 };
    const created = await f.request(base, input); expect(created.status).toBe(200); let state = await created.json(); expect(state.total).toBe(2); expect(state.summary.accuracy).toBeNull();
    expect(JSON.stringify(state.current)).not.toContain("don't"); expect(state.current.maskedText).toBe("We _____ go."); expect(state.current.endMs).toBeLessThanOrEqual(170000);
    const action = { actionId: crypto.randomUUID(), questionId: state.current.questionId, kind: "answer", text: "  ＤＯＮ’Ｔ  " };
    expect((await f.request(`${base}/${sessionId}/actions`, { ...action, correct: true })).status).toBe(400);
    expect((await f.request(`${base}/${sessionId}/actions`, { ...action, text: " " })).status).toBe(400);
    state = await (await f.request(`${base}/${sessionId}/actions`, action)).json(); expect(state.feedback.outcome).toBe("correct");
    expect(await (await f.request(`${base}/${sessionId}/actions`, action)).json()).toEqual(state);
    const reveal = { actionId: crypto.randomUUID(), questionId: state.current.questionId, kind: "reveal" };
    state = await (await f.request(`${base}/${sessionId}/actions`, reveal)).json(); expect(state.summary).toMatchObject({ correct: 1, revealed: 1, accuracy: 100 }); expect(state.status).toBe("complete");
    expect((await f.request(`${base}/${sessionId}/actions`, { ...action, actionId: crypto.randomUUID(), questionId: reveal.questionId })).status).toBe(409);
    expect((await f.request(`${base}/${sessionId}`, undefined, "same-household-parent")).status).toBe(404); expect((await f.request(`${base}/${sessionId}`, undefined, "foreign")).status).toBe(403); expect((await f.request(`${base}/${sessionId}`, undefined, "")).status).toBe(401);
    expect((await f.request(base, { ...input, endMs: 160000 })).status).toBe(409); expect(f.practiceStates.size).toBe(1);
  });
  it("video practice CAS accepts one competing first outcome and treats technical skips separately", async () => {
    const f = fixture(), id = crypto.randomUUID(), versionId = crypto.randomUUID(), sessionId = crypto.randomUUID(); await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}` });
    await f.request(`/${id}/transcripts`, { versionId, format: "srt", language: "en", text: "1\n00:00:01,000 --> 00:00:03,000\nThis is wonderful.\n\n2\n00:00:04,000 --> 00:00:07,000\nWe are listening." });
    const base = `/${id}/practice-sessions`, state = await (await f.request(base, { sessionId, versionId, startMs: 1000, endMs: 7000 })).json();
    const responses = await Promise.all(["technical-skip", "reveal"].map(kind => f.request(`${base}/${sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current.questionId, kind })));
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]); const after = await (await f.request(`${base}/${sessionId}`)).json(); expect(after.completed).toBe(1); expect(after.summary.incorrect).toBe(0); expect(after.summary.accuracy).toBeNull();
  });
  it("history serves only resolved immutable source snapshots and keeps private paging when live pins become incompatible", async () => {
    const f = fixture(), id = crypto.randomUUID(), versionId = crypto.randomUUID(), sessionId = crypto.randomUUID(); await f.request("", { videoId: id, url: `https://youtu.be/${youtubeId}` });
    await f.request(`/${id}/transcripts`, { versionId, format: "srt", language: "en", text: "1\n00:00:01,000 --> 00:00:03,000\nThis is wonderful.\n\n2\n00:00:04,000 --> 00:00:07,000\nWe are listening." });
    const base = `/${id}/practice-sessions`, state = await (await f.request(base, { sessionId, versionId, startMs: 1000, endMs: 7000 })).json();
    expect((await (await f.request(`${base}/${sessionId}/results`)).json()).items).toEqual([]);
    await f.request(`${base}/${sessionId}/actions`, { actionId: crypto.randomUUID(), questionId: state.current.questionId, kind: "reveal" });
    const first = await (await f.request(`${base}/${sessionId}/results`)).json(); expect(first.items).toHaveLength(1); expect(first.items[0]).toMatchObject({ text: "This is wonderful.", outcome: "revealed" }); expect(JSON.stringify(first)).not.toContain("We are listening");
    const metadata = await (await f.request(base)).json(); expect(metadata.total).toBe(1); expect(metadata.items[0].completed).toBe(1); expect(metadata.items[0].summary.accuracy).toBeNull(); expect(JSON.stringify(metadata)).not.toMatch(/maskedText|questions|"answer"/);
    f.transcripts.get(`owner:${versionId}`)!.sha256 = "0".repeat(64);
    expect((await f.request(`${base}/${sessionId}`)).status).toBe(409); expect(await (await f.request(`${base}/${sessionId}/results`)).json()).toEqual(first);
    expect((await f.request(`${base}/${sessionId}/results`, undefined, "same-household-parent")).status).toBe(404); expect((await f.request(base, undefined, "foreign")).status).toBe(403);
    for (const query of ["?page=0", "?page=1&page=2", "?scope=all"]) expect((await f.request(base + query)).status).toBe(400);
    expect((await (await f.request(base + "?page=2")).json()).items).toEqual([]);
  });
});
