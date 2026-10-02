CREATE TABLE "vocabflow_app"."learner_saved_vocabulary" (
	"learner_id" uuid NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_saved_vocabulary_learner_vocabulary_pk" PRIMARY KEY("learner_id","vocabulary_id")
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."learner_saved_vocabulary" ADD CONSTRAINT "learner_saved_vocabulary_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."learner_saved_vocabulary" ADD CONSTRAINT "learner_saved_vocabulary_vocabulary_id_vocabularies_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabflow_app"."vocabularies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learner_saved_vocabulary_learner_saved_at_idx" ON "vocabflow_app"."learner_saved_vocabulary" USING btree ("learner_id","created_at","vocabulary_id");