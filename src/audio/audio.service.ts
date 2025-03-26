import { Injectable } from "@nestjs/common";
import { UploadAudioDTO, Audio } from "./types.js";
import { PathLike } from "fs";
import { unlink } from "fs/promises";
import { ILike, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../user/types.js";

export interface IAudioService {
    upload(data: UploadAudioDTO, uploader: User): Promise<Audio | undefined>;
    update(
        audioId: number,
        data: UploadAudioDTO | Audio,
    ): Promise<Audio | undefined>;
    delete(audioId: number, filePath: PathLike): Promise<boolean>;
    removeFile(filePath: PathLike): Promise<void>;
    findAudioById(id: number): Promise<Audio | undefined>;
    findMyAudio(
        audioId: number,
        uploaderId: number,
    ): Promise<Audio | undefined>;
    editLike(audioId: number, num: number): Promise<Audio>;
    findAll(): Promise<Audio[]>;
    findAllByUserId(userId: number): Promise<Audio[]>;
    audiosQuerySearch(query: string): Promise<Audio[]>;
}
export const SAudioService = Symbol("IAudioService");

@Injectable()
export class AudioService implements IAudioService {
    constructor(
        @InjectRepository(Audio)
        private readonly audioRepository: Repository<Audio>,
    ) {}

    private logError(method: string, error: unknown): void {
        console.error(`${method} error`, error);
    }

    async audiosQuerySearch(query: string): Promise<Audio[]> {
        try {
            return await this.audioRepository.find({
                where: [
                    { title: ILike(`%${query}%`) },
                    { creator: ILike(`%${query}%`) },
                ],
                select: { file_path: false },
            });
        } catch (error) {
            this.logError(this.audiosQuerySearch.name, error);
            return [];
        }
    }

    findAll(): Promise<Audio[]> {
        return this.audioRepository.find({ select: { file_path: false } });
    }

    async findAllByUserId(userId: number): Promise<Audio[]> {
        return this.audioRepository.find({
            where: {
                uploader: {
                    id: userId,
                },
            },
            select: { file_path: false },
        });
    }

    async editLike(audioId: number, num: number): Promise<Audio> {
        const queryRunner =
            this.audioRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.startTransaction("READ COMMITTED");

            const audio = await queryRunner.manager.findOne(Audio, {
                where: { id: audioId },
                lock: { mode: "pessimistic_write" },
            });

            audio.likes += num;
            await queryRunner.manager.save(Audio, audio);
            await queryRunner.commitTransaction();

            return audio;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logError(this.editLike.name, error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async findAudioById(id: number): Promise<Audio | undefined> {
        return this.audioRepository.findOne({ where: { id } });
    }

    async findMyAudio(
        audioId: number,
        uploaderId: number,
    ): Promise<Audio | undefined> {
        return this.audioRepository.findOne({
            where: {
                id: audioId,
                uploader: {
                    id: uploaderId,
                },
            },
        });
    }

    async upload(data: UploadAudioDTO, uploader: User): Promise<Audio> {
        try {
            const audio = this.audioRepository.create(data);
            audio.uploader = Promise.resolve(uploader);

            return await this.audioRepository.save(audio);
        } catch (error) {
            this.logError(this.upload.name, error);
            return undefined;
        }
    }

    async update(
        audioId: number,
        data: UploadAudioDTO | Audio,
    ): Promise<Audio | null> {
        try {
            await this.audioRepository.update(audioId, {
                title: data.title,
                creator: data.creator,
                duration: data.duration,
                file_path: data.file_path,
                publishAt: data.publishAt,
            });
            return this.audioRepository.findOne({ where: { id: audioId } });
        } catch (error) {
            this.logError(this.update.name, error);
            return undefined;
        }
    }

    async delete(audioId: number, filePath: PathLike): Promise<boolean> {
        try {
            const result = await this.audioRepository.delete({ id: audioId });
            if (result.affected > 0) {
                await this.removeFile(filePath);
            }

            return result.affected > 0;
        } catch (error) {
            this.logError(this.delete.name, error);
            return false;
        }
    }

    async removeFile(filePath: PathLike): Promise<void> {
        try {
            console.log("Attempt to delete a file:", filePath);
            await unlink(filePath);
        } catch (error) {
            this.logError(this.removeFile.name, error);
            throw new Error("Failed to delete file");
        }
    }
}
