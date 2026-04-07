CREATE TABLE IF NOT EXISTS "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_lemmas" (
	"video_id" uuid NOT NULL REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action,
	"lemma" text NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "video_lemmas_video_id_lemma_pk" PRIMARY KEY("video_id","lemma")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_lemmas_lemma_idx" ON "video_lemmas" ("lemma");
