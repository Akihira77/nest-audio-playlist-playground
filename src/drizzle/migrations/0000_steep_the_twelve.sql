CREATE TABLE IF NOT EXISTS "audios" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"duration" numeric NOT NULL,
	"creator" text NOT NULL,
	"publish_at" integer NOT NULL,
	"file_path" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"uploader_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlist_metadata" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "playlist_metadata_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid,
	"name" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_playlists" (
	"playlist_id" integer,
	"audio_id" integer
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audios" ADD CONSTRAINT "audios_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "playlist_metadata" ADD CONSTRAINT "playlist_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_playlists" ADD CONSTRAINT "users_playlists_playlist_id_playlist_metadata_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlist_metadata"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_playlists" ADD CONSTRAINT "users_playlists_audio_id_audios_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."audios"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "title_idx" ON "audios" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_idx" ON "audios" USING btree ("creator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uploader_idx" ON "audios" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "name_idx" ON "playlist_metadata" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_idx" ON "users" USING btree ("email");