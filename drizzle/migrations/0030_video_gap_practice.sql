CREATE TABLE "vocabflow_app"."video_practice_sessions" (
	"owner_user_id" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_practice_sessions_owner_user_id_learner_id_video_id_id_pk" PRIMARY KEY("owner_user_id","learner_id","video_id","id")
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_practice_sessions" ADD CONSTRAINT "video_practice_owned_video_fk" FOREIGN KEY ("owner_user_id","learner_id","video_id") REFERENCES "vocabflow_app"."video_library"("owner_user_id","learner_id","id") ON DELETE no action ON UPDATE no action;