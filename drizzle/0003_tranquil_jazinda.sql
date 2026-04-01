CREATE TABLE "bot_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" text NOT NULL,
	"project_name" text NOT NULL,
	"project_description" text NOT NULL,
	"tech_stack" text NOT NULL,
	"project_state" text DEFAULT '{}' NOT NULL,
	"questions_asked" integer DEFAULT 0 NOT NULL,
	"max_questions" integer DEFAULT 12 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_projects_persona_id_unique" UNIQUE("persona_id")
);
--> statement-breakpoint
ALTER TABLE "ai_jobs" ALTER COLUMN "question_id" DROP NOT NULL;