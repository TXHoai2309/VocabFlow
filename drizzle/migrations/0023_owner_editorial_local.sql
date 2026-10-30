CREATE TABLE "vocabflow_app"."owner_editorial_local_projections" (
	"proposal_key" text PRIMARY KEY NOT NULL,
	"source_group_key" text NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"part_of_speech" text NOT NULL,
	"cefr" text,
	"tags" jsonb NOT NULL,
	"examples" jsonb NOT NULL,
	"source_provenance" jsonb NOT NULL,
	"content_sha256" text NOT NULL,
	"content_review_decision" text DEFAULT 'OWNER_SELECTED_LOCAL' NOT NULL,
	"editorial_status" text DEFAULT 'OWNER_LOCAL_CATALOG' NOT NULL,
	"rights_status" text DEFAULT 'OWNER_ATTESTED_MEDIA_TEXT_PROVENANCE_RETAINED' NOT NULL,
	"development_media" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_editorial_local_vocabulary_unique" UNIQUE("vocabulary_id"),
	CONSTRAINT "owner_editorial_local_hash_check" CHECK ("vocabflow_app"."owner_editorial_local_projections"."content_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "owner_editorial_local_review_check" CHECK ("vocabflow_app"."owner_editorial_local_projections"."content_review_decision" = 'OWNER_SELECTED_LOCAL')
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."owner_editorial_local_projections" ADD CONSTRAINT "owner_editorial_local_projections_vocabulary_id_vocabularies_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabflow_app"."vocabularies"("id") ON DELETE no action ON UPDATE no action;