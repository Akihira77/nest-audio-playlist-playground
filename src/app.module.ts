import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AudioModule } from "./audio/audio.module.js";
import { PlaylistModule } from "./playlist/playlist.module.js";
import { UserModule } from "./user/user.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user/types.js";
import { Audio } from "./audio/types.js";
import { Playlist } from "./playlist/types.js";
import { CustomCacheModule } from "./cache/cache.module.js";
import { ScheduleModule } from "@nestjs/schedule";
import { CleanupJobService } from "./cleanup-job/cleanup-job.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { S3Service } from "./s3/s3.service.js";
import { S3Module } from "./s3/s3.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CustomCacheModule,
        TypeOrmModule.forRoot({
            type: "postgres",
            host: process.env.POSTGRES_HOST,
            port: Number(process.env.POSTGRES_PORT ?? 5432),
            username: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DATABASE,
            entities: [User, Audio, Playlist],
            synchronize: true,
            logging: ["query", "error"],
        }),

        //INFO: User Module
        AuthModule,
        UserModule,
        AudioModule,
        PlaylistModule,
        S3Module,

        //INFO: Background Module
        ScheduleModule.forRoot(),
    ],
    controllers: [],
    providers: [CleanupJobService],
})
export class AppModule {}
