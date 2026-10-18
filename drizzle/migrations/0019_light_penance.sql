CREATE TABLE "vocabflow_app"."master_v2_short_meanings" (
	"vocabulary_id" integer PRIMARY KEY NOT NULL,
	"proposal_identity" text NOT NULL,
	"source_content_hash" text NOT NULL,
	"short_meaning_vi" text,
	"source_type" text,
	"evidence_ref" text,
	"confidence" text,
	"validation_status" text NOT NULL,
	"reviewer_identity" text,
	"reviewed_at" timestamp with time zone,
	"review_evidence" text,
	"artifact_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_v2_short_meanings_proposal_identity_unique" UNIQUE("proposal_identity"),
	CONSTRAINT "master_v2_short_meanings_proposal_identity_check" CHECK (length(trim("vocabflow_app"."master_v2_short_meanings"."proposal_identity")) > 0),
	CONSTRAINT "master_v2_short_meanings_hash_check" CHECK ("vocabflow_app"."master_v2_short_meanings"."source_content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "master_v2_short_meanings_source_type_check" CHECK ("vocabflow_app"."master_v2_short_meanings"."source_type" IS NULL OR "vocabflow_app"."master_v2_short_meanings"."source_type" IN ('EXISTING_APPROVED_TRANSLATION', 'VERIFIED_SOURCE_GLOSS', 'AI_DERIVED')),
	CONSTRAINT "master_v2_short_meanings_confidence_check" CHECK ("vocabflow_app"."master_v2_short_meanings"."confidence" IS NULL OR "vocabflow_app"."master_v2_short_meanings"."confidence" IN ('HIGH', 'MEDIUM', 'LOW')),
	CONSTRAINT "master_v2_short_meanings_status_check" CHECK ("vocabflow_app"."master_v2_short_meanings"."validation_status" IN ('VERIFIED', 'REVIEW_REQUIRED', 'UNRESOLVED')),
	CONSTRAINT "master_v2_short_meanings_payload_check" CHECK (
    ("vocabflow_app"."master_v2_short_meanings"."validation_status" = 'UNRESOLVED' AND "vocabflow_app"."master_v2_short_meanings"."short_meaning_vi" IS NULL)
    OR ("vocabflow_app"."master_v2_short_meanings"."validation_status" IN ('VERIFIED', 'REVIEW_REQUIRED') AND length(trim("vocabflow_app"."master_v2_short_meanings"."short_meaning_vi")) > 0)
  ),
	CONSTRAINT "master_v2_short_meanings_verified_evidence_check" CHECK (
    "vocabflow_app"."master_v2_short_meanings"."validation_status" <> 'VERIFIED'
    OR (
      "vocabflow_app"."master_v2_short_meanings"."evidence_ref" IS NOT NULL AND length(trim("vocabflow_app"."master_v2_short_meanings"."evidence_ref")) > 0
      AND "vocabflow_app"."master_v2_short_meanings"."source_type" IS NOT NULL
      AND ("vocabflow_app"."master_v2_short_meanings"."source_type" <> 'AI_DERIVED' OR (
        "vocabflow_app"."master_v2_short_meanings"."reviewer_identity" IS NOT NULL AND length(trim("vocabflow_app"."master_v2_short_meanings"."reviewer_identity")) > 0
        AND "vocabflow_app"."master_v2_short_meanings"."reviewed_at" IS NOT NULL
        AND "vocabflow_app"."master_v2_short_meanings"."review_evidence" IS NOT NULL AND length(trim("vocabflow_app"."master_v2_short_meanings"."review_evidence")) > 0
      ))
    )
  )
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_v2_short_meanings" ADD CONSTRAINT "master_v2_short_meanings_vocabulary_id_vocabularies_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabflow_app"."vocabularies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "master_v2_short_meanings_status_hash_idx" ON "vocabflow_app"."master_v2_short_meanings" USING btree ("validation_status","source_content_hash");
