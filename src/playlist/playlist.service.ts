import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { CreatePlaylistDTO, Playlist } from "./types.js";
import { Audio } from "../audio/types.js";
import { InjectRepository } from "@nestjs/typeorm";

export interface IPlaylistService {
    create(data: CreatePlaylistDTO): Promise<Playlist>;
    addAudioInPlaylist(playlistId: number, audioId: number): Promise<boolean>;
    editPlaylistMetadata(
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<Playlist>;
    findMyPlaylists(userId: number): Promise<Playlist[]>;
    findMyPlaylistPreloadAudios(
        userId: number,
        playlistId: number,
    ): Promise<Playlist | null>;
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
    ): Promise<boolean> {
        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Find the playlist and audio, including relations if necessary
            const playlist = await queryRunner.manager.findOne(Playlist, {
                where: { id: playlistId },
                relations: ["audios"], // Include current audios in the playlist
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

            // Add the audio to the playlist's existing audios (if not already added)
            const audios = await playlist.audios;
            audios.push(audio);

            // Increment audioCount in the playlist table
            await queryRunner.manager.increment(
                Playlist,
                { id: playlistId },
                "audioCount",
                1,
            );

            // Save the playlist with the updated audios array
            await queryRunner.manager.save(Playlist, playlist);

            // Commit the transaction
            await queryRunner.commitTransaction();
            return true;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error(`${this.addAudioInPlaylist.name} error`, error);
            return false;
        } finally {
            await queryRunner.release();
        }
    }
    async editPlaylistMetadata(
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<Playlist | undefined> {
        try {
            await this.playlistRepository.update(
                { id: playlistId },
                { name: data.name, isPublic: data.isPublic },
            );
            return await this.playlistRepository.findOne({
                where: { id: playlistId },
            });
        } catch (error) {
            console.error(`${this.editPlaylistMetadata.name} error`, error);
            return undefined;
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
        userId: number,
        playlistId: number,
    ): Promise<Playlist | null> {
        try {
            // Load playlist with audios and check user ownership
            const playlist = await this.playlistRepository.findOne({
                where: {
                    id: playlistId,
                    user: { id: userId },
                },
                relations: ["audios"], // Preload audios
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
        await queryRunner.startTransaction();

        try {
            // Load the playlist with its audios (to modify the list)
            const playlist = await this.playlistRepository.findOne({
                where: { id: playlistId },
                relations: ["audios"],
            });

            if (!playlist) throw new Error("Playlist not found");

            // Filter out the audio to remove it from the playlist
            const audios = await playlist.audios;
            playlist.audios = Promise.resolve(
                audios.filter((audio) => audio.id !== audioId),
            );

            // Update audioCount and save the updated playlist
            playlist.audioCount = audios.length;

            // Save changes within the transaction
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
        try {
            const result = await this.playlistRepository.delete({
                id: playlistId,
            });
            return result.affected > 0;
        } catch (error) {
            console.error(`${this.deletePlaylist.name} error`, error);
            return false;
        }
    }
}
