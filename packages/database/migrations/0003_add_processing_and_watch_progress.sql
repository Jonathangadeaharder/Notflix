ALTER TABLE "video_processing"
	ADD COLUMN IF NOT EXISTS "progress_stage" text DEFAULT 'QUEUED';
--> statement-breakpoint
ALTER TABLE "video_processing"
	ADD COLUMN IF NOT EXISTS "progress_percent" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "video_processing"
SET
	"progress_stage" = COALESCE("progress_stage", CASE WHEN "status" = 'COMPLETED' THEN 'READY' WHEN "status" = 'ERROR' THEN 'FAILED' ELSE 'QUEUED' END),
	"progress_percent" = COALESCE("progress_percent", CASE WHEN "status" = 'COMPLETED' THEN 100 ELSE 0 END);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "watch_progress" (
	"user_id" uuid NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
	"video_id" uuid NOT NULL REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action,
	"current_time" integer DEFAULT 0 NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watch_progress_user_id_video_id_pk" PRIMARY KEY("user_id","video_id")
);
