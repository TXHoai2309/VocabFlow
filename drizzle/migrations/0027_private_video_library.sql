CREATE TABLE "vocabflow_app"."video_library" (
	"owner_user_id" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"id" uuid NOT NULL,
	"youtube_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_library_owner_user_id_learner_id_id_pk" PRIMARY KEY("owner_user_id","learner_id","id"),
	CONSTRAINT "video_library_owner_learner_source_unique" UNIQUE("owner_user_id","learner_id","youtube_id"),
	CONSTRAINT "video_library_youtube_id_check" CHECK ("vocabflow_app"."video_library"."youtube_id" ~ '^[A-Za-z0-9_-]{11}$')
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_library" ADD CONSTRAINT "video_library_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "vocabflow_app"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."video_library" ADD CONSTRAINT "video_library_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;