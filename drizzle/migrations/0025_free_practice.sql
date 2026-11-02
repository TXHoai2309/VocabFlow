CREATE TABLE "vocabflow_app"."practice_sessions" (
	"learner_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_sessions_learner_id_id_pk" PRIMARY KEY("learner_id","id"),
	CONSTRAINT "practice_revision_nonnegative" CHECK ("vocabflow_app"."practice_sessions"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."practice_sessions" ADD CONSTRAINT "practice_sessions_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;