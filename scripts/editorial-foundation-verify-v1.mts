/** Real local PostgreSQL + Hono verification using exclusively disposable fixture IDs.
 * Session identity is injected into the app test seam; household authorization is real.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
import { Hono } from "hono";
import { installFoundationLocal } from "../apps/api/src/foundation-local";

const env = parseEnv(readFileSync(".vocabflow-local/development.env", "utf8"));
assert(env.DATABASE_MIGRATION_URL, "LOCAL_MIGRATION_URL_REQUIRED");
const url = new URL(env.DATABASE_MIGRATION_URL);
assert(url.hostname === "127.0.0.1" && url.port === "55432" && url.pathname === "/vocabflow_dev" && url.username === "vocabflow_migration");
const db = postgres(env.DATABASE_MIGRATION_URL, { max: 1, prepare: false, onnotice: () => {} });
const checks: string[] = []; const pass = (name: string) => checks.push(name);
const app = new Hono();
const runtime = installFoundationLocal(app, env, { readSession: async request => request.headers.get("x-foundation-fixture-user") ? { user: { id: request.headers.get("x-foundation-fixture-user")! } } : null });
assert(runtime);
const owner = randomUUID(), outsider = randomUUID(), household = randomUUID(), learner = randomUUID();
const letter = randomUUID(), sound = randomUUID(), utterance = randomUUID(), pendingName = randomUUID();
const code = `test-${randomUUID().slice(0,8)}`, empty = `${code}-empty`, otherPlacement = `${code}-reuse`;
const guestId = randomUUID(), guestKey = `guest:${guestId}`;
const pins = { targetRevision: 1, presentationRevision: 2, pronunciationRevision: 1 };
const source = JSON.parse(readFileSync("vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001/runtime-seed-r0001.json", "utf8"));
const sourceName = source.targets.find((t: { kind: string }) => t.kind === "LETTER_NAME");
const sourceUtterance = source.targets.find((t: { kind: string }) => t.kind === "UTTERANCE");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
async function fingerprints() {
  const result: Record<string, unknown> = {};
  const tables = await db`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' AND tablename NOT LIKE 'foundation\_%' ESCAPE '\' ORDER BY tablename`;
  for (const { tablename } of tables) {
    const [row] = await db.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${tablename.replaceAll('"','""')}" t`);
    result[tablename] = row;
  }
  return result;
}
async function call(route: string, body?: unknown, user?: string, expected = 200, extraHeaders: Record<string,string> = {}) {
  const response = await app.request(`http://127.0.0.1:3002${route}`, { ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }), headers: { "Content-Type": "application/json", ...(user ? { "x-foundation-fixture-user": user } : {}), ...extraHeaders } });
  const result = response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.arrayBuffer();
  assert.equal(response.status, expected, `${route}: ${JSON.stringify(result)}`); return result;
}
const prefix = `/api/learners/${learner}/foundation`, publicPrefix = "/api/public/foundation";
function attempt(targetId: string, expectedRevision = 0, mode = "ASSESS") { return { targetId, expectedRevision, pins, mode }; }
function review(at: { attemptRef: string }, expectedRevision = 0, optionKey?: string) { return { reviewId: randomUUID(), attemptRef: at.attemptRef, expectedRevision, pins, answer: optionKey ? { kind: "LETTER_OPTION", optionKey } : { kind: "SELF_RECALL", result: "REMEMBERED" } }; }
const before = await fingerprints();
let caught: unknown;
try {
  await db.begin(async tx => {
    for (const user of [owner, outsider]) await tx`INSERT INTO vocabflow_app."user"(id,name,email,email_verified) VALUES(${user},'Foundation disposable test',${user+'@foundation.invalid'},false)`;
    await tx`INSERT INTO vocabflow_app.households(id,primary_owner_user_id,name,timezone) VALUES(${household}::uuid,${owner},'Foundation disposable test','Asia/Ho_Chi_Minh')`;
    await tx`INSERT INTO vocabflow_app.household_members(household_id,user_id,role) VALUES(${household}::uuid,${owner},'OWNER')`;
    await tx`INSERT INTO vocabflow_app.learner_profiles(id,household_id,display_name,enabled) VALUES(${learner}::uuid,${household}::uuid,'Foundation disposable test',true)`;
    for (const c of [code,empty,otherPlacement]) await tx`INSERT INTO vocabflow_app.foundation_collections(code,title,module,sort_order) VALUES(${c},'Disposable verification','letters',999)`;
    for (const [id,kind] of [[letter,"LETTER_NAME"],[sound,"LETTER_SOUND"],[pendingName,"LETTER_NAME"],[utterance,"UTTERANCE"]]) {
      const content = kind === "UTTERANCE" ? structuredClone(sourceUtterance.content) : structuredClone(sourceName.content);
      if (id === sound) content.audio = null;
      else if (id !== pendingName) content.audio.review = "OWNER_ACCEPTED";
      await tx`INSERT INTO vocabflow_app.foundation_targets(id,item_type,parent_letter_id,kind,content,pins,content_sha256,enabled) VALUES(${id}::uuid,${kind === 'UTTERANCE' ? 'UTTERANCE' : 'LETTER_ACTIVITY'},${kind === 'UTTERANCE' ? null : randomUUID()}::uuid,${kind},${tx.json(content)},${tx.json(pins)},${hash(JSON.stringify(content))},true)`;
      await tx`INSERT INTO vocabflow_app.foundation_memberships(collection,target_id,sort_order) VALUES(${code},${id}::uuid,${kind==='UTTERANCE'?0:1})`;
      if (id === utterance) await tx`INSERT INTO vocabflow_app.foundation_memberships(collection,target_id,sort_order) VALUES(${otherPlacement},${id}::uuid,0)`;
    }
  });
  await call(`${prefix}/queue?collection=${code}&capacity=5&mode=mixed`, undefined, undefined, 401); pass("anonymous-account-read401");
  await call(`${prefix}/queue?collection=${code}&capacity=5&mode=mixed`, undefined, outsider, 403); pass("cross-household-read403");
  await call(`${prefix}/attempts`, attempt(utterance), outsider, 403); pass("cross-household-write403");
  await call(`${prefix}/queue?collection=unknown&capacity=5&mode=mixed`,undefined,owner,404); pass("unknown-scope404-no-fallback");
  const emptyQueue=await call(`${prefix}/queue?collection=${empty}&capacity=5&mode=mixed`,undefined,owner); assert.equal(emptyQueue.items.length,0);pass("exact-empty-scope-no-widening");
  const queue=await call(`${prefix}/queue?collection=${code}&capacity=5&mode=mixed`,undefined,owner);assert.equal(queue.items.length,3);assert.equal(queue.unavailableCount,1);assert(queue.items.every((r:{progress:{revision:number}})=>r.progress.revision===0));pass("sparse-new-and-missing-sound-excluded");
  const publicQueue=await call(`${publicPrefix}/queue?collection=${code}&capacity=5&mode=mixed`);assert(publicQueue.items.every((r:{progress:{revision:number}})=>r.progress.revision===0));pass("public-queue-has-no-account-progress");
  await call(`${prefix}/attempts`,attempt(sound),owner,409);pass("missing-sound-cannot-be-assessed");
  await call(`${prefix}/attempts`,attempt(pendingName),owner,409);pass("unaccepted-audio-cannot-be-assessed");
  await call(`${prefix}/attempts`,{...attempt(letter),correctOptionKey:'A'},owner,400);pass("client-answer-key-rejected");
  await call(`${prefix}/attempts`,attempt(letter),owner,403,{Origin:'https://outside.invalid'});pass("cross-origin-write-denied");
  const at=await call(`${prefix}/attempts`,attempt(letter),owner); assert.equal(at.options.length,3);assert(at.audioUrl.includes(at.attemptRef));
  const wire=JSON.stringify(at);for(const forbidden of ['correctOption','targetIpa','pronunciationBinding','anchorWord','sourceDependency','sha256','filename'])assert(!wire.includes(forbidden));pass("letter-pre-answer-no-key-ipa-hash-or-named-audio-leak");
  const [privateAttempt]=await db`SELECT payload FROM vocabflow_app.foundation_attempts WHERE id=${at.attemptRef}::uuid`;
  await call(`${prefix}/attempts/${at.attemptRef}/audio`,undefined,outsider,403);pass("audio-household-boundary");
  const audio=await call(`${prefix}/attempts/${at.attemptRef}/audio`,undefined,owner);assert.equal(audio.byteLength,sourceName.content.audio.byteLength);pass("opaque-authorized-audio-real-bytes");
  const unknownOption=review(at,0,randomUUID());await call(`${prefix}/reviews`,unknownOption,owner,400);pass("invented-option-rejected");
  const good=review(at,0,privateAttempt.payload.correctOptionKey);
  const saved=await call(`${prefix}/reviews`,good,owner);assert.equal(saved.result,'REMEMBERED');assert.equal(saved.progress.revision,1);assert.equal(saved.progress.state.intervalDays,1);pass("letter-authority-grades-and-schedules");
  await db`UPDATE vocabflow_app.foundation_attempts SET expires_at=now()-interval '1 minute' WHERE id=${at.attemptRef}::uuid`;
  assert.deepEqual(await call(`${prefix}/reviews`,good,owner),saved);pass("idempotent-replay-before-expiry-and-stale-checks");
  await call(`${prefix}/reviews`,{...good,answer:{kind:'LETTER_OPTION',optionKey:randomUUID()}},owner,409);pass("changed-reviewid-conflicts");
  const atReveal=await call(`${prefix}/attempts`,attempt(letter,1),owner);await call(`${prefix}/reveal`,{attemptRef:atReveal.attemptRef},owner);
  await call(`${prefix}/reviews`,review(atReveal,1,atReveal.options[0].optionKey),owner,409);pass("teaching-reveal-invalidates-blind-assessment");
  const practice=await call(`${prefix}/attempts`,attempt(pendingName,0,'PRACTICE'),owner);assert.equal(practice.options.length,0);assert.equal(practice.audioUrl,null);
  const teaching=await call(`${prefix}/reveal`,{attemptRef:practice.attemptRef},owner);assert.equal(teaching.audioReview,'PENDING');assert(teaching.audioUrl);await call(`${prefix}/reviews`,review(practice,0,randomUUID()),owner,409);pass("pending-name-practice-plays-but-does-not-grade");
  const ut1=await call(`${prefix}/attempts`,attempt(utterance),owner);const ut2=await call(`${prefix}/attempts`,attempt(utterance),owner);
  await call(`${prefix}/reviews`,review(ut1),owner,409);pass("utterance-open-is-not-review-reveal-required");
  await call(`${prefix}/reveal`,{attemptRef:ut1.attemptRef},owner);await call(`${prefix}/reveal`,{attemptRef:ut2.attemptRef},owner);
  const correct=await call(`${prefix}/reviews`,review(ut1),owner);assert.equal(correct.itemType,'UTTERANCE');assert.equal(correct.progress.revision,1);pass("utterance-self-recall-progress-independent");
  await call(`${prefix}/reviews`,review(ut2),owner,409);pass("concurrent-served-revision-stale");
  const reuse=await call(`${prefix}/queue?collection=${otherPlacement}&capacity=5&mode=mixed`,undefined,owner);assert.equal(reuse.items.length,0);pass("shared-collection-progress-deduplicates-not-due");
  const [beforeFailure]=await db`SELECT count(*)::int AS count FROM vocabflow_app.foundation_reviews WHERE learner_id=${learner}::uuid`;assert.equal(beforeFailure.count,2);pass("failed-reviews-do-not-create-receipts");
  const futureUt=await call(`${prefix}/attempts`,attempt(utterance,1),owner);await call(`${prefix}/reveal`,{attemptRef:futureUt.attemptRef},owner);
  const forgotten=review(futureUt,1);forgotten.answer={kind:'SELF_RECALL',result:'FORGOTTEN'};const reset=await call(`${prefix}/reviews`,forgotten,owner);assert.equal(reset.progress.state.intervalDays,1);assert.equal(reset.progress.state.consecutiveCorrect,0);pass("forgotten-reset-one-day");
  const wrongPins=await call(`${prefix}/attempts`,attempt(utterance,2),owner);await db`UPDATE vocabflow_app.foundation_attempts SET payload=jsonb_set(payload,'{contentHash}','"changed"'::jsonb) WHERE id=${wrongPins.attemptRef}::uuid`;
  await call(`${prefix}/reveal`,{attemptRef:wrongPins.attemptRef},owner,409);pass("served-content-drift-refused");
  const ga=await call(`${publicPrefix}/attempts`,{...attempt(utterance),guestId});await call(`${publicPrefix}/reveal`,{attemptRef:ga.attemptRef,guestId});
  const gr={...review(ga),guestId};const grade=await call(`${publicPrefix}/reviews`,gr);assert.equal(grade.result,'REMEMBERED');assert(!('progress' in grade));
  assert.deepEqual(await call(`${publicPrefix}/reviews`,gr),grade);pass("guest-grade-replay-no-server-progress");
  await call(`${publicPrefix}/reveal`,{attemptRef:ga.attemptRef,guestId:randomUUID()},undefined,404);pass("guest-attempt-owner-capability-boundary");
  await call(`${publicPrefix}/reviews`,{...gr,reviewId:randomUUID()},undefined,409);pass("guest-consumed-attempt-no-second-review");
} catch(error) { caught=error; }
finally {
  await db.begin(async tx=>{
    await tx`DELETE FROM vocabflow_app.foundation_reviews WHERE learner_id=${learner}::uuid`;
    await tx`DELETE FROM vocabflow_app.foundation_progress WHERE learner_id=${learner}::uuid`;
    await tx`DELETE FROM vocabflow_app.foundation_attempts WHERE owner_key IN ${tx([`account:${learner}`,guestKey])}`;
    await tx`DELETE FROM vocabflow_app.foundation_memberships WHERE collection IN ${tx([code,empty,otherPlacement])}`;
    await tx`DELETE FROM vocabflow_app.foundation_targets WHERE id IN ${tx([letter,sound,utterance,pendingName])}`;
    await tx`DELETE FROM vocabflow_app.foundation_collections WHERE code IN ${tx([code,empty,otherPlacement])}`;
    await tx`DELETE FROM vocabflow_app.learner_profiles WHERE id=${learner}::uuid`;
    await tx`DELETE FROM vocabflow_app.household_members WHERE household_id=${household}::uuid`;
    await tx`DELETE FROM vocabflow_app.households WHERE id=${household}::uuid`;
    await tx`DELETE FROM vocabflow_app."user" WHERE id IN ${tx([owner,outsider])}`;
  });
  const after=await fingerprints();assert.deepEqual(after,before);pass("all28-preexisting-table-fingerprints-restored-no-lexical-progress-change");
  const [remaining]=await db`SELECT count(*)::int AS count FROM vocabflow_app.foundation_targets`;assert.equal(remaining.count,24);pass("temporary-targets-cleaned-original24-preserved");
  await runtime.close();await db.end({timeout:3});
}
const report={status:caught?'FAIL':'PASS',checksPassed:checks.length,checks,authEvidence:'Injected session identity in test-only Hono instance; real PostgreSQL household authorization, progress/attempt/review transactions. Not a real browser login.',database:'DEDICATED_LOCAL_ONLY',disposableFixturesRemoved:true,protectedTableFingerprintsUnchanged:28,scoredLetterEvidence:'Disposable accepted-audio fixture only; real18new files remain PENDING listening review.',newMediaJobs:0};
const output='.vocabflow-local/editorial-refresh-20261030/foundation08-09-local-r0001';mkdirSync(output,{recursive:true});writeFileSync(`${output}/verification.current.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(caught)throw caught;
