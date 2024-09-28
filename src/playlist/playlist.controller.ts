import {
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject,
    Patch,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { IPlaylistService, SPlaylistService } from "./playlist.service.js";
import { AuthGuard } from "../user/auth.guard.js";
import { Request, Response } from "express";
import { CreatePlaylistDTO } from "./types.js";

@Controller("playlists")
@UseGuards(AuthGuard)
export class PlaylistController {
    constructor(
        @Inject(SPlaylistService)
        private readonly playlistSvc: IPlaylistService,
    ) {}

    @Get("")
    public async findAllMyPlaylists(
        @Req() req: Request<never, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const playlists = await this.playlistSvc.findMyPlaylists(
                req.user.userId,
            );

            return res.status(HttpStatus.OK).json({ playlists });
        } catch (error) {
            console.error(`${this.findAllMyPlaylists.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get(":playlistId")
    public async openAPlaylist(
        @Req() req: Request<{ playlistId: number }, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistSvc.findMyPlaylistPreloadAudios(
                req.user.userId,
                req.params.playlistId,
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
        @Req() req: Request<never, never, CreatePlaylistDTO, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistSvc.create(
                req.user.userId,
                req.body,
            );
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
        @Req()
        req: Request<{ playlistId: number }, never, CreatePlaylistDTO, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistSvc.editPlaylistMetadata(
                req.params.playlistId,
                req.body,
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
        @Req()
        req: Request<
            never,
            never,
            never,
            {
                playlistId: number;
                audioId: number;
            }
        >,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistSvc.addAudioInPlaylist(
                req.query.playlistId,
                req.query.audioId,
            );

            if (!result) {
                throw new Error("Failed adding audio in a playlist");
            }

            return res
                .status(HttpStatus.OK)
                .send("Success adding audio in a playlist");
        } catch (error) {
            console.error(`${this.addAudioInPlaylist.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Delete("remove")
    public async removeAudioInPlaylist(
        @Req()
        req: Request<
            never,
            never,
            never,
            {
                playlistId: number;
                audioId: number;
            }
        >,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistSvc.removeAudioInPlaylist(
                req.query.playlistId,
                req.query.audioId,
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
        @Req()
        req: Request<{ playlistId: number }, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.playlistSvc.deletePlaylist(
                req.params.playlistId,
            );

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
