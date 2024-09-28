import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PG_CONNECTION } from "../constants.js";
import * as schema from "../drizzle/schema.js";
import { UploadAudioDTO, AudioModel, AudioExcFilePathDTO } from "./types.js";
import { eq, sql } from "drizzle-orm";
import { PathLike } from "fs";
import { unlink } from "fs/promises";

export interface IAudioService {
    upload(data: UploadAudioDTO): Promise<AudioModel | undefined>;
    update(data: UploadAudioDTO | AudioModel): Promise<AudioModel | undefined>;
    delete(audioId: number, filePath: PathLike): Promise<boolean>;
    removeFile(filePath: PathLike): Promise<void>;
    findAudioById(id: number): Promise<AudioModel | undefined>;
    editLike(audioId: number, num: number): Promise<boolean>;
    findAll(): Promise<AudioExcFilePathDTO[]>;
    findAllByUserId(userId: string): Promise<AudioExcFilePathDTO[]>;
}
export const SAudioService = Symbol("IAuthService");

export class AudioService implements IAudioService {
    constructor(
        @Inject(PG_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    async findAll(): Promise<AudioExcFilePathDTO[]> {
        try {
            const res = await this.db.query.audios.findMany({
                columns: {
                    file_path: false,
                },
            });

            return res;
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return [];
        }
    }
    async findAllByUserId(userId: string): Promise<AudioExcFilePathDTO[]> {
        try {
            const res = await this.db.query.audios.findMany({
                where: eq(schema.audios.uploaderId, userId),
                columns: {
                    file_path: false,
                },
            });

            return res;
        } catch (error) {
            console.error(`${this.findAllByUserId.name} error`, error);
            return [];
        }
    }

    async editLike(audioId: number, num: number): Promise<boolean> {
        try {
            const res = await this.db.execute(sql`
                UPDATE audios
                SET likes = likes + ${num}
                WHERE id = ${audioId}
                RETURNING *
            `);

            return res.rowCount > 0;
        } catch (error) {
            console.error(`${this.editLike.name} error`, error);
            return undefined;
        }
    }

    async findAudioById(id: number): Promise<AudioModel | undefined> {
        try {
            const res = await this.db.query.audios.findFirst({
                where: eq(schema.audios.id, id),
            });

            return res;
        } catch (error) {
            console.error(`${this.findAudioById.name} error`, error);
            return undefined;
        }
    }

    async upload(data: UploadAudioDTO): Promise<AudioModel | undefined> {
        try {
            const res = await this.db
                .insert(schema.audios)
                .values({
                    title: data.title,
                    creator: data.creator,
                    duration: data.duration.toString(),
                    file_path: data.file_path,
                    publishAt: data.publishAt,
                    uploaderId: data.uploaderId,
                })
                .returning();

            return res[0];
        } catch (error) {
            console.error(`${this.upload.name} error`, error);
            return undefined;
        }
    }

    async update(
        data: UploadAudioDTO | AudioModel,
    ): Promise<AudioModel | undefined> {
        try {
            const res = await this.db
                .update(schema.audios)
                .set({
                    title: data.title,
                    creator: data.creator,
                    duration: data.duration.toString(),
                    file_path: data.file_path,
                    publishAt: data.publishAt,
                })
                .returning();

            return res[0];
        } catch (error) {
            console.error(`${this.update.name} error`, error);
            return undefined;
        }
    }

    async delete(audioId: number, filePath: PathLike): Promise<boolean> {
        try {
            const res = await this.db.transaction(async (tx) => {
                try {
                    const op = tx
                        .delete(schema.audios)
                        .where(eq(schema.audios.id, audioId));
                    const [res, _] = await Promise.all([
                        op,
                        this.removeFile(filePath),
                    ]);

                    return res.rowCount > 0;
                } catch (error) {
                    tx.rollback();
                    console.error(`${this.delete.name} error`, error);
                    return false;
                }
            });

            return res;
        } catch (error) {
            console.error(`${this.delete.name} error`, error);
            return false;
        }
    }

    removeFile(filePath: PathLike): Promise<void> {
        try {
            console.log("Attempt to delete a file", filePath);
            return unlink(filePath);
        } catch (error) {
            console.error(`${this.removeFile.name} error`, error);
            throw new Error("Failed deleting file");
        }
    }
}
