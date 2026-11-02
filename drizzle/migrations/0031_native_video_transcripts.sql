CREATE TABLE "vocabflow_app"."native_transcript_runs" (
	"owner_user_id" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"state" jsonb NOT NULL,
	CONSTRAINT "native_transcript_runs_owner_user_id_learner_id_video_id_pk" PRIMARY KEY("owner_user_id","learner_id","video_id")
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_transcripts" ADD COLUMN "source_kind" text DEFAULT 'personal-import' NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."native_transcript_runs" ADD CONSTRAINT "native_runs_owned_video_fk" FOREIGN KEY ("owner_user_id","learner_id","video_id") REFERENCES "vocabflow_app"."video_library"("owner_user_id","learner_id","id") ON DELETE no action ON UPDATE no action;