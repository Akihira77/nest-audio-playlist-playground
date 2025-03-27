import { Injectable, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Audio } from "../audio/types.js";
import { Playlist } from "../playlist/types.js";
import { User } from "../user/types.js";
import { DataSource } from "typeorm";
import { CacheService } from "../cache/cache.service.js";
import { S3Service } from "../s3/s3.service.js";

@Injectable()
export class CleanupJobService implements OnModuleInit {
    constructor(
        private readonly dataSource: DataSource,
        private readonly cacheService: CacheService,
        private readonly s3Service: S3Service,
    ) {}

    async onModuleInit() {
        console.log(
            "Running initial database and Redis cleanup job on app startup...",
        );
        await this.cleanupDatabase();
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupDatabase() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            console.log("Running database cleanup job...");

            await queryRunner.startTransaction();

            await queryRunner.query(`
                DELETE FROM users_playlists up
                WHERE up."playlistsId" IN (
                    SELECT p.id FROM ${Playlist.name.toLowerCase()}s p 
                    WHERE p."deletedAt" IS NOT NULL
                )
            `);

            const playlistsToDelete: { id: number }[] = await queryRunner.query(
                `SELECT id FROM ${Playlist.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            await queryRunner.query(
                `DELETE FROM ${Playlist.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            /* DELETE AUDIO FROM DB AND AMAZON S3 */
            const audiosToDelete: { id: number; s3_key: string }[] =
                await queryRunner.query(
                    `SELECT id, s3_key FROM ${Audio.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
                );

            await queryRunner.query(
                `DELETE FROM ${Audio.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            const fileKeys = audiosToDelete.map((audio) => audio.s3_key);
            if (fileKeys.length > 0) {
                console.log(`Deleting ${fileKeys.length} files from S3...`);
                await this.s3Service.deleteFilesBatch(fileKeys);
            }

            const usersToDelete: { id: number }[] = await queryRunner.query(
                `SELECT id FROM ${User.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            await queryRunner.query(
                `DELETE FROM ${User.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            // Hapus key yang relevan di Redis berdasarkan ID yang terhapus
            await this.cleanupRedisCache(
                usersToDelete,
                playlistsToDelete,
                audiosToDelete,
            );

            await queryRunner.commitTransaction();
            console.log("Database and Redis cleanup job completed.");
        } catch (error) {
            console.error("Database cleanup job failed", error);
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }

    private async cleanupRedisCache(
        usersToDelete: { id: number }[],
        playlistsToDelete: { id: number }[],
        audiosToDelete: { id: number }[],
    ) {
        console.log("Running Redis cleanup...");

        try {
            // Hapus cache User
            for (const user of usersToDelete) {
                await this.cacheService.delete(`user_${user.id}`);
            }

            // Hapus cache Playlist
            for (const playlist of playlistsToDelete) {
                await this.cacheService.delete(`playlist_${playlist.id}`);
            }

            // Hapus cache Audio
            for (const audio of audiosToDelete) {
                await this.cacheService.delete(`audio_${audio.id}`);
            }

            console.log("Redis cleanup completed.");
        } catch (error) {
            console.error("Redis cleanup failed", error);
        }
    }
}
