import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { CreatePlaylistDTO, Playlist } from "./types.js";
import { Audio } from "../audio/types.js";
import { InjectRepository } from "@nestjs/typeorm";

export interface IPlaylistService {
    create(data: CreatePlaylistDTO): Promise<Playlist>;
    addAudioInPlaylist(playlistId: number, audioId: number): Promise<Playlist>;
    editPlaylistMetadata(
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<Playlist>;
    findMyPlaylists(userId: number): Promise<Playlist[]>;
    findMyPlaylistPreloadAudios(playlistId: number): Promise<Playlist | null>;
    removeAudioInPlaylist(
        playlistId: number,
        audioId: number,
    ): Promise<boolean>;
    deletePlaylist(playlistId: number): Promise<boolean>;
}

export const SPlaylistService = Symbol("IPlaylistService");

@Injectable()
export class PlaylistService implements IPlaylistService {
    constructor(
        @InjectRepository(Playlist)
        private readonly playlistRepository: Repository<Playlist>,
    ) {}

    async create(data: CreatePlaylistDTO): Promise<Playlist> {
        try {
            const playlist = this.playlistRepository.create({
                name: data.name,
                isPublic: data.isPublic,
                audioCount: 0,
            });
            return await this.playlistRepository.save(playlist);
        } catch (error) {
            console.error(`${this.create.name} error`, error);
            return undefined;
        }
    }

    async addAudioInPlaylist(
        playlistId: number,
        audioId: number,
    ): Promise<Playlist> {
        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction();

            const playlist = await queryRunner.manager.findOne(Playlist, {
                where: { id: playlistId },
                relations: ["audios"],
            });
            const audio = await queryRunner.manager.findOne(Audio, {
                where: { id: audioId },
            });

            if (!playlist || !audio) {
                throw new HttpException(
                    "Playlist or audio not found",
                    HttpStatus.NOT_FOUND,
                );
            }

            const audios = await playlist.audios;
            const isAudioInPlaylist = audios.some((a) => a.id == audioId);
            if (isAudioInPlaylist) {
                throw new HttpException(
                    "Audio already exists in the playlist",
                    HttpStatus.BAD_REQUEST,
                );
            }

            audios.push(audio);
            playlist.audioCount++;

            await queryRunner.manager.save(Playlist, playlist);

            await queryRunner.commitTransaction();
            return playlist;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(`${this.addAudioInPlaylist.name} error`, error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
    async editPlaylistMetadata(
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<Playlist | undefined> {
        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction("SERIALIZABLE");

            await queryRunner.manager.update(
                Playlist,
                { id: playlistId },
                { name: data.name, isPublic: data.isPublic },
            );

            await queryRunner.commitTransaction();

            return await queryRunner.manager.findOne(Playlist, {
                where: { id: playlistId },
            });
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(`${this.editPlaylistMetadata.name} error`, error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async findMyPlaylists(userId: number): Promise<Playlist[]> {
        try {
            return await this.playlistRepository.find({
                where: { id: userId },
            });
        } catch (error) {
            console.error(`${this.findMyPlaylists.name} error`, error);
            return [];
        }
    }

    async findMyPlaylistPreloadAudios(
        playlistId: number,
    ): Promise<Playlist | null> {
        try {
            const playlist = await this.playlistRepository.findOne({
                where: {
                    id: playlistId,
                },
                relations: ["audios"],
            });

            return playlist;
        } catch (error) {
            console.error(
                `${this.findMyPlaylistPreloadAudios.name} error`,
                error,
            );
            return undefined;
        }
    }

    async removeAudioInPlaylist(
        playlistId: number,
        audioId: number,
    ): Promise<boolean> {
        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction("SERIALIZABLE");

            const playlist = await queryRunner.manager.findOne(Playlist, {
                where: { id: playlistId },
                relations: ["audios"],
                lock: { mode: "pessimistic_write" },
            });

            if (!playlist) throw new Error("Playlist not found");

            let audios = await playlist.audios;
            audios = audios.filter((audio) => audio.id != audioId);

            playlist.audioCount--;

            await queryRunner.manager.save(playlist);
            await queryRunner.commitTransaction();

            return true;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(`${this.removeAudioInPlaylist.name} error`, error);
            return false;
        } finally {
            await queryRunner.release();
        }
    }

    async deletePlaylist(playlistId: number): Promise<boolean> {
        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction("SERIALIZABLE");

            const result = await queryRunner.manager.delete(Playlist, {
                id: playlistId,
            });

            await queryRunner.commitTransaction();
            return result.affected > 0;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(`${this.deletePlaylist.name} error`, error);
            return false;
        } finally {
            await queryRunner.release();
        }
    }
}
