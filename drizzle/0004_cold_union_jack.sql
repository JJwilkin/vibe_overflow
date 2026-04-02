CREATE TABLE "custom_personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" text NOT NULL,
	"created_by" integer NOT NULL,
	"display_name" text NOT NULL,
	"avatar" text NOT NULL,
	"bio" text NOT NULL,
	"about_me" text DEFAULT '' NOT NULL,
	"system_prompt" text NOT NULL,
	"response_delay" text DEFAULT '[120,480]' NOT NULL,
	"reply_probability" integer DEFAULT 50 NOT NULL,
	"vote_pattern" text DEFAULT 'mixed' NOT NULL,
	"project_preferences" text DEFAULT '{}' NOT NULL,
	"question_interval" text DEFAULT '[2,4]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_personas_persona_id_unique" UNIQUE("persona_id")
);
--> statement-breakpoint
ALTER TABLE "custom_personas" ADD CONSTRAINT "custom_personas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;