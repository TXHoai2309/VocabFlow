CREATE TABLE "vocabflow_app"."master_learning_set_mappings" (
	"master_learning_set_id" uuid PRIMARY KEY NOT NULL,
	"learning_set_id" integer NOT NULL,
	"source_dataset_id" uuid NOT NULL,
	"last_release_hash" text NOT NULL,
	"last_import_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_learning_set_mappings_learning_set_id_unique" UNIQUE("learning_set_id"),
	CONSTRAINT "master_learning_set_mappings_release_hash_check" CHECK ("vocabflow_app"."master_learning_set_mappings"."last_release_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."master_learning_set_memberships" (
	"master_learning_set_item_id" uuid NOT NULL,
	"master_learning_set_id" uuid NOT NULL,
	"master_sense_id" uuid NOT NULL,
	"learning_set_id" integer NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"last_release_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_learning_set_memberships_pk" PRIMARY KEY("master_learning_set_item_id"),
	CONSTRAINT "master_learning_set_memberships_set_sense_unique" UNIQUE("master_learning_set_id","master_sense_id"),
	CONSTRAINT "master_learning_set_memberships_sort_order_check" CHECK ("vocabflow_app"."master_learning_set_memberships"."sort_order" >= 0),
	CONSTRAINT "master_learning_set_memberships_release_hash_check" CHECK ("vocabflow_app"."master_learning_set_memberships"."last_release_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."master_topic_mappings" (
	"master_topic_id" uuid PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"source_dataset_id" uuid NOT NULL,
	"last_release_hash" text NOT NULL,
	"last_import_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_topic_mappings_topic_id_unique" UNIQUE("topic_id"),
	CONSTRAINT "master_topic_mappings_release_hash_check" CHECK ("vocabflow_app"."master_topic_mappings"."last_release_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."master_vocabulary_import_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_id" uuid NOT NULL,
	"dataset_version" text NOT NULL,
	"schema_version" text NOT NULL,
	"app_import_contract_version" text NOT NULL,
	"projection_contract_version" text NOT NULL,
	"release_hash" text NOT NULL,
	"reconciliation_hash" text NOT NULL,
	"plan_fingerprint" text NOT NULL,
	"environment" text NOT NULL,
	"target_branch_id" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_vocabulary_import_runs_release_reconciliation_unique" UNIQUE("environment","dataset_id","release_hash","app_import_contract_version","projection_contract_version","reconciliation_hash"),
	CONSTRAINT "master_vocabulary_import_runs_release_hash_check" CHECK ("vocabflow_app"."master_vocabulary_import_runs"."release_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "master_vocabulary_import_runs_reconciliation_hash_check" CHECK ("vocabflow_app"."master_vocabulary_import_runs"."reconciliation_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "master_vocabulary_import_runs_plan_fingerprint_check" CHECK ("vocabflow_app"."master_vocabulary_import_runs"."plan_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "master_vocabulary_import_runs_environment_check" CHECK ("vocabflow_app"."master_vocabulary_import_runs"."environment" IN ('development', 'test', 'production'))
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."master_vocabulary_mappings" (
	"master_sense_id" uuid PRIMARY KEY NOT NULL,
	"master_lexeme_id" uuid NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"source_dataset_id" uuid NOT NULL,
	"source_dataset_version" text NOT NULL,
	"source_schema_version" text NOT NULL,
	"projection_contract_version" text NOT NULL,
	"applied_projection_fingerprint" text NOT NULL,
	"applied_lexeme_revision" integer NOT NULL,
	"applied_sense_revision" integer NOT NULL,
	"last_release_hash" text NOT NULL,
	"last_import_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_vocabulary_mappings_vocabulary_id_unique" UNIQUE("vocabulary_id"),
	CONSTRAINT "master_vocabulary_mappings_fingerprint_check" CHECK ("vocabflow_app"."master_vocabulary_mappings"."applied_projection_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "master_vocabulary_mappings_release_hash_check" CHECK ("vocabflow_app"."master_vocabulary_mappings"."last_release_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "master_vocabulary_mappings_lexeme_revision_check" CHECK ("vocabflow_app"."master_vocabulary_mappings"."applied_lexeme_revision" >= 1),
	CONSTRAINT "master_vocabulary_mappings_sense_revision_check" CHECK ("vocabflow_app"."master_vocabulary_mappings"."applied_sense_revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."master_vocabulary_topic_memberships" (
	"master_sense_id" uuid NOT NULL,
	"master_topic_id" uuid NOT NULL,
	"vocabulary_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"last_release_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "master_vocabulary_topic_memberships_pk" PRIMARY KEY("master_sense_id","master_topic_id"),
	CONSTRAINT "master_vocabulary_topic_memberships_app_pair_unique" UNIQUE("vocabulary_id","topic_id"),
	CONSTRAINT "master_vocabulary_topic_memberships_release_hash_check" CHECK ("vocabflow_app"."master_vocabulary_topic_memberships"."last_release_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_learning_set_mappings" ADD CONSTRAINT "master_learning_set_mappings_learning_set_id_learning_sets_id_fk" FOREIGN KEY ("learning_set_id") REFERENCES "vocabflow_app"."learning_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_learning_set_mappings" ADD CONSTRAINT "master_learning_set_mappings_last_import_run_id_master_vocabulary_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "vocabflow_app"."master_vocabulary_import_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_learning_set_memberships" ADD CONSTRAINT "master_learning_set_memberships_set_fk" FOREIGN KEY ("master_learning_set_id") REFERENCES "vocabflow_app"."master_learning_set_mappings"("master_learning_set_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_learning_set_memberships" ADD CONSTRAINT "master_learning_set_memberships_sense_fk" FOREIGN KEY ("master_sense_id") REFERENCES "vocabflow_app"."master_vocabulary_mappings"("master_sense_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_learning_set_memberships" ADD CONSTRAINT "master_learning_set_memberships_runtime_link_fk" FOREIGN KEY ("learning_set_id","vocabulary_id") REFERENCES "vocabflow_app"."learning_set_items"("learning_set_id","vocabulary_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_topic_mappings" ADD CONSTRAINT "master_topic_mappings_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "vocabflow_app"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_topic_mappings" ADD CONSTRAINT "master_topic_mappings_last_import_run_id_master_vocabulary_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "vocabflow_app"."master_vocabulary_import_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_vocabulary_mappings" ADD CONSTRAINT "master_vocabulary_mappings_vocabulary_id_vocabularies_id_fk" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabflow_app"."vocabularies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_vocabulary_mappings" ADD CONSTRAINT "master_vocabulary_mappings_last_import_run_id_master_vocabulary_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "vocabflow_app"."master_vocabulary_import_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_vocabulary_topic_memberships" ADD CONSTRAINT "master_vocabulary_topic_memberships_sense_fk" FOREIGN KEY ("master_sense_id") REFERENCES "vocabflow_app"."master_vocabulary_mappings"("master_sense_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_vocabulary_topic_memberships" ADD CONSTRAINT "master_vocabulary_topic_memberships_topic_fk" FOREIGN KEY ("master_topic_id") REFERENCES "vocabflow_app"."master_topic_mappings"("master_topic_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."master_vocabulary_topic_memberships" ADD CONSTRAINT "master_vocabulary_topic_memberships_runtime_link_fk" FOREIGN KEY ("vocabulary_id","topic_id") REFERENCES "vocabflow_app"."vocabulary_topics"("vocabulary_id","topic_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "vocabflow_app"."guard_master_vocabulary_mapping_identity"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	argument_index integer;
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'MASTER_VOCABULARY_MAPPING_DELETE_FORBIDDEN' USING ERRCODE = '42501';
	END IF;
	FOR argument_index IN 0..(TG_NARGS - 1) LOOP
		IF (to_jsonb(OLD) ->> TG_ARGV[argument_index]) IS DISTINCT FROM (to_jsonb(NEW) ->> TG_ARGV[argument_index]) THEN
			RAISE EXCEPTION 'MASTER_MAPPING_IDENTITY_IMMUTABLE' USING ERRCODE = '42501';
		END IF;
	END LOOP;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "master_vocabulary_mappings_identity_guard"
BEFORE UPDATE OR DELETE ON "vocabflow_app"."master_vocabulary_mappings"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_vocabulary_mapping_identity"('master_sense_id', 'vocabulary_id');
--> statement-breakpoint
CREATE TRIGGER "master_topic_mappings_identity_guard"
BEFORE UPDATE OR DELETE ON "vocabflow_app"."master_topic_mappings"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_vocabulary_mapping_identity"('master_topic_id', 'topic_id');
--> statement-breakpoint
CREATE TRIGGER "master_learning_set_mappings_identity_guard"
BEFORE UPDATE OR DELETE ON "vocabflow_app"."master_learning_set_mappings"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_vocabulary_mapping_identity"('master_learning_set_id', 'learning_set_id');
--> statement-breakpoint
CREATE TRIGGER "master_vocabulary_topic_memberships_identity_guard"
BEFORE UPDATE OR DELETE ON "vocabflow_app"."master_vocabulary_topic_memberships"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_vocabulary_mapping_identity"('master_sense_id', 'master_topic_id');
--> statement-breakpoint
CREATE TRIGGER "master_learning_set_memberships_identity_guard"
BEFORE UPDATE OR DELETE ON "vocabflow_app"."master_learning_set_memberships"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_vocabulary_mapping_identity"('master_learning_set_item_id', 'master_learning_set_id', 'master_sense_id');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "vocabflow_app"."guard_master_import_run_immutability"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'MASTER_IMPORT_RUN_IMMUTABLE' USING ERRCODE = '42501';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "master_vocabulary_import_runs_immutable_guard"
BEFORE UPDATE OR DELETE ON "vocabflow_app"."master_vocabulary_import_runs"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_import_run_immutability"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "vocabflow_app"."guard_master_import_owned_write"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	IF current_setting('vocabflow.master_v2_import', true) IS DISTINCT FROM 'on' THEN
		RAISE EXCEPTION 'MASTER_IMPORT_OWNED_WRITE_REQUIRES_IMPORTER' USING ERRCODE = '42501';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'MASTER_IMPORT_IDENTITY_DELETE_FORBIDDEN' USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "master_vocabulary_import_runs_write_guard"
BEFORE INSERT ON "vocabflow_app"."master_vocabulary_import_runs"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_import_owned_write"();
--> statement-breakpoint
CREATE TRIGGER "master_vocabulary_mappings_write_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "vocabflow_app"."master_vocabulary_mappings"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_import_owned_write"();
--> statement-breakpoint
CREATE TRIGGER "master_topic_mappings_write_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "vocabflow_app"."master_topic_mappings"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_import_owned_write"();
--> statement-breakpoint
CREATE TRIGGER "master_learning_set_mappings_write_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "vocabflow_app"."master_learning_set_mappings"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_import_owned_write"();
--> statement-breakpoint
CREATE TRIGGER "master_vocabulary_topic_memberships_write_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "vocabflow_app"."master_vocabulary_topic_memberships"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_import_owned_write"();
--> statement-breakpoint
CREATE TRIGGER "master_learning_set_memberships_write_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "vocabflow_app"."master_learning_set_memberships"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_import_owned_write"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "vocabflow_app"."guard_master_owned_topic_write"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	IF EXISTS (SELECT 1 FROM "vocabflow_app"."master_topic_mappings" AS mapping WHERE mapping."topic_id" = OLD."id")
		AND ROW(NEW."slug", NEW."name", NEW."description", NEW."sort_order", NEW."enabled")
			IS DISTINCT FROM ROW(OLD."slug", OLD."name", OLD."description", OLD."sort_order", OLD."enabled")
		AND current_setting('vocabflow.master_v2_import', true) IS DISTINCT FROM 'on' THEN
		RAISE EXCEPTION 'MASTER_MANAGED_TOPIC_WRITE_REQUIRES_IMPORTER' USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "topics_master_managed_write_guard"
BEFORE UPDATE ON "vocabflow_app"."topics"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_owned_topic_write"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "vocabflow_app"."guard_master_owned_learning_set_write"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	IF EXISTS (SELECT 1 FROM "vocabflow_app"."master_learning_set_mappings" AS mapping WHERE mapping."learning_set_id" = OLD."id")
		AND ROW(NEW."slug", NEW."name", NEW."description", NEW."grade", NEW."enabled", NEW."sort_order")
			IS DISTINCT FROM ROW(OLD."slug", OLD."name", OLD."description", OLD."grade", OLD."enabled", OLD."sort_order")
		AND current_setting('vocabflow.master_v2_import', true) IS DISTINCT FROM 'on' THEN
		RAISE EXCEPTION 'MASTER_MANAGED_LEARNING_SET_WRITE_REQUIRES_IMPORTER' USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "learning_sets_master_managed_write_guard"
BEFORE UPDATE ON "vocabflow_app"."learning_sets"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_owned_learning_set_write"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "vocabflow_app"."guard_master_learning_set_item_write"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	IF EXISTS (SELECT 1 FROM "vocabflow_app"."master_learning_set_memberships" AS mapping WHERE mapping."learning_set_id" = OLD."learning_set_id" AND mapping."vocabulary_id" = OLD."vocabulary_id")
		AND (TG_OP = 'DELETE' OR NEW."sort_order" IS DISTINCT FROM OLD."sort_order")
		AND current_setting('vocabflow.master_v2_import', true) IS DISTINCT FROM 'on' THEN
		RAISE EXCEPTION 'MASTER_MANAGED_LEARNING_SET_ITEM_WRITE_REQUIRES_IMPORTER' USING ERRCODE = '42501';
	END IF;
	IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "learning_set_items_master_managed_write_guard"
BEFORE UPDATE OR DELETE ON "vocabflow_app"."learning_set_items"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_learning_set_item_write"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "vocabflow_app"."guard_master_managed_vocabulary_write"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "vocabflow_app"."master_vocabulary_mappings" AS mapping
		WHERE mapping."vocabulary_id" = OLD."id"
	) AND ROW(
		NEW."word", NEW."ipa", NEW."vietnamese", NEW."vietnamese_override",
		NEW."definition_en", NEW."example_en", NEW."image_url", NEW."image_quarantined",
		NEW."audio_url", NEW."topic", NEW."level", NEW."enabled", NEW."content_version"
	) IS DISTINCT FROM ROW(
		OLD."word", OLD."ipa", OLD."vietnamese", OLD."vietnamese_override",
		OLD."definition_en", OLD."example_en", OLD."image_url", OLD."image_quarantined",
		OLD."audio_url", OLD."topic", OLD."level", OLD."enabled", OLD."content_version"
	) AND current_setting('vocabflow.master_v2_import', true) IS DISTINCT FROM 'on' THEN
		RAISE EXCEPTION 'MASTER_MANAGED_VOCABULARY_WRITE_REQUIRES_IMPORTER' USING ERRCODE = '42501';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "vocabularies_master_managed_write_guard"
BEFORE UPDATE ON "vocabflow_app"."vocabularies"
FOR EACH ROW EXECUTE FUNCTION "vocabflow_app"."guard_master_managed_vocabulary_write"();
