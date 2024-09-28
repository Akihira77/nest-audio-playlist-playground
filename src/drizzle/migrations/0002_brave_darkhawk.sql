ALTER TABLE "audios" ALTER COLUMN "uploader_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "playlist_metadata" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_playlists" ALTER COLUMN "playlist_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users_playlists" ALTER COLUMN "audio_id" SET NOT NULL;