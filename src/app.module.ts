import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DrizzleModule } from "./drizzle/drizzle.module.js";
import { AudioModule } from "./audio/audio.module.js";
import { PlaylistModule } from "./playlist/playlist.module.js";
import { UserModule } from "./user/user.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DrizzleModule,
        UserModule,
        AudioModule,
        PlaylistModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
