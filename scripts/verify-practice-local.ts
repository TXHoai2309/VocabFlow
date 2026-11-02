import {createManagementService,postgresManagementRepository} from "../apps/api/src/video-management";
import {createSourceReportService,postgresSourceReportRepository} from "../apps/api/src/video-source";
import {createTranslationService,postgresTranslationRepository} from "../apps/api/src/video-translation";
import {deeplProvider} from "../apps/api/src/video-providers";
import { createNativeService, postgresNativeRepository } from "../apps/api/src/video-native";
import { supadataProvider } from "../apps/api/src/video-providers";
import { parseTimedSubtitles } from "@vocabflow/learning-domain";
/** Local-only, rollback-only rehearsal with synthetic provider I/O. Never connects to Neon or processing providers. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { PgDialect } from "drizzle-orm/pg-core";
import { createApp } from "../apps/api/src/index";
import { createDatabasePracticeService } from "../apps/api/src/practice";
import { createDatabaseFishGameService } from "../apps/api/src/fish-game";
import { createDatabaseVideoLibraryService } from "../apps/api/src/video-learning";
import { createDatabaseVideoPracticeService } from "../apps/api/src/video-practice";
import type { PracticeSession, FishGameSession } from "@vocabflow/contracts";
let stage = "preflight";

async function run() {
  const url = new URL(process.env.DATABASE_MIGRATION_URL ?? "http://invalid");
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55432");
  assert.equal(url.pathname, "/vocabflow_dev"); assert.equal(url.username, "vocabflow_migration");
  assert.equal(process.env.VOCABFLOW_ENV, "development"); assert.equal(process.env.DATABASE_ENV, "development");
  assert.equal(process.env.EXECUTION_CONTEXT, "local-development"); assert.ok(!process.env.VERCEL_ENV);
  const client = postgres(url.href, { max: 1, prepare: false, connect_timeout: 5 });
  // Match the application's Drizzle date/timestamp parsers exactly.
  drizzle(client);
  const rollback = new Error("EXPECTED_ROLLBACK");
  let passed = false;
  try {
    await client.begin(async tx => {
      const [identity] = await tx`SELECT current_database() db, session_user role,
        (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) provider`;
      assert.equal(identity!.db, "vocabflow_dev"); assert.equal(identity!.role, "vocabflow_migration"); assert.equal(identity!.provider, "docker-local");
      stage = "migration-rehearsal";
      const [existing] = await tx`SELECT to_regclass('vocabflow_app.practice_sessions') name`;
      // Run only the new additive migration, all inside this rolled-back transaction.
      if (!existing!.name) for (const statement of readFileSync("drizzle/migrations/0025_free_practice.sql", "utf8").split("--> statement-breakpoint")) {
        if (statement.trim()) await tx.unsafe(statement);
      }
      const [existingGame] = await tx`SELECT to_regclass('vocabflow_app.fish_games') name`;
      if (!existingGame!.name) for (const statement of readFileSync("drizzle/migrations/0026_fish_games.sql", "utf8").split("--> statement-breakpoint")) {
        if (statement.trim()) await tx.unsafe(statement);
      }
      const [existingVideos] = await tx`SELECT to_regclass('vocabflow_app.video_library') name`;
      if (!existingVideos!.name) for (const statement of readFileSync("drizzle/migrations/0027_private_video_library.sql", "utf8").split("--> statement-breakpoint")) {
        if (statement.trim()) await tx.unsafe(statement);
      }
      const [existingTranscripts] = await tx`SELECT to_regclass('vocabflow_app.video_transcripts') name`;
      if (!existingTranscripts!.name) for (const statement of readFileSync("drizzle/migrations/0028_timed_video_transcripts.sql", "utf8").split("--> statement-breakpoint")) {
        if (statement.trim()) await tx.unsafe(statement);
      }
      const [existingWatch] = await tx`SELECT to_regclass('vocabflow_app.video_watch_states') name`;
      if (!existingWatch!.name) for (const statement of readFileSync("drizzle/migrations/0029_video_watch_state.sql", "utf8").split("--> statement-breakpoint")) { if (statement.trim()) await tx.unsafe(statement); }
      const [existingVideoPractice] = await tx`SELECT to_regclass('vocabflow_app.video_practice_sessions') name`;
      if (!existingVideoPractice!.name) for (const statement of readFileSync("drizzle/migrations/0030_video_gap_practice.sql", "utf8").split("--> statement-breakpoint")) { if (statement.trim()) await tx.unsafe(statement); }
      const [existingNative] = await tx`SELECT to_regclass('vocabflow_app.native_transcript_runs') name`;
      if (!existingNative!.name) for (const statement of readFileSync("drizzle/migrations/0031_native_video_transcripts.sql", "utf8").split("--> statement-breakpoint")) { if (statement.trim()) await tx.unsafe(statement); }
      const [existingTranslation] = await tx`SELECT to_regclass('vocabflow_app.video_translation_runs') name`;
      if (!existingTranslation!.name) for(const file of ['0032_video_segment_translation','0033_translation_request_identity'])for (const statement of readFileSync('drizzle/migrations/'+file+'.sql','utf8').split("--> statement-breakpoint")) { if (statement.trim()) await tx.unsafe(statement); }
      const [existingSourceReports] = await tx`SELECT to_regclass('vocabflow_app.video_source_reports') name`;
      if (!existingSourceReports!.name)for(const statement of readFileSync('drizzle/migrations/0034_private_source_reports.sql','utf8').split('--> statement-breakpoint'))if(statement.trim())await tx.unsafe(statement);
      const [existingDeletion] = await tx`SELECT to_regclass('vocabflow_app.video_deletion_receipts') name`;
      if(!existingDeletion!.name)for(const statement of readFileSync('drizzle/migrations/0035_private_video_deletion_fence.sql','utf8').split('--> statement-breakpoint'))if(statement.trim())await tx.unsafe(statement);
      stage = "synthetic-fixtures";
      const user = `practice-test-${randomUUID()}`, foreignUser = `practice-test-${randomUUID()}`;
      const household = randomUUID(), learner = randomUUID(), foreignHousehold = randomUUID(), foreignLearner = randomUUID();
      for (const [id, hh, lp] of [[user, household, learner], [foreignUser, foreignHousehold, foreignLearner]]) {
        await tx`INSERT INTO vocabflow_app."user" (id,name,email) VALUES (${id!},'Synthetic practice test',${`${id}@example.invalid`})`;
        await tx`INSERT INTO vocabflow_app.households (id, primary_owner_user_id,name) VALUES (${hh!},${id!},'Synthetic practice test')`;
        await tx`INSERT INTO vocabflow_app.household_members (household_id,user_id,role) VALUES (${hh!},${id!},'OWNER')`;
        await tx`INSERT INTO vocabflow_app.learner_profiles (id,household_id,display_name) VALUES (${lp!},${hh!},'Synthetic practice test')`;
      }
      const ids = [2000000101, 2000000102, 2000000103, 2000000104];
      for (let i = 0; i < ids.length; i++) {
        await tx`INSERT INTO vocabflow_app.vocabularies (id,word,vietnamese,image_url,audio_url,enabled)
          VALUES (${ids[i]!},${["apple", "book", "house", "water"][i]!},${["quả táo", "quyển sách", "ngôi nhà", "nước"][i]!},${`/practice-media/${i}.png`},${`/practice-audio/${i}.mp3`},true)`;
        await tx`INSERT INTO vocabflow_app.learner_progress (learner_id,vocabulary_id,status,next_review_date,revision)
          VALUES (${learner},${ids[i]!},'LEARNING','2026-11-02',7)`;
        await tx`INSERT INTO vocabflow_app.learner_saved_vocabulary (learner_id,vocabulary_id) VALUES (${learner},${ids[i]!})`;
      }
      const setId = 2000000201;
      await tx`INSERT INTO vocabflow_app.learning_sets (id,slug,name,description,enabled,sort_order) VALUES (${setId},${`practice-${randomUUID()}`},'Synthetic practice set','Synthetic scope rehearsal',true,0)`;
      for (const id of ids.slice(0, 3)) await tx`INSERT INTO vocabflow_app.learning_set_items (learning_set_id,vocabulary_id,sort_order) VALUES (${setId},${id},0)`;
      const newVocabularyId = 2000000110, gameSetId = 2000000202;
      await tx`INSERT INTO vocabflow_app.vocabularies (id,word,vietnamese,image_url,audio_url,enabled) VALUES (${newVocabularyId},'moon','mặt trăng','/practice-media/new.png','/practice-audio/new.mp3',true)`;
      await tx`INSERT INTO vocabflow_app.learning_sets (id,slug,name,description,enabled,sort_order) VALUES (${gameSetId},${`game-${randomUUID()}`},'Synthetic learned-new game set','Synthetic scope rehearsal',true,0)`;
      for (const id of [ids[0]!, newVocabularyId]) await tx`INSERT INTO vocabflow_app.learning_set_items (learning_set_id,vocabulary_id,sort_order) VALUES (${gameSetId},${id},0)`;
      stage = "runtime-permissions";
      // The least-privilege migration role cannot SET ROLE runtime. Verify its
      // real grants without weakening the role model to run the rehearsal.
      const [grants] = await tx`SELECT bool_and(has_table_privilege('vocabflow_runtime','vocabflow_app.practice_sessions',privilege)) allowed
        FROM unnest(ARRAY['SELECT','INSERT','UPDATE']) privilege`;
      assert.equal(grants!.allowed, true);
      stage = "learning-snapshot";
      async function snapshot() {
        const data = await tx`SELECT
          (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY learner_id,vocabulary_id),'[]') FROM vocabflow_app.learner_progress p) progress,
          (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY household_id,review_id),'[]') FROM vocabflow_app.review_events e) reviews,
          (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY id),'[]') FROM vocabflow_app.xp_events x) xp,
          (SELECT count(*)::int FROM vocabflow_app.vocabularies) vocabulary_count,
          (SELECT md5(string_agg(to_jsonb(v)::text,'' ORDER BY id)) FROM vocabflow_app.vocabularies v) vocabulary_hash`;
        return JSON.stringify(data);
      }
      const before = await snapshot();
      const database = { execute: async (statement: import("drizzle-orm").SQL) => {
        const query = new PgDialect().sqlToQuery(statement);
        try { return await tx.unsafe(query.sql, query.params as postgres.ParameterOrJSON<never>[]); }
        catch (error) {
          const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
          console.log(`LOCAL_SQL_FAILURE=${/^[A-Z0-9_]{1,30}$/.test(code) ? code : "UNKNOWN"}`);
          throw error;
        }
      } };
      let sessionUser: string | null = user;
      const practiceService = createDatabasePracticeService(database, {});
      let nativeFetches=0;
      const nativeService=createNativeService(createDatabaseVideoLibraryService(database),postgresNativeRepository(database),supadataProvider('controlled-local-key',async input=>{if(String(input).endsWith('/me'))return Response.json({plan:'Free',maxCredits:100,usedCredits:1});nativeFetches++;const cues=parseTimedSubtitles('1\n00:00:01,000 --> 00:00:03,000\nWe are learning English together.','srt','en');return Response.json({lang:'en',content:cues.map(cue=>({text:cue.text,offset:cue.startMs,duration:cue.endMs-cue.startMs,lang:'en'}))});}));
      const liveTranslation={ english: 'We are learning English together.', vietnamese: 'Chúng ta đang học tiếng Anh cùng nhau.' };let translationPosts=0;
      const translationService=createTranslationService(createDatabaseVideoLibraryService(database),postgresTranslationRepository(database),deeplProvider('controlled-local:fx',async(input)=>{const url=String(input);if(url.endsWith('/usage'))return Response.json({character_count:33,character_limit:1000000});if(url.includes('/languages'))return Response.json([{lang:'en',usable_as_source:true,usable_as_target:true,status:'stable'},{lang:'vi',usable_as_source:true,usable_as_target:true,status:'stable'}]);translationPosts++;return Response.json({translations:[{text:liveTranslation.vietnamese}]});}));
      const app = createApp({videoManagementService:createManagementService(createDatabaseVideoLibraryService(database),postgresManagementRepository(database)),sourceReportService:createSourceReportService(createDatabaseVideoLibraryService(database),postgresSourceReportRepository(database)),translationService,nativeService, readSession: async () => sessionUser ? { user: { id: sessionUser } } : null, practiceService, fishGameService: createDatabaseFishGameService(database, {}), videoLibraryService: createDatabaseVideoLibraryService(database), videoPracticeService: createDatabaseVideoPracticeService(database) });
      async function request(path: string, body?: unknown, target = learner) {
        return app.request(`http://localhost/api/learners/${target}/practice-sessions${path}`, body === undefined ? {} : {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
      }
      stage = "api-service-readback";
      const id = randomUUID();
      try { await practiceService.create(user, learner, id); }
      catch (error) {
        const name = error instanceof Error ? error.name : "UNKNOWN";
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
        console.log(`LOCAL_SERVICE_FAILURE=${/^[A-Za-z0-9_]{1,70}$/.test(name) ? name : "UNKNOWN"}/${/^[A-Z0-9_]{1,30}$/.test(code) ? code : "UNKNOWN"}`);
        throw error;
      }
      const start = await request("", { sessionId: id });
      console.log(`PRACTICE_LOCAL_START_STATUS=${start.status}`); assert.equal(start.status, 200);
      let state = await start.json() as PracticeSession;
      console.log(`PRACTICE_LOCAL_START_COUNT=${state.total} empty=${state.emptyReason}`); assert.equal(state.total, 4);
      stage = "api-authorization";
      assert.equal((await request(`/${id}`, undefined, foreignLearner)).status, 403);
      sessionUser = null; assert.equal((await request(`/${id}`)).status, 401);
      sessionUser = foreignUser; assert.equal((await request(`/${id}`)).status, 403);
      sessionUser = user;
      stage = "api-action-and-retry";
      const action = { kind: "answer", questionId: state.current!.questionId, actionId: randomUUID(), optionId: state.current!.options[0]!.optionId };
      assert.equal((await request(`/${id}/actions`, action)).status, 200);
      assert.equal((await request(`/${id}/actions`, action)).status, 200);
      state = await (await request(`/${id}`)).json() as PracticeSession; assert.equal(state.completed, 1);
      stage = "api-stale-action";
      assert.equal((await request(`/${id}/actions`, { ...action, actionId: randomUUID() })).status, 409);
      stage = "srs-invariance";
      assert.equal(before, await snapshot());
      stage = "db-result-readback";
      const [persisted] = await tx`SELECT revision, jsonb_array_length(state->'results') results FROM vocabflow_app.practice_sessions WHERE learner_id=${learner} AND id=${id}`;
      assert.equal(persisted!.revision, 1); assert.equal(persisted!.results, 1);
      stage = "source-scopes";
      const savedId = randomUUID();
      const savedResponse = await request("", { sessionId: savedId, source: { kind: "saved" }, count: 5 });
      assert.equal(savedResponse.status, 200);
      const saved = await savedResponse.json() as PracticeSession; assert.equal(saved.total, 4); assert.equal(saved.config.source.kind, "saved");
      assert.equal((await request("", { sessionId: savedId, source: { kind: "learned" } })).status, 409);
      const setResponse = await request("", { sessionId: randomUUID(), source: { kind: "set", setId } });
      assert.equal(setResponse.status, 200);
      assert.equal((await setResponse.json() as PracticeSession).emptyReason, "insufficient-media-or-options");
      const mismatch = await request("", { sessionId: randomUUID(), source: { kind: "saved", cefr: "A1" } });
      assert.equal((await mismatch.json() as PracticeSession).total, 0);
      const invalidSet = await request("", { sessionId: randomUUID(), source: { kind: "set", setId: 2000000299 } });
      assert.equal(invalidSet.status, 400);
      const unclassified = await request("", { sessionId: randomUUID(), source: { kind: "level", cefr: "UNCLASSIFIED" }, count: 20 });
      // Other enabled catalog words may be unclassified, but the requested
      // source remains explicit. All its questions must retain that config.
      assert.equal(unclassified.status, 200);
      const levelSession = await unclassified.json() as PracticeSession;
      assert.equal(levelSession.config.source.cefr, "UNCLASSIFIED");
      stage = "mixed-cue-state";
      const mixedId = randomUUID();
      let mixed = await (await request("", { sessionId: mixedId, cue: "mixed" })).json() as PracticeSession;
      assert.equal(mixed.total, 4);
      for (let i = 0; i < 4; i++) {
        assert.equal(mixed.current!.cueKind, i % 2 ? "audio" : "image");
        mixed = await (await request(`/${mixedId}/actions`, { kind: "skip", questionId: mixed.current!.questionId, actionId: randomUUID() })).json() as PracticeSession;
      }
      assert.equal(mixed.summary.byCue.image.skipped, 2); assert.equal(mixed.summary.byCue.audio.skipped, 2);
      assert.deepEqual(await (await request(`/${mixedId}`)).json(), mixed);
      stage = "typed-answer-readback";
      const typedId = randomUUID();
      const typed = await (await request("", { sessionId: typedId, responseMode: "type", cue: "audio" })).json() as PracticeSession;
      assert.deepEqual(typed.current!.options, []);
      const [key] = await tx`SELECT state->'questions'->0->>'answer' answer FROM vocabflow_app.practice_sessions WHERE learner_id=${learner} AND id=${typedId}`;
      const typedAction = { actionId: randomUUID(), questionId: typed.current!.questionId, kind: "type-answer", text: `  ${String(key!.answer).toUpperCase()}  ` };
      const typedResult = await (await request(`/${typedId}/actions`, typedAction)).json() as PracticeSession;
      assert.equal(typedResult.feedback!.outcome, "correct");
      assert.deepEqual(await (await request(`/${typedId}/actions`, typedAction)).json(), typedResult);
      assert.equal((await (await request(`/${typedId}`)).json() as PracticeSession).summary.byCue.audio.correct, 1);
      stage = "stale-content-and-replay";
      const [nextPin] = await tx`SELECT state->'questions'->1->>'vocabularyId' vocabulary_id FROM vocabflow_app.practice_sessions WHERE learner_id=${learner} AND id=${typedId}`;
      const nextVocabularyId = Number(nextPin!.vocabulary_id);
      await tx`UPDATE vocabflow_app.vocabularies SET content_version=content_version+1 WHERE id=${nextVocabularyId}`;
      assert.equal((await request(`/${typedId}`)).status, 409);
      assert.deepEqual(await (await request(`/${typedId}/actions`, typedAction)).json(), typedResult);
      assert.equal((await request(`/${typedId}/actions`, { kind: "skip", actionId: randomUUID(), questionId: typedResult.current!.questionId })).status, 409);
      await tx`UPDATE vocabflow_app.vocabularies SET content_version=content_version-1 WHERE id=${nextVocabularyId}`;
      stage = "history-and-selected-retry";
      const parentId = randomUUID();
      const parent = await (await request("", { sessionId: parentId, responseMode: "type" })).json() as PracticeSession;
      await request(`/${parentId}/actions`, { actionId: randomUUID(), questionId: parent.current!.questionId, kind: "type-answer", text: "definitely-wrong-answer" });
      const parentResults = await (await request(`/${parentId}/results`)).json();
      assert.equal(parentResults.results.length, 1); assert.equal(parentResults.results[0].outcome, "incorrect");
      const history = await (await request("?page=1&needsPage=1")).json();
      assert.ok(history.totalSessions >= 5); assert.ok(history.needsPractice.some((word: { vocabularyId: number }) => word.vocabularyId === parentResults.results[0].vocabularyId));
      const retryId = randomUUID();
      const retryBody = { sessionId: retryId, questionIds: [parent.current!.questionId] };
      const retrySession = await (await request(`/${parentId}/retry`, retryBody)).json() as PracticeSession;
      assert.equal(retrySession.total, 1); assert.deepEqual(retrySession.config, parent.config);
      assert.deepEqual(await (await request(`/${parentId}/retry`, retryBody)).json(), retrySession);
      await request(`/${retryId}/actions`, { actionId: randomUUID(), questionId: retrySession.current!.questionId, kind: "type-answer", text: parentResults.results[0].word });
      assert.deepEqual(await (await request(`/${parentId}/results`)).json(), parentResults);
      const afterRetry = await (await request("?page=1&needsPage=1")).json();
      assert.ok(!afterRetry.needsPractice.some((word: { vocabularyId: number }) => word.vocabularyId === parentResults.results[0].vocabularyId));
      assert.ok(afterRetry.items.some((entry: { retryOf?: string }) => entry.retryOf === parentId));
      stage = "fish-game-five-hearts";
      const gameId = randomUUID();
      async function gameRequest(path: string, body?: unknown, target = learner) {
        return app.request(`http://localhost/api/learners/${target}/fish-games${path}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      let game = await (await gameRequest("", { gameId })).json() as FishGameSession;
      assert.equal(game.hearts, 5); assert.equal(game.score, 0);
      const [storedGame] = await tx`SELECT state FROM vocabflow_app.fish_games WHERE learner_id=${learner} AND id=${gameId}`;
      const gameAnswer = storedGame!.state.current.answer;
      const gameAction = { actionId: randomUUID(), questionId: game.current!.questionId, kind: "type-answer", text: gameAnswer };
      game = await (await gameRequest(`/${gameId}/actions`, gameAction)).json(); assert.equal(game.score, 10);
      assert.deepEqual(await (await gameRequest(`/${gameId}/actions`, gameAction)).json(), game);
      for (let i = 0; i < 5; i++) {
        const action = { actionId: randomUUID(), questionId: game.current!.questionId, kind: "skip" };
        game = await (await gameRequest(`/${gameId}/actions`, action)).json();
        assert.deepEqual(await (await gameRequest(`/${gameId}/actions`, action)).json(), game);
        if (i === 2) { assert.equal(game.hearts, 2); assert.deepEqual(await (await gameRequest(`/${gameId}`)).json(), game); }
      }
      assert.equal(game.hearts, 0); assert.equal(game.score, 10); assert.equal(game.status, "lost"); assert.equal(game.current, null);
      assert.deepEqual(await (await gameRequest(`/${gameId}`)).json(), game);
      assert.equal((await gameRequest(`/${gameId}`, undefined, foreignLearner)).status, 403);
      sessionUser = null; assert.equal((await gameRequest(`/${gameId}`)).status, 401); sessionUser = user;
      const [gameGrants] = await tx`SELECT bool_and(has_table_privilege('vocabflow_runtime','vocabflow_app.fish_games',privilege)) allowed FROM unnest(ARRAY['SELECT','INSERT','UPDATE']) privilege`;
      assert.equal(gameGrants!.allowed, true);
      stage = "game-source-cue-cycles";
      const scopedGameId = randomUUID();
      let scopedGame = await (await gameRequest("", { gameId: scopedGameId, source: { kind: "set", setId: gameSetId }, cue: "mixed" })).json() as FishGameSession;
      for (let i = 0; i < 6; i++) {
        assert.equal(scopedGame.current!.cueKind, i % 2 ? "audio" : "image");
        const [pin] = await tx`SELECT state->'current' AS question FROM vocabflow_app.fish_games WHERE learner_id=${learner} AND id=${scopedGameId}`;
        assert.equal(pin!.question.vocabularyId, i % 2 ? newVocabularyId : ids[0]);
        scopedGame = await (await gameRequest(`/${scopedGameId}/actions`, { actionId: randomUUID(), questionId: scopedGame.current!.questionId, kind: "type-answer", text: pin!.question.answer })).json();
      }
      assert.equal(scopedGame.score, 60); assert.equal(scopedGame.hearts, 5);
      assert.deepEqual(await (await gameRequest(`/${scopedGameId}`)).json(), scopedGame);
      const [newProgress] = await tx`SELECT count(*)::int AS count FROM vocabflow_app.learner_progress WHERE learner_id=${learner} AND vocabulary_id=${newVocabularyId}`;
      assert.equal(newProgress!.count, 0);
      const failedMediaId = randomUUID();
      let failedMedia = await (await gameRequest("", { gameId: failedMediaId, source: { kind: "set", setId: gameSetId }, cue: "mixed" })).json() as FishGameSession;
      for (let i = 0; i < 2; i++) failedMedia = await (await gameRequest(`/${failedMediaId}/actions`, { actionId: randomUUID(), questionId: failedMedia.current!.questionId, kind: "technical-skip" })).json();
      assert.equal(failedMedia.status, "paused-content"); assert.equal(failedMedia.hearts, 5); assert.equal(failedMedia.score, 0);
      stage = "game-history-finalization-records";
      const historyBeforeFinish = await (await gameRequest("?page=1&recordsPage=1")).json();
      assert.equal(historyBeforeFinish.totalGames, 3); assert.equal(historyBeforeFinish.totalRecords, 1);
      const scopedResults = await (await gameRequest(`/${scopedGameId}/results?page=1`)).json(); assert.equal(scopedResults.items.length, 6);
      assert.ok(!JSON.stringify(scopedResults).includes('"current"')); assert.ok(!JSON.stringify(scopedResults).includes('"pool"'));
      // Finalization and resolved snapshots remain available after media/content
      // retirement; restore this synthetic fixture before the no-side-effect hash.
      await tx`UPDATE vocabflow_app.vocabularies SET content_version=content_version+1 WHERE id=${ids[0]!}`;
      assert.equal((await gameRequest(`/${scopedGameId}`)).status, 409);
      assert.deepEqual(await (await gameRequest(`/${scopedGameId}/results?page=1`)).json(), scopedResults);
      const finishId = randomUUID();
      const finalized = await (await gameRequest(`/${scopedGameId}/finish`, { actionId: finishId })).json() as FishGameSession;
      assert.equal(finalized.status, "ended"); assert.equal(finalized.score, 60); assert.equal(finalized.hearts, 5); assert.equal(finalized.current, null);
      assert.deepEqual(await (await gameRequest(`/${scopedGameId}/finish`, { actionId: finishId })).json(), finalized);
      assert.deepEqual(await (await gameRequest(`/${scopedGameId}/finish`, { actionId: randomUUID() })).json(), finalized);
      await tx`UPDATE vocabflow_app.vocabularies SET content_version=content_version-1 WHERE id=${ids[0]!}`;
      assert.equal((await gameRequest(`/${failedMediaId}/finish`, { actionId: randomUUID() })).status, 200);
      const gameHistory = await (await gameRequest("?page=1&recordsPage=1")).json(); assert.equal(gameHistory.totalRecords, 2);
      const setRecord = gameHistory.records.find((record: { config: { source: { kind: string } } }) => record.config.source.kind === "set");
      assert.equal(setRecord.bestScore, 60); assert.equal(setRecord.bestGameId, scopedGameId); assert.equal(setRecord.finalizedGames, 2);
      const emptyGamePage = await (await gameRequest("?page=2&recordsPage=2")).json(); assert.equal(emptyGamePage.items.length, 0); assert.equal(emptyGamePage.totalGames, 3);
      const [finishStored] = await tx`SELECT revision,jsonb_array_length(state->'receipts') AS resolved FROM vocabflow_app.fish_games WHERE learner_id=${learner} AND id=${scopedGameId}`;
      assert.equal(finishStored!.revision, 7); assert.equal(finishStored!.resolved, 6);
      assert.equal((await gameRequest(`/${scopedGameId}/finish`, { actionId: randomUUID() }, foreignLearner)).status, 403);
      stage = "private-video-library";
      const videoId = randomUUID();
      let videoWriteRevision=0;
      async function videoRequest(path: string, body?: unknown, target = learner) { return app.request(`http://localhost/api/learners/${target}/video-library${path}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", "X-Video-Revision":String(videoWriteRevision) }, body: JSON.stringify(body) }); }
      const videoBody = { videoId, url: "https://youtu.be/M7lc1UVf-VE?si=tracking" };
      const video = await (await videoRequest("", videoBody)).json(); assert.equal(video.id, videoId); assert.equal(video.youtubeId, "M7lc1UVf-VE");
      assert.deepEqual(await (await videoRequest("", videoBody)).json(), video);
      assert.deepEqual(await (await videoRequest("", { videoId: randomUUID(), url: "https://www.youtube.com/watch?v=M7lc1UVf-VE" })).json(), video);
      assert.equal((await videoRequest("", { videoId, url: "https://youtu.be/abcdefghijk" })).status, 409);
      assert.deepEqual(await (await videoRequest(`/${videoId}`)).json(), video);
      assert.equal((await (await videoRequest("?page=1")).json()).total, 1);
      assert.equal((await videoRequest(`/${videoId}`, undefined, foreignLearner)).status, 403);
      sessionUser = null; assert.equal((await videoRequest(`/${videoId}`)).status, 401); sessionUser = user;
      const coParent = `video-test-${randomUUID()}`;
      await tx`INSERT INTO vocabflow_app."user" (id,name,email) VALUES (${coParent},'Synthetic video co-parent',${`${coParent}@example.invalid`})`;
      await tx`INSERT INTO vocabflow_app.household_members (household_id,user_id,role) VALUES (${household},${coParent},'PARENT')`;
      sessionUser = coParent; assert.equal((await videoRequest(`/${videoId}`)).status, 404); assert.equal((await (await videoRequest("?page=1")).json()).total, 0); sessionUser = user;
      const [videoCount] = await tx`SELECT count(*)::int AS count FROM vocabflow_app.video_library WHERE owner_user_id=${user} AND learner_id=${learner}`; assert.equal(videoCount!.count, 1);
      const [videoGrants] = await tx`SELECT bool_and(has_table_privilege('vocabflow_runtime','vocabflow_app.video_library',privilege)) allowed FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) privilege`; assert.equal(videoGrants!.allowed, true);
      stage = "immutable-timed-transcript";
      const versionId = randomUUID(), transcriptInput = { versionId, format: "srt", language: "en", text: "1\n00:00:01,000 --> 00:00:04,000\nHello world.\n\n2\n00:00:05,000 --> 00:00:09,000\nWe are learning English." };
      const transcriptResponse = await videoRequest(`/${videoId}/transcripts`, transcriptInput); console.log(`TRANSCRIPT_IMPORT_STATUS=${transcriptResponse.status}`); assert.equal(transcriptResponse.status, 200); const transcript = await transcriptResponse.json();
      assert.equal(transcript.cues.length, 2); assert.equal(transcript.cues[1].startMs, 5000);
      stage = "transcript-replay"; assert.deepEqual(await (await videoRequest(`/${videoId}/transcripts`, transcriptInput)).json(), transcript);
      assert.equal((await videoRequest(`/${videoId}/transcripts`, { ...transcriptInput, text: transcriptInput.text.replace("Hello", "Welcome") })).status, 409);
      stage = "transcript-second-version"; assert.equal((await videoRequest(`/${videoId}/transcripts`, { ...transcriptInput, versionId: randomUUID(), format: "vtt", text: "WEBVTT\n\n00:01.000 --> 00:03.000\nNew English subtitle." })).status, 200);
      assert.deepEqual(await (await videoRequest(`/${videoId}/transcripts/${versionId}`)).json(), transcript);
      stage = "transcript-list"; const transcriptList = await videoRequest(`/${videoId}/transcripts`); console.log(`TRANSCRIPT_LIST_STATUS=${transcriptList.status}`); assert.equal((await transcriptList.json()).items.length, 2);
      sessionUser = coParent; assert.equal((await videoRequest(`/${videoId}/transcripts/${versionId}`)).status, 404); assert.equal((await videoRequest(`/${videoId}/transcripts`, transcriptInput)).status, 404); sessionUser = user;
      const [transcriptStored] = await tx`SELECT source_text,cues,sha256 FROM vocabflow_app.video_transcripts WHERE owner_user_id=${user} AND learner_id=${learner} AND video_id=${videoId} AND id=${versionId}`;
      assert.equal(transcriptStored!.source_text, transcriptInput.text); assert.deepEqual(transcriptStored!.cues, transcript.cues); assert.equal(transcriptStored!.sha256, transcript.sha256);
      stage = "private-video-watch-cas";
      const bookmark = { actionId: randomUUID(), kind: "bookmark", versionId, startMs: 1000, endMs: 9000, label: "Synthetic difficult segment" };
      const bookmarkResponse = await videoRequest(`/${videoId}/watch-state/actions`, bookmark); assert.equal(bookmarkResponse.status, 200); const watch = await bookmarkResponse.json(); assert.equal(watch.revision, 1); assert.equal(watch.bookmarks.length, 1);
      assert.deepEqual(await (await videoRequest(`/${videoId}/watch-state/actions`, bookmark)).json(), watch);
      assert.equal((await videoRequest(`/${videoId}/watch-state/actions`, { ...bookmark, label: "Changed" })).status, 409);
      const position = { actionId: randomUUID(), kind: "position", positionMs: 5500 };
      assert.equal((await videoRequest(`/${videoId}/watch-state/actions`, position)).status, 200); assert.equal((await videoRequest(`/${videoId}/watch-state/actions`, position)).status, 200);
      const watchRead = await (await videoRequest(`/${videoId}/watch-state`)).json(); assert.equal(watchRead.revision, 2); assert.equal(watchRead.positionMs, 5500);
      sessionUser = coParent; assert.equal((await videoRequest(`/${videoId}/watch-state`)).status, 404); sessionUser = user;
      stage = "video-gap-first-results";
      const gapId = randomUUID(), gapPath = `/${videoId}/practice-sessions`;
      const gapCreate = { sessionId: gapId, versionId, startMs: 1000, endMs: 9000 };
      const gapResponse = await videoRequest(gapPath, gapCreate); assert.equal(gapResponse.status, 200); let gap = await gapResponse.json(); assert.equal(gap.total, 1);
      const [gapPrivate] = await tx`SELECT state FROM vocabflow_app.video_practice_sessions WHERE owner_user_id=${user} AND learner_id=${learner} AND video_id=${videoId} AND id=${gapId}`;
      const gapAnswer = gapPrivate!.state.questions[0].answer; assert.ok(!gap.current.maskedText.includes(gapAnswer));
      const gapAction = { actionId: randomUUID(), questionId: gap.current.questionId, kind: "answer", text: gapAnswer.toUpperCase() };
      gap = await (await videoRequest(`${gapPath}/${gapId}/actions`, gapAction)).json(); assert.equal(gap.feedback.outcome, "correct"); assert.equal(gap.status, "complete");
      assert.deepEqual(await (await videoRequest(`${gapPath}/${gapId}/actions`, gapAction)).json(), gap);
      assert.deepEqual(await (await videoRequest(`${gapPath}/${gapId}`)).json(), gap);
      sessionUser = coParent; assert.equal((await videoRequest(`${gapPath}/${gapId}`)).status, 404); sessionUser = user;
      stage = "video-practice-history";
      const gapHistoryResponse = await videoRequest(gapPath); assert.equal(gapHistoryResponse.status, 200); const gapHistory = await gapHistoryResponse.json(); assert.equal(gapHistory.total, 1); assert.equal(gapHistory.items[0].summary.correct, 1);
      const gapResultsResponse = await videoRequest(`${gapPath}/${gapId}/results?page=1`); assert.equal(gapResultsResponse.status, 200); const gapResults = await gapResultsResponse.json(); assert.equal(gapResults.items.length, 1); assert.equal(gapResults.items[0].answer, gapAnswer); assert.equal(gapResults.items[0].outcome, "correct");
      assert.equal((await (await videoRequest(`${gapPath}?page=2`)).json()).items.length, 0);
      sessionUser = coParent; assert.equal((await videoRequest(gapPath)).status, 404); assert.equal((await videoRequest(`${gapPath}/${gapId}/results?page=1`)).status, 404); sessionUser = user;
      for (let i = 0; i < 21; i++) assert.equal((await videoRequest(gapPath, { ...gapCreate, sessionId: randomUUID() })).status, 200);
      const firstGapPage = await (await videoRequest(`${gapPath}?page=1`)).json(), secondGapPage = await (await videoRequest(`${gapPath}?page=2`)).json();
      assert.equal(firstGapPage.total, 22); assert.equal(firstGapPage.items.length, 20); assert.equal(secondGapPage.items.length, 2); assert.equal(new Set([...firstGapPage.items, ...secondGapPage.items].map((item: { sessionId: string }) => item.sessionId)).size, 22);
      stage='native-provider-boundary-sql';const nativeId=randomUUID();const native=await(await videoRequest('/'+videoId+'/native-transcript',{requestId:nativeId})).json();assert.equal(native.status,'success');assert.equal((await(await videoRequest('/'+videoId+'/transcripts/'+nativeId)).json()).source,'supadata-native');await videoRequest('/'+videoId+'/native-transcript',{requestId:nativeId});assert.equal(nativeFetches,1);sessionUser=coParent;assert.equal((await videoRequest('/'+videoId+'/native-transcript')).status,404);sessionUser=user;
      stage='translation-provider-boundary-sql';const translatedVersion=randomUUID();await videoRequest('/'+videoId+'/transcripts',{versionId:translatedVersion,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\n'+liveTranslation.english});const translationBody={versionId:translatedVersion,startMs:1000,endMs:3000,requestId:randomUUID(),reviewedNonpersonal:true};const translationPath='/'+videoId+'/translations';assert.equal((await(await videoRequest(translationPath+'/preview',{versionId:translatedVersion,startMs:1000,endMs:3000})).json()).characters,33);const translated=await(await videoRequest(translationPath,translationBody)).json();assert.equal(translated.status,'success');assert.equal(translated.items[0].vietnamese,liveTranslation.vietnamese);assert.deepEqual(await(await videoRequest(translationPath,translationBody)).json(),translated);assert.equal(translationPosts,1);assert.equal((await(await videoRequest(translationPath+'?versionId='+translatedVersion)).json()).total,1);assert.equal((await videoRequest(translationPath,{...translationBody,startMs:0})).status,409);sessionUser=coParent;assert.equal((await videoRequest(translationPath+'?versionId='+translatedVersion)).status,404);sessionUser=user;
      const translatedGap=randomUUID();const translatedSession=await(await videoRequest(gapPath,{sessionId:translatedGap,versionId:translatedVersion,startMs:1000,endMs:3000})).json();assert.ok(!JSON.stringify(translatedSession).includes(liveTranslation.vietnamese));const resolvedTranslation=await(await videoRequest(gapPath+'/'+translatedGap+'/actions',{actionId:randomUUID(),questionId:translatedSession.current.questionId,kind:'reveal'})).json();assert.equal(resolvedTranslation.feedback.translation.text,liveTranslation.vietnamese);assert.equal((await(await videoRequest(gapPath+'/'+translatedGap)).json()).feedback.translation.text,liveTranslation.vietnamese);assert.equal((await(await videoRequest(gapPath+'/'+translatedGap+'/results')).json()).items[0].translation.text,liveTranslation.vietnamese);assert.equal(translationPosts,1);
      stage='source-quality-reports';const reportPath='/'+videoId+'/transcripts/'+translatedVersion+'/reports',reportBody={actionId:randomUUID(),cueId:'cue-1',reason:'timing'};const report=await(await videoRequest(reportPath,reportBody)).json();assert.equal(report.reason,'timing');assert.deepEqual(await(await videoRequest(reportPath,reportBody)).json(),report);const oldAfterReport=await(await videoRequest(gapPath+'/'+translatedGap+'/results')).json();assert.equal(oldAfterReport.items[0].outcome,'revealed');assert.equal(oldAfterReport.items[0].sourceReport,'timing');assert.equal(oldAfterReport.items[0].translation.text,liveTranslation.vietnamese);assert.equal((await(await videoRequest(gapPath,{sessionId:randomUUID(),versionId:translatedVersion,startMs:1000,endMs:3000})).json()).total,0);sessionUser=coParent;assert.equal((await videoRequest(reportPath)).status,404);sessionUser=user;
      const sourceGap=await(await videoRequest(gapPath,{...gapCreate,sessionId:randomUUID()})).json(),sourceAction={actionId:randomUUID(),questionId:sourceGap.current.questionId,kind:'report-source',reason:'text'},sourceActionPath=gapPath+'/'+sourceGap.sessionId+'/actions';const sourceResult=await(await videoRequest(sourceActionPath,sourceAction)).json();assert.equal(sourceResult.feedback.outcome,'technical');assert.equal(sourceResult.feedback.sourceReport,'text');assert.deepEqual(await(await videoRequest(sourceActionPath,sourceAction)).json(),sourceResult);
      stage='management-private-deletion';for(const table of ['video_transcripts','video_watch_states','video_practice_sessions','native_transcript_runs','video_translation_runs','video_source_reports','video_deletion_receipts']){const [granted]=await tx`SELECT bool_and(has_table_privilege('vocabflow_runtime',${'vocabflow_app.'+table},privilege)) allowed FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) privilege`;assert.equal(granted!.allowed,true);}const managementPath='/'+videoId+'/management';
      const deleteScope=async(kind:string,id:string)=>{const scope={kind,id},preResponse=await videoRequest(managementPath+'/preview',scope);assert.equal(preResponse.status,200);const preview=await preResponse.json();const input={scope,actionId:randomUUID(),expectedRevision:preview.dataRevision,confirmed:true};const removedResponse=await videoRequest(managementPath+'/delete',input);if(removedResponse.status!==200)console.log('DELETE_STATUS='+removedResponse.status);assert.equal(removedResponse.status,200);const removed=await removedResponse.json();assert.equal(removed.deleted,true);assert.deepEqual(await(await videoRequest(managementPath+'/delete',input)).json(),removed);assert.equal((await videoRequest(managementPath+'/delete',{...input,scope:{kind:'video',id:videoId===id?randomUUID():videoId}})).status,409);videoWriteRevision=removed.dataRevision;return removed;};
      const translatedRequest=(await tx`SELECT state->>'requestId' id FROM vocabflow_app.video_translation_runs WHERE owner_user_id=${user} AND video_id=${videoId} AND version_id=${translatedVersion}`)[0]!.id as string;
      sessionUser=coParent;assert.equal((await videoRequest(managementPath+'?kind=version&page=1')).status,404);sessionUser=user;
      assert.equal((await deleteScope('translation',translatedRequest)).counts.translations,1);assert.equal((await(await videoRequest('/'+videoId+'/transcripts/'+translatedVersion)).json()).versionId,translatedVersion);
      const oldEpochWrite=await app.request('http://localhost/api/learners/'+learner+'/video-library/'+videoId+'/watch-state/actions',{method:'POST',headers:{'Content-Type':'application/json','X-Video-Revision':'0'},body:JSON.stringify({actionId:randomUUID(),kind:'position',positionMs:9999})});assert.equal(oldEpochWrite.status,409);
      const nativeStored=await postgresNativeRepository(database).read(user,learner,videoId);assert.ok(nativeStored);assert.equal(await postgresNativeRepository(database).replace(user,learner,videoId,{...nativeStored,revision:nativeStored.revision+1,status:'failed'},nativeStored.revision),false);
      assert.equal((await deleteScope('practice',sourceGap.sessionId)).counts.sessions,1);assert.equal((await videoRequest(gapPath+'/'+sourceGap.sessionId)).status,404);
      const deletedVersion=await deleteScope('version',translatedVersion);assert.equal(deletedVersion.counts.versions,1);assert.equal((await videoRequest('/'+videoId+'/transcripts/'+translatedVersion)).status,404);assert.equal((await videoRequest(gapPath+'/'+translatedGap)).status,404);
      const freshLibrary=createDatabaseVideoLibraryService(database,videoWriteRevision);await assert.rejects(freshLibrary.importTranscript(user,learner,videoId,{versionId:translatedVersion,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nDeleted identity must stay deleted.'}),{code:'SERVICE_UNAVAILABLE'});const freshVersion=randomUUID();assert.equal((await freshLibrary.importTranscript(user,learner,videoId,{versionId:freshVersion,format:'srt',language:'en',text:'1\n00:00:01,000 --> 00:00:03,000\nA deliberate fresh source is allowed.'})).versionId,freshVersion);const oldBookmarkId=bookmark.actionId;const deletedSegment=await deleteScope('segment',oldBookmarkId);assert.equal(deletedSegment.counts.bookmarks,1);assert.equal((await(await videoRequest('/'+videoId+'/watch-state')).json()).bookmarks.length,0);
      sessionUser=coParent;const otherVideoId=randomUUID();await videoRequest('',{videoId:otherVideoId,url:'https://youtu.be/M7lc1UVf-VE'});sessionUser=user;
      const deletedAll=await deleteScope('video',videoId);assert.equal(deletedAll.counts.videos,1);assert.equal((await videoRequest('/'+videoId)).status,404);assert.equal((await videoRequest('',videoBody)).status,503);assert.equal((await tx`SELECT count(*)::integer n FROM vocabflow_app.video_library WHERE owner_user_id=${user} AND id=${videoId}`)[0]!.n,0);sessionUser=coParent;assert.equal((await videoRequest('/'+otherVideoId)).status,200);sessionUser=user;
      assert.equal(before, await snapshot());
      passed = true;
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  finally { await client.end({ timeout: 3 }); }
  assert.ok(passed);
  console.log("PRACTICE_LOCAL_REHEARSAL=PASS migration=rollback-only auth=401/403 persistence=readback idempotency=PASS srs/reviews/xp/catalog=unchanged cloud=0");
}
run().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNCLASSIFIED";
  console.error(`PRACTICE_LOCAL_REHEARSAL=FAIL stage=${stage} code=${/^[A-Z0-9_]{1,40}$/.test(code) ? code : "UNCLASSIFIED"} (no credentials logged)`);
  process.exitCode = 1;
});
