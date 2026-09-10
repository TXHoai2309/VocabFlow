CREATE TABLE "vocabflow_app"."learner_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"avatar_key" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."learner_profiles" ADD CONSTRAINT "learner_profiles_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "vocabflow_app"."households"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learner_profiles_household_enabled_created_id_idx" ON "vocabflow_app"."learner_profiles" USING btree ("household_id","enabled","created_at","id");