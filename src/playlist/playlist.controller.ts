import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Res,
    UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../user/auth.guard.js";
import { Response } from "express";
import { CreatePlaylistDTO } from "./types.js";
import { IPlaylistService, SPlaylistService } from "./playlist.service.js";
import { User } from "../util/decorator.js";

@Controller("playlists")
@UseGuards(AuthGuard)
export class PlaylistController {
    constructor(
        @Inject(SPlaylistService)
        private readonly playlistService: IPlaylistService,
    ) {}

    @Get("")
    public async findAllMyPlaylists(
        @User() currentUser: { userId: number; name: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const playlists = await this.playlistService.findMyPlaylists(
                currentUser.userId,
            );

            return res.status(HttpStatus.OK).json({ playlists });
        } catch (error) {
            console.error(`${this.findAllMyPlaylists.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get(":playlistId")
    public async openAPlaylist(
        @Param("playlistId", ParseIntPipe) playlistId: number,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result =
                await this.playlistService.findMyPlaylistPreloadAudios(
                    playlistId,
                );

            if (!result) {
                return res
                    .status(HttpStatus.NOT_FOUND)
                    .send("Playlist not found");
            }

            return res.status(HttpStatus.OK).json({ playlist: result });
        } catch (error) {
            console.error(`${this.findAllMyPlaylists.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Post("")
    public async create(
        @Body() data: CreatePlaylistDTO,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistService.create(data);
            if (!result) {
                throw new Error("Failed creating playlist");
            }

            return res.status(HttpStatus.CREATED).json({ playlist: result });
        } catch (error) {
            console.error(`${this.create.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Patch(":playlistId")
    public async editPlaylistMetadata(
        @Param("playlistId", ParseIntPipe) playlistId: number,
        @Body() data: CreatePlaylistDTO,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistService.editPlaylistMetadata(
                playlistId,
                data,
            );
            if (!result) {
                throw new Error("Failed updating playlist");
            }

            return res.status(HttpStatus.OK).json({ playlist: result });
        } catch (error) {
            console.error(`${this.editPlaylistMetadata.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Post("add")
    public async addAudioInPlaylist(
        @Query() query: { playlistId: number; audioId: number },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistService.addAudioInPlaylist(
                query.playlistId,
                query.audioId,
            );

            if (!result) {
                throw new Error("Failed adding audio in a playlist");
            }

            return res.status(HttpStatus.OK).send({ playlist: result });
        } catch (error: unknown) {
            console.error(`${this.addAudioInPlaylist.name} error`, error);

            if (error instanceof HttpException) {
                return res.status(error.getStatus()).send({
                    stack_trace: error.stack,
                    error: error.message,
                });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Delete("remove")
    public async removeAudioInPlaylist(
        @Query() query: { playlistId: number; audioId: number },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistService.removeAudioInPlaylist(
                query.playlistId,
                query.audioId,
            );

            if (!result) {
                throw new Error("Failed removing audio in a playlist");
            }

            return res
                .status(HttpStatus.OK)
                .send("Success removing audio in a playlist");
        } catch (error) {
            console.error(`${this.removeAudioInPlaylist.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Delete(":playlistId")
    public async deleteMyPlaylist(
        @Param("playlistId", ParseIntPipe) playlistId: number,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result =
                await this.playlistService.deletePlaylist(playlistId);

            if (!result) {
                throw new Error("Failed deleting a playlist");
            }

            return res
                .status(HttpStatus.OK)
                .send("Success deleting a playlist");
        } catch (error) {
            console.error(`${this.addAudioInPlaylist.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }
}
