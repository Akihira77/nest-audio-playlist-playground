import { Injectable, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Audio } from "../audio/types.js";
import { Playlist } from "../playlist/types.js";
import { User } from "../user/types.js";
import { DataSource } from "typeorm";

@Injectable()
export class CleanupJobService implements OnModuleInit {
    constructor(private readonly dataSource: DataSource) {}

    async onModuleInit() {
        console.log("Running initial database cleanup job on app startup...");
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

            await queryRunner.query(
                `DELETE FROM ${Playlist.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            await queryRunner.query(
                `DELETE FROM ${Audio.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            await queryRunner.query(
                `DELETE FROM ${User.name.toLowerCase()}s WHERE "deletedAt" IS NOT NULL`,
            );

            await queryRunner.commitTransaction();
            console.log("Database cleanup job completed.");
        } catch (error) {
            console.error("Database cleanup job failed", error);
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }
}
