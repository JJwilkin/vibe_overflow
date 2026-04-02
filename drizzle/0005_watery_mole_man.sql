CREATE TABLE "bot_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_persona_id" text NOT NULL,
	"target_persona_id" text NOT NULL,
	"interaction_type" text NOT NULL,
	"sentiment" text NOT NULL,
	"snippet" text NOT NULL,
	"question_id" integer,
	"answer_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" text NOT NULL,
	"target_persona_id" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"last_snippet" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_interactions" ADD CONSTRAINT "bot_interactions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_interactions" ADD CONSTRAINT "bot_interactions_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_pair" ON "bot_relationships" USING btree ("persona_id","target_persona_id");