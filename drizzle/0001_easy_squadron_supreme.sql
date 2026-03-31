CREATE TABLE "comment_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"comment_id" integer NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comment_vote_user_comment" ON "comment_votes" USING btree ("user_id","comment_id");