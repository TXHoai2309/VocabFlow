CREATE TABLE "vocabflow_app"."video_deletion_receipts" (
	"owner_user_id" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"state" jsonb NOT NULL,
	CONSTRAINT "video_deletion_receipts_pk" PRIMARY KEY("owner_user_id","learner_id","action_id")
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_library" ADD COLUMN "data_revision" integer DEFAULT 0 NOT NULL;