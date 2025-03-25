import { Module } from "@nestjs/common";
import { PlaylistService, SPlaylistService } from "./playlist.service.js";
import { PlaylistController } from "./playlist.controller.js";
import { Playlist } from "./types.js";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
    controllers: [PlaylistController],
    providers: [
        {
            provide: SPlaylistService,
            useClass: PlaylistService,
        },
    ],
    imports: [TypeOrmModule.forFeature([Playlist])],
})
export class PlaylistModule {}
