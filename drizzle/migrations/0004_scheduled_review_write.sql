CREATE TYPE "vocabflow_app"."learning_status" AS ENUM('NEW', 'LEARNING', 'MASTERED');--> statement-breakpoint
CREATE TYPE "vocabflow_app"."review_result" AS ENUM('REMEMBERED', 'FORGOTTEN');--> statement-breakpoint
CREATE TABLE "vocabflow_app"."learner_progress" (
	"learner_id" uuid NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"status" "vocabflow_app"."learning_status" DEFAULT 'NEW' NOT NULL,
	"consecutive_correct" bigint DEFAULT 0 NOT NULL,
	"interval_days" bigint DEFAULT 0 NOT NULL,
	"first_learned_date" date,
	"last_reviewed_date" date,
	"next_review_date" date,
	"total_correct" bigint DEFAULT 0 NOT NULL,
	"total_incorrect" bigint DEFAULT 0 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_progress_learner_vocabulary_unique" UNIQUE("learner_id","vocabulary_id"),
	CONSTRAINT "learner_progress_consecutive_correct_check" CHECK ("vocabflow_app"."learner_progress"."consecutive_correct" >= 0 AND "vocabflow_app"."learner_progress"."consecutive_correct" <= 9007199254740991),
	CONSTRAINT "learner_progress_interval_days_check" CHECK ("vocabflow_app"."learner_progress"."interval_days" >= 0 AND "vocabflow_app"."learner_progress"."interval_days" <= 9007199254740991),
	CONSTRAINT "learner_progress_total_correct_check" CHECK ("vocabflow_app"."learner_progress"."total_correct" >= 0 AND "vocabflow_app"."learner_progress"."total_correct" <= 9007199254740991),
	CONSTRAINT "learner_progress_total_incorrect_check" CHECK ("vocabflow_app"."learner_progress"."total_incorrect" >= 0 AND "vocabflow_app"."learner_progress"."total_incorrect" <= 9007199254740991),
	CONSTRAINT "learner_progress_revision_check" CHECK ("vocabflow_app"."learner_progress"."revision" >= 0 AND "vocabflow_app"."learner_progress"."revision" <= 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."review_events" (
	"household_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"learner_id" uuid NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"result" "vocabflow_app"."review_result" NOT NULL,
	"previous_status" "vocabflow_app"."learning_status" NOT NULL,
	"new_status" "vocabflow_app"."learning_status" NOT NULL,
	"previous_interval" bigint NOT NULL,
	"new_interval" bigint NOT NULL,
	"expected_revision" bigint NOT NULL,
	"resulting_revision" bigint NOT NULL,
	"review_date" date NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_events_household_review_pk" PRIMARY KEY ("household_id","review_id"),
	CONSTRAINT "review_events_previous_interval_check" CHECK ("vocabflow_app"."review_events"."previous_interval" >= 0 AND "vocabflow_app"."review_events"."previous_interval" <= 9007199254740991),
	CONSTRAINT "review_events_new_interval_check" CHECK ("vocabflow_app"."review_events"."new_interval" >= 0 AND "vocabflow_app"."review_events"."new_interval" <= 9007199254740991),
	CONSTRAINT "review_events_expected_revision_check" CHECK ("vocabflow_app"."review_events"."expected_revision" >= 0 AND "vocabflow_app"."review_events"."expected_revision" <= 9007199254740991),
	CONSTRAINT "review_events_resulting_revision_check" CHECK ("vocabflow_app"."review_events"."resulting_revision" > 0 AND "vocabflow_app"."review_events"."resulting_revision" <= 9007199254740991)
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."learner_progress" ADD CONSTRAINT "learner_progress_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."learner_progress" ADD CONSTRAINT "learner_progress_vocabulary_id_vocabularies_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabflow_app"."vocabularies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."review_events" ADD CONSTRAINT "review_events_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "vocabflow_app"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."review_events" ADD CONSTRAINT "review_events_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."review_events" ADD CONSTRAINT "review_events_vocabulary_id_vocabularies_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabflow_app"."vocabularies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learner_progress_learner_next_review_idx" ON "vocabflow_app"."learner_progress" USING btree ("learner_id","next_review_date");--> statement-breakpoint
CREATE INDEX "review_events_learner_reviewed_at_idx" ON "vocabflow_app"."review_events" USING btree ("learner_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_events_learner_vocabulary_reviewed_at_idx" ON "vocabflow_app"."review_events" USING btree ("learner_id","vocabulary_id","reviewed_at");
