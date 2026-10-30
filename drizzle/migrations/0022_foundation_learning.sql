CREATE TABLE "vocabflow_app"."foundation_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"target_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"phase" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "foundation_attempts_phase_check" CHECK ("vocabflow_app"."foundation_attempts"."phase" IN ('ASSESS','REVEALED','CONSUMED'))
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."foundation_collections" (
	"code" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"module" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "foundation_collections_module_check" CHECK ("vocabflow_app"."foundation_collections"."module" IN ('letters','utterances'))
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."foundation_memberships" (
	"collection" text NOT NULL,
	"target_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "foundation_memberships_collection_target_id_pk" PRIMARY KEY("collection","target_id")
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."foundation_progress" (
	"learner_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"revision" integer NOT NULL,
	"state" jsonb NOT NULL,
	CONSTRAINT "foundation_progress_learner_id_target_id_item_type_pk" PRIMARY KEY("learner_id","target_id","item_type"),
	CONSTRAINT "foundation_progress_revision_check" CHECK ("vocabflow_app"."foundation_progress"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."foundation_reviews" (
	"learner_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"request_sha256" text NOT NULL,
	"response" jsonb NOT NULL,
	CONSTRAINT "foundation_reviews_learner_id_review_id_pk" PRIMARY KEY("learner_id","review_id")
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."foundation_targets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"parent_letter_id" uuid,
	"kind" text NOT NULL,
	"content" jsonb NOT NULL,
	"pins" jsonb NOT NULL,
	"content_sha256" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "foundation_targets_id_type_unique" UNIQUE("id","item_type"),
	CONSTRAINT "foundation_targets_type_check" CHECK ("vocabflow_app"."foundation_targets"."item_type" IN ('LETTER_ACTIVITY','UTTERANCE')),
	CONSTRAINT "foundation_targets_kind_check" CHECK (("vocabflow_app"."foundation_targets"."item_type"='UTTERANCE' AND "vocabflow_app"."foundation_targets"."kind"='UTTERANCE' AND "vocabflow_app"."foundation_targets"."parent_letter_id" IS NULL) OR ("vocabflow_app"."foundation_targets"."item_type"='LETTER_ACTIVITY' AND "vocabflow_app"."foundation_targets"."kind" IN ('LETTER_NAME','LETTER_SOUND') AND "vocabflow_app"."foundation_targets"."parent_letter_id" IS NOT NULL)),
	CONSTRAINT "foundation_targets_hash_check" CHECK ("vocabflow_app"."foundation_targets"."content_sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."foundation_attempts" ADD CONSTRAINT "foundation_attempts_target_id_foundation_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "vocabflow_app"."foundation_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."foundation_memberships" ADD CONSTRAINT "foundation_memberships_collection_foundation_collections_code_fk" FOREIGN KEY ("collection") REFERENCES "vocabflow_app"."foundation_collections"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."foundation_memberships" ADD CONSTRAINT "foundation_memberships_target_id_foundation_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "vocabflow_app"."foundation_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."foundation_progress" ADD CONSTRAINT "foundation_progress_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."foundation_progress" ADD CONSTRAINT "foundation_progress_target_id_item_type_foundation_targets_id_item_type_fk" FOREIGN KEY ("target_id","item_type") REFERENCES "vocabflow_app"."foundation_targets"("id","item_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."foundation_reviews" ADD CONSTRAINT "foundation_reviews_learner_id_learner_profiles_id_fk" FOREIGN KEY ("learner_id") REFERENCES "vocabflow_app"."learner_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."foundation_reviews" ADD CONSTRAINT "foundation_reviews_target_id_foundation_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "vocabflow_app"."foundation_targets"("id") ON DELETE no action ON UPDATE no action;