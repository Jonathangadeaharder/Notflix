CREATE TYPE "public"."vocab_level" AS ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2');--> statement-breakpoint
CREATE TABLE "known_words" (
	"user_id" uuid NOT NULL,
	"lemma" text NOT NULL,
	"lang" text NOT NULL,
	"level" "vocab_level",
	"is_proper" boolean DEFAULT false,
	CONSTRAINT "known_words_user_id_lemma_lang_pk" PRIMARY KEY("user_id","lemma","lang")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"native_lang" text DEFAULT 'en',
	"target_lang" text DEFAULT 'es',
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"game_interval_minutes" integer DEFAULT 10,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"file_path" text NOT NULL,
	"thumbnail_path" text,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_processing" (
	"video_id" uuid NOT NULL,
	"target_lang" text NOT NULL,
	"status" text NOT NULL,
	"vtt_json" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "video_processing_video_id_target_lang_pk" PRIMARY KEY("video_id","target_lang")
);
--> statement-breakpoint
ALTER TABLE "known_words" ADD CONSTRAINT "known_words_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_processing" ADD CONSTRAINT "video_processing_video_id_video_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."video"("id") ON DELETE cascade ON UPDATE no action;