CREATE TABLE "vocabflow_app"."video_transcripts" (
	"owner_user_id" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"format" text NOT NULL,
	"language" text NOT NULL,
	"source_text" text NOT NULL,
	"sha256" text NOT NULL,
	"cues" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_transcripts_owner_user_id_learner_id_video_id_id_pk" PRIMARY KEY("owner_user_id","learner_id","video_id","id"),
	CONSTRAINT "video_transcript_format_check" CHECK ("vocabflow_app"."video_transcripts"."format" IN ('srt','vtt') AND "vocabflow_app"."video_transcripts"."language"='en')
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_transcripts" ADD CONSTRAINT "video_transcripts_owned_video_fk" FOREIGN KEY ("owner_user_id","learner_id","video_id") REFERENCES "vocabflow_app"."video_library"("owner_user_id","learner_id","id") ON DELETE no action ON UPDATE no action;