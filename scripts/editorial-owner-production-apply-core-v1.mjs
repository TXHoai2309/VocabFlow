import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const mutableTables = new Set(['vocabularies','master_v2_development_projections','master_v2_short_meanings','master_learning_set_memberships','master_vocabulary_topic_memberships','master_learning_set_mappings','master_topic_mappings','master_vocabulary_mappings','learning_set_items','vocabulary_topics','learner_learning_sets','learning_sets','topics','review_events','learner_progress','learner_saved_vocabulary','owner_editorial_projections']);
export async function tableFingerprint(tx, table, where='') {
  assert(/^[a-z_0-9]+$/.test(table));
  const [r]=await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t ${where}`);
  return r;
}
async function protectedState(tx,plan){
  const tables=await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' ORDER BY tablename`;
  const protectedTables={};for(const {tablename} of tables)if(!mutableTables.has(tablename))protectedTables[tablename]=await tableFingerprint(tx,tablename);
  for(const table of ['learner_progress','review_events','learner_saved_vocabulary'])protectedTables[table+'_retained']=await tableFingerprint(tx,table,`WHERE vocabulary_id IN (${plan.retainedRuntimeIds.join(',')})`);
  const [identity]=await tx`SELECT encode(sha256(convert_to(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'UTF8')),'hex') AS sha256 FROM vocabflow_meta.environment_identity t`;
  return {tables:protectedTables,identity};
}
export async function verifyOwnerProduction(tx,plan,pin){
  const rows=await tx`SELECT v.id,v.word,v.content_version,v.enabled,v.image_url,v.audio_url,v.source_dataset,p.content_sha256,p.cefr,p.part_of_speech,p.examples,p.tags,p.content_review_decision,p.source_provenance FROM vocabflow_app.vocabularies v LEFT JOIN vocabflow_app.owner_editorial_projections p ON p.vocabulary_id=v.id ORDER BY v.id`;
  assert.deepEqual(rows.map(x=>x.id),plan.items.map(x=>x.runtimeVocabularyId).sort((a,b)=>a-b));
  const byId=new Map(plan.items.map(x=>[x.runtimeVocabularyId,x]));
  for(const row of rows){const item=byId.get(row.id),c=item.content;assert.equal(row.word,c.word);assert.equal(row.content_version,item.contentVersion);assert.equal(row.enabled,true);assert.equal(row.source_dataset,plan.sourceDataset);assert.equal(row.image_url,c.media.image);assert.equal(row.audio_url,c.media.wordAudio);assert.equal(row.content_sha256,item.contentSha256);assert.equal(row.cefr,c.cefr);assert.equal(row.part_of_speech,c.partOfSpeech);assert.deepEqual(row.examples,c.examples);assert.deepEqual(row.tags,c.tags);assert.equal(row.content_review_decision,'OWNER_SELECTED_PUBLICATION');assert.equal(row.source_provenance.ownerPublishedCatalog.planSha256,pin);}
  const [counts]=await tx`SELECT (SELECT count(*)::int FROM vocabflow_app.vocabularies) AS words,(SELECT count(*)::int FROM vocabflow_app.owner_editorial_projections) AS projections,(SELECT count(*)::int FROM vocabflow_app.learning_sets) AS sets,(SELECT count(*)::int FROM vocabflow_app.topics) AS topics,(SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS old_projections`;
  assert.deepEqual(counts,{words:1547,projections:1547,sets:76,topics:73,old_projections:0});return counts;
}
export async function applyOwnerProduction(tx,plan,inventory,pin){
  await tx`SET LOCAL TIME ZONE 'UTC'`;await tx`SET LOCAL lock_timeout='15s'`;await tx`SET LOCAL statement_timeout='180s'`;
  await tx`SELECT pg_advisory_xact_lock(89421732)`;
  await tx`LOCK TABLE vocabflow_app.vocabularies,vocabflow_app.learner_progress,vocabflow_app.review_events,vocabflow_app.learner_saved_vocabulary,vocabflow_app.owner_editorial_projections,vocabflow_app.learning_sets,vocabflow_app.topics IN SHARE ROW EXCLUSIVE MODE`;
  const [existing]=await tx`SELECT count(*)::int AS count FROM vocabflow_app.owner_editorial_projections`;
  if(existing.count===1547)return {status:'ALREADY_APPLIED_NO_WRITES',counts:await verifyOwnerProduction(tx,plan,pin)};
  assert.equal(existing.count,0,'PARTIAL_PUBLICATION_REQUIRES_REVIEW');
  const live=await tx`SELECT id,word,enabled,content_version,source_dataset,source_record_id FROM vocabflow_app.vocabularies ORDER BY id`;
  assert.deepEqual([...live],inventory.rows.map(({id,word,enabled,content_version,source_dataset,source_record_id})=>({id,word,enabled,content_version,source_dataset,source_record_id})),'PRODUCTION_SOURCE_CHANGED_SINCE_PLAN');
  const protectedBefore=await protectedState(tx,plan);const historyBefore=await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`;
  const removed={};
  for(const table of ['master_learning_set_memberships','master_vocabulary_topic_memberships','master_learning_set_mappings','master_topic_mappings','master_vocabulary_mappings','master_v2_short_meanings','master_v2_development_projections','learning_set_items','vocabulary_topics','learner_learning_sets'])removed[table]=(await tx.unsafe(`DELETE FROM vocabflow_app."${table}"`)).count;
  for(const table of ['review_events','learner_saved_vocabulary','learner_progress'])removed[table]=(await tx.unsafe(`DELETE FROM vocabflow_app."${table}" WHERE vocabulary_id IN (${plan.retiredRuntimeIds.join(',')})`)).count;
  removed.learning_sets=(await tx`DELETE FROM vocabflow_app.learning_sets`).count;
  removed.topics=(await tx`DELETE FROM vocabflow_app.topics`).count;
  removed.vocabularies=(await tx`DELETE FROM vocabflow_app.vocabularies WHERE id IN ${tx(plan.retiredRuntimeIds)}`).count;assert.equal(removed.vocabularies,6411);
  const vocab=plan.items.map((item,index)=>({id:item.runtimeVocabularyId,word:item.content.word,ipa:null,vietnamese:item.content.meaningVi,vietnamese_override:null,definition_en:item.content.definitionEn,example_en:item.content.examples[0].en,image_url:item.content.media.image,audio_url:item.content.media.wordAudio,image_quarantined:false,topic:item.topicLabel,level:null,enabled:true,content_version:item.contentVersion,source_dataset:plan.sourceDataset,source_record_id:index+1}));
  for(let n=0;n<vocab.length;n+=100)await tx`INSERT INTO vocabflow_app.vocabularies ${tx(vocab.slice(n,n+100))} ON CONFLICT(id) DO UPDATE SET word=EXCLUDED.word,ipa=EXCLUDED.ipa,vietnamese=EXCLUDED.vietnamese,vietnamese_override=EXCLUDED.vietnamese_override,definition_en=EXCLUDED.definition_en,example_en=EXCLUDED.example_en,image_url=EXCLUDED.image_url,audio_url=EXCLUDED.audio_url,image_quarantined=false,topic=EXCLUDED.topic,level=NULL,enabled=true,content_version=EXCLUDED.content_version,source_dataset=EXCLUDED.source_dataset,source_record_id=EXCLUDED.source_record_id,updated_at=now()`;
  const projections=plan.items.map(item=>({proposal_key:item.proposalKey,source_group_key:item.topicCodes[0],vocabulary_id:item.runtimeVocabularyId,part_of_speech:item.content.partOfSpeech,cefr:item.content.cefr,tags:JSON.stringify(item.content.tags),examples:JSON.stringify(item.content.examples),content_sha256:item.contentSha256,
    source_provenance:JSON.stringify({ownerPublishedCatalog:{catalogId:plan.catalogId,planSha256:pin,shortMeaningVi:item.content.shortMeaningVi,package:item.package,ownerSelection:plan.ownerSelection},sourceText:item.sourceProvenance,sourceIdentityEvidence:item.sourceIdentityEvidence,mediaEvidence:item.mediaEvidence,classificationEvidence:item.classificationEvidence,independentMasterPassClaimed:false,canonicalMasterIdentityAssigned:false})}));
  for(let n=0;n<projections.length;n+=100)await tx`INSERT INTO vocabflow_app.owner_editorial_projections ${tx(projections.slice(n,n+100))}`;
  const packageNames={expansion547:'Từ vựng mở rộng · 547 từ',basic500:'Từ vựng cơ bản · 500 từ',basicplus500:'Từ vựng cơ bản mở rộng · 500 từ'};
  const collections=[],placements=[],topicMemberships=[];
  for(const [order,[code,name]] of Object.entries(packageNames).entries()){
    const [set]=await tx`INSERT INTO vocabflow_app.learning_sets(slug,name,description,grade,enabled,sort_order) VALUES(${'owner-prod-'+code},${name},'Từ vựng có hình minh họa, phát âm và câu ví dụ.',NULL,true,${order}) RETURNING id,slug`;
    const members=plan.items.filter(x=>x.package===code);members.forEach((x,i)=>placements.push({learning_set_id:set.id,vocabulary_id:x.runtimeVocabularyId,sort_order:i}));collections.push({...set,count:members.length});
  }
  for(const group of plan.groups){
    const [topic]=await tx`INSERT INTO vocabflow_app.topics(slug,name,description,sort_order,enabled,source_topic,review_status) VALUES(${'prod-'+group.slug},${group.name},${group.description},${group.sortOrder},true,${'owner:'+plan.catalogId+':'+group.code},'APPROVED') RETURNING id`;
    const [set]=await tx`INSERT INTO vocabflow_app.learning_sets(slug,name,description,grade,enabled,sort_order) VALUES(${'prod-'+group.slug},${group.name},${group.description},NULL,true,${group.sortOrder+10}) RETURNING id,slug`;
    const members=plan.items.filter(x=>x.topicCodes.includes(group.code));assert(members.length);members.forEach((x,i)=>{placements.push({learning_set_id:set.id,vocabulary_id:x.runtimeVocabularyId,sort_order:i});topicMemberships.push({vocabulary_id:x.runtimeVocabularyId,topic_id:topic.id,review_status:'APPROVED'});});collections.push({...set,topicId:topic.id,count:members.length});
  }
  for(let n=0;n<placements.length;n+=200)await tx`INSERT INTO vocabflow_app.learning_set_items ${tx(placements.slice(n,n+200))}`;
  for(let n=0;n<topicMemberships.length;n+=200)await tx`INSERT INTO vocabflow_app.vocabulary_topics ${tx(topicMemberships.slice(n,n+200))}`;
  const expectedAssignments=await tx`SELECT count(*)::int AS count FROM vocabflow_app.learner_learning_sets`;assert.equal(expectedAssignments[0].count,0);
  const counts=await verifyOwnerProduction(tx,plan,pin);const protectedAfter=await protectedState(tx,plan);assert.deepEqual(protectedAfter,protectedBefore,'PROTECTED_NONLEXICAL_OR_RETAINED_PROGRESS_CHANGED');
  const historyAfter=await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`;assert.deepEqual(historyAfter,historyBefore,'CONTENT_APPLY_CHANGED_MIGRATION_HISTORY');
  const [sequence]=await tx`SELECT last_value FROM pg_sequences WHERE schemaname='vocabflow_app' AND sequencename='vocabularies_id_seq'`;
  await tx`SELECT setval(pg_get_serial_sequence('vocabflow_app.vocabularies','id'),${Math.max(Number(sequence.last_value??0),...plan.items.map(x=>x.runtimeVocabularyId))},true)`;
  return {artifactType:'OWNER_PRODUCTION_CATALOG_APPLICATION',status:'APPLIED',catalogId:plan.catalogId,planSha256:pin,counts,removed,collections,protectedBefore,protectedAfter,migrationHistoryBefore:historyBefore,retainedRuntimeIds:900,newRuntimeIds:647,canonicalMasterAllocations:0};
}
