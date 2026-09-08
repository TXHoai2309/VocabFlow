CREATE TYPE "vocabflow_app"."household_role" AS ENUM('OWNER', 'PARENT');--> statement-breakpoint
CREATE TABLE "vocabflow_app"."household_members" (
	"household_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "vocabflow_app"."household_role" DEFAULT 'OWNER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_members_household_user_unique" UNIQUE("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "vocabflow_app"."households" (
	"id" uuid PRIMARY KEY NOT NULL,
	"primary_owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_primary_owner_user_id_unique" UNIQUE("primary_owner_user_id")
);
--> statement-breakpoint
ALTER TABLE "vocabflow_app"."household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "vocabflow_app"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."household_members" ADD CONSTRAINT "household_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "vocabflow_app"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."households" ADD CONSTRAINT "households_primary_owner_user_id_user_id_fk" FOREIGN KEY ("primary_owner_user_id") REFERENCES "vocabflow_app"."user"("id") ON DELETE no action ON UPDATE no action;