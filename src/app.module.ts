import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AudioModule } from "./audio/audio.module.js";
import { PlaylistModule } from "./playlist/playlist.module.js";
import { UserModule } from "./user/user.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user/types.js";
import { Audio } from "./audio/types.js";
import { Playlist } from "./playlist/types.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
            type: "postgres",
            host: process.env.POSTGRES_HOST,
            port: Number(process.env.POSTGRES_PORT ?? 5432),
            username: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DATABASE,
            entities: [User, Audio, Playlist],
            synchronize: true,
        }),
        UserModule,
        AudioModule,
        PlaylistModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
