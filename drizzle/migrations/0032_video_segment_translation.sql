CREATE TABLE "vocabflow_app"."video_translation_runs" (
	"owner_user_id" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"revision" integer NOT NULL,
	"state" jsonb NOT NULL,
	CONSTRAINT "video_translation_runs_owner_user_id_learner_id_video_id_version_id_start_ms_end_ms_pk" PRIMARY KEY("owner_user_id","learner_id","video_id","version_id","start_ms","end_ms")
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_translation_runs" ADD CONSTRAINT "translation_owned_source_fk" FOREIGN KEY ("owner_user_id","learner_id","video_id","version_id") REFERENCES "vocabflow_app"."video_transcripts"("owner_user_id","learner_id","video_id","id") ON DELETE no action ON UPDATE no action;