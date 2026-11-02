CREATE TABLE "vocabflow_app"."fish_games" (
	"learner_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fish_games_learner_id_id_pk" PRIMARY KEY("learner_id","id"),
	CONSTRAINT "fish_game_revision_nonnegative" CHECK ("vocabflow_app"."fish_games"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."fish_games" ADD CONSTRAINT "fish_games_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;