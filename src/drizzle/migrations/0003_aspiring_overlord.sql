ALTER TABLE "playlist_metadata" ALTER COLUMN "is_public" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "playlist_metadata" ADD COLUMN "audio_count" integer NOT NULL;