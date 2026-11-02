CREATE TABLE "vocabflow_app"."video_source_reports" (
	"owner_user_id" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"cue_id" text NOT NULL,
	"action_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_source_reports_pk" PRIMARY KEY("owner_user_id","learner_id","video_id","version_id","cue_id"),
	CONSTRAINT "source_report_request_identity" UNIQUE("owner_user_id","learner_id","video_id","action_id")
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_source_reports" ADD CONSTRAINT "source_reports_owned_source_fk" FOREIGN KEY ("owner_user_id","learner_id","video_id","version_id") REFERENCES "vocabflow_app"."video_transcripts"("owner_user_id","learner_id","video_id","id") ON DELETE no action ON UPDATE no action;