CREATE TABLE "vocabflow_app"."owner_editorial_projections" (
	"proposal_key" text PRIMARY KEY NOT NULL,
	"source_group_key" text NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"part_of_speech" text NOT NULL,
	"cefr" text,
	"tags" jsonb NOT NULL,
	"examples" jsonb NOT NULL,
	"source_provenance" jsonb NOT NULL,
	"content_sha256" text NOT NULL,
	"content_review_decision" text DEFAULT 'OWNER_SELECTED_PUBLICATION' NOT NULL,
	"editorial_status" text DEFAULT 'OWNER_PUBLISHED_CATALOG' NOT NULL,
	"rights_status" text DEFAULT 'OWNER_ATTESTED_MEDIA_TEXT_PROVENANCE_RETAINED' NOT NULL,
	"development_media" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_editorial_vocabulary_unique" UNIQUE("vocabulary_id"),
	CONSTRAINT "owner_editorial_hash_check" CHECK ("vocabflow_app"."owner_editorial_projections"."content_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "owner_editorial_review_check" CHECK ("vocabflow_app"."owner_editorial_projections"."content_review_decision" = 'OWNER_SELECTED_PUBLICATION')
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."owner_editorial_projections" ADD CONSTRAINT "owner_editorial_projections_vocabulary_id_vocabularies_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabflow_app"."vocabularies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Compatibility view keeps the current V2 catalog readable before the atomic
-- owner-catalog cutover. It switches with that transaction, without an empty
-- catalog between schema/app rollout and the separate reviewed content apply.
-- The legacy projection was provisioned by the old catalog importer, so a
-- fresh migration-only database legitimately has no legacy table to union.
DO $publication_view$
BEGIN
  IF to_regclass('vocabflow_app.master_v2_development_projections') IS NULL THEN
    EXECUTE 'CREATE VIEW vocabflow_app.owner_editorial_active_projections AS
      SELECT proposal_key,source_group_key,vocabulary_id,part_of_speech,cefr,tags,
        examples,source_provenance,content_sha256,content_review_decision,
        editorial_status,rights_status,development_media,created_at,updated_at
      FROM vocabflow_app.owner_editorial_projections';
  ELSE
    EXECUTE 'CREATE VIEW vocabflow_app.owner_editorial_active_projections AS
      SELECT proposal_key,source_group_key,vocabulary_id,part_of_speech,cefr,tags,
        examples,source_provenance,content_sha256,content_review_decision,
        editorial_status,rights_status,development_media,created_at,updated_at
      FROM vocabflow_app.owner_editorial_projections
      UNION ALL
      SELECT proposal_key,source_group_key,vocabulary_id,part_of_speech,cefr,tags,
        examples,source_provenance,content_sha256,content_review_decision,
        editorial_status,rights_status,development_media,created_at,updated_at
      FROM vocabflow_app.master_v2_development_projections
      WHERE NOT EXISTS (SELECT 1 FROM vocabflow_app.owner_editorial_projections)';
  END IF;
END
$publication_view$;
--> statement-breakpoint
GRANT SELECT ON "vocabflow_app"."owner_editorial_projections", "vocabflow_app"."owner_editorial_active_projections" TO "vocabflow_runtime";
