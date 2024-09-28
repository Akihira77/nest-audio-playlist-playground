import { Module } from "@nestjs/common";
import { DrizzleModule } from "../drizzle/drizzle.module.js";
import { PlaylistService, SPlaylistService } from "./playlist.service.js";
import { PlaylistController } from "./playlist.controller.js";

@Module({
    controllers: [PlaylistController],
    providers: [
        {
            provide: SPlaylistService,
            useClass: PlaylistService,
        },
    ],
    imports: [DrizzleModule],
})
export class PlaylistModule {}
