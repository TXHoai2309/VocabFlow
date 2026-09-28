GRANT USAGE ON SEQUENCE "vocabflow_app"."vocabularies_id_seq" TO "vocabflow_runtime";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE "vocabflow_migration" IN SCHEMA "vocabflow_app" GRANT USAGE ON SEQUENCES TO "vocabflow_runtime";
