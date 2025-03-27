import { Module } from "@nestjs/common";
import { PlaylistService, SPlaylistService } from "./playlist.service.js";
import { PlaylistController } from "./playlist.controller.js";
import { Playlist } from "./types.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/types.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
    controllers: [PlaylistController],
    providers: [
        {
            provide: SPlaylistService,
            useClass: PlaylistService,
        },
    ],
    imports: [AuthModule, TypeOrmModule.forFeature([Playlist, User])],
})
export class PlaylistModule {}
