import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { PG_CONNECTION } from "../constants.js";
import * as schema from "./schema.js";

@Module({
    providers: [
        {
            provide: PG_CONNECTION,
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const connectionString = configService.get<string>("DB_URI");
                const pool = new pg.Pool({
                    connectionString,
                    idleTimeoutMillis: 60 * 60 * 1000,
                    max: 10,
                });

                console.log("Connected to postgres database");
                return drizzle(pool, {
                    schema,
                    logger: true,
                }) as NodePgDatabase<typeof schema>;
            },
        },
    ],
    exports: [PG_CONNECTION],
})
export class DrizzleModule {}
