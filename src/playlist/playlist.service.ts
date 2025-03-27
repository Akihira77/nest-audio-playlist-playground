import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { CreatePlaylistDTO, Playlist } from "./types.js";
import { Audio } from "../audio/types.js";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../user/types.js";

export interface IPlaylistService {
    create(userId: number, data: CreatePlaylistDTO): Promise<Playlist>;
    addAudioInPlaylist(
        userId: number,
        playlistId: number,
        audioId: number,
    ): Promise<Playlist>;
    editPlaylistMetadata(
        userId: number,
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<Playlist>;
    findMyPlaylists(userId: number): Promise<Playlist[]>;
    findPlaylistById(playlistId: number): Promise<Playlist | null>;
    removeAudioInPlaylist(
        userId: number,
        playlistId: number,
        audioId: number,
    ): Promise<boolean>;
    deletePlaylist(userId: number, playlistId: number): Promise<boolean>;
}

export const SPlaylistService = Symbol("IPlaylistService");

@Injectable()
export class PlaylistService implements IPlaylistService {
    constructor(
        @InjectRepository(Playlist)
        private readonly playlistRepository: Repository<Playlist>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async create(userId: number, data: CreatePlaylistDTO): Promise<Playlist> {
        try {
            const user = await this.userRepository.findOneBy({ id: userId });
            if (user == null) {
                throw new HttpException("User not found", HttpStatus.NOT_FOUND);
            }

            const playlist = this.playlistRepository.create({
                name: data.name,
                isPublic: data.isPublic,
                audioCount: 0,
            });

            playlist.user = Promise.resolve(user);

            return await this.playlistRepository.save(playlist);
        } catch (error) {
            console.error(`${this.create.name} error`, error);
            return undefined;
        }
    }

    async addAudioInPlaylist(
        userId: number,
        playlistId: number,
        audioId: number,
    ): Promise<Playlist> {
        const playlist = await this.findPlaylistById(playlistId);

        if (playlist == null) {
            throw new HttpException("Playlist not found", HttpStatus.NOT_FOUND);
        }

        const uploader = await playlist.user;
        if (!playlist.isPublic && uploader.id != userId) {
            throw new HttpException(
                "This is private playlist only creator could modifying this playlist",
                HttpStatus.FORBIDDEN,
            );
        }

        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction();

            const playlist = await queryRunner.manager.findOne(Playlist, {
                where: {
                    id: playlistId,
                    user: { id: userId },
                    deletedAt: null,
                },
                relations: ["audios"],
            });
            const audio = await queryRunner.manager.findOne(Audio, {
                where: { id: audioId, deletedAt: null },
            });

            if (audio == null) {
                throw new HttpException(
                    "Audio not found",
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
        userId: number,
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<Playlist | undefined> {
        const playlist = await this.findPlaylistById(playlistId);

        if (playlist == null) {
            throw new HttpException("Playlist not found", HttpStatus.NOT_FOUND);
        }

        const uploader = await playlist.user;
        if (!playlist.isPublic && uploader.id != userId) {
            throw new HttpException(
                "This is private playlist only creator could modifying this playlist",
                HttpStatus.FORBIDDEN,
            );
        }

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
                where: { id: playlistId, deletedAt: null },
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
                where: { user: { id: userId }, deletedAt: null },
            });
        } catch (error) {
            console.error(`${this.findMyPlaylists.name} error`, error);
            return [];
        }
    }

    async findPlaylistById(playlistId: number): Promise<Playlist | null> {
        try {
            const playlist = await this.playlistRepository
                .createQueryBuilder(Playlist.name.toLowerCase())
                .leftJoinAndSelect(
                    "playlist.audios",
                    "audio",
                    "audio.deletedAt IS NULL",
                )
                .where("playlist.id = :playlistId", { playlistId })
                .andWhere("playlist.deletedAt IS NULL")
                .getOne();

            return playlist;
        } catch (error) {
            console.error(`${this.findPlaylistById.name} error`, error);
            return undefined;
        }
    }

    async removeAudioInPlaylist(
        userId: number,
        playlistId: number,
        audioId: number,
    ): Promise<boolean> {
        const playlist = await this.findPlaylistById(playlistId);

        if (playlist == null) {
            throw new HttpException("Playlist not found", HttpStatus.NOT_FOUND);
        }

        const uploader = await playlist.user;
        if (!playlist.isPublic && uploader.id != userId) {
            throw new HttpException(
                "This is private playlist only creator could modifying this playlist",
                HttpStatus.FORBIDDEN,
            );
        }

        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction("SERIALIZABLE");

            const playlist = await queryRunner.manager.findOne(Playlist, {
                where: { id: playlistId, deletedAt: null },
                relations: ["audios"],
                lock: { mode: "pessimistic_write" },
            });

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

    async deletePlaylist(userId: number, playlistId: number): Promise<boolean> {
        const playlist = await this.findPlaylistById(playlistId);

        if (playlist == null) {
            throw new HttpException("Playlist not found", HttpStatus.NOT_FOUND);
        }

        const uploader = await playlist.user;
        if (!playlist.isPublic && uploader.id != userId) {
            throw new HttpException(
                "This is private playlist only creator could modifying this playlist",
                HttpStatus.FORBIDDEN,
            );
        }

        const queryRunner =
            this.playlistRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction("SERIALIZABLE");

            const result = await queryRunner.manager.update(
                Playlist,
                {
                    id: playlistId,
                },
                { deletedAt: new Date() },
            );

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
