import { Inject } from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PG_CONNECTION } from "../constants.js";
import * as schema from "../drizzle/schema.js";
import {
    CreatePlaylistDTO,
    PlaylistAudioDTO,
    PlaylistMetadataModel,
} from "./types.js";
import { and, eq, sql } from "drizzle-orm";

export interface IPlaylistService {
    create(
        userId: string,
        data: CreatePlaylistDTO,
    ): Promise<PlaylistMetadataModel | undefined>;
    addAudioInPlaylist(playlistId: number, audioId: number): Promise<boolean>;
    editPlaylistMetadata(
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<PlaylistMetadataModel | undefined>;
    findMyPlaylists(userId: string): Promise<PlaylistMetadataModel[]>;
    findMyPlaylistPreloadAudios(
        userId: string,
        playlistId: number,
    ): Promise<PlaylistAudioDTO | undefined>;
    removeAudioInPlaylist(
        playlistId: number,
        audioId: number,
    ): Promise<boolean>;
    deletePlaylist(playlistId: number): Promise<boolean>;
}
export const SPlaylistService = Symbol("IPlaylistService");

export class PlaylistService implements IPlaylistService {
    constructor(
        @Inject(PG_CONNECTION)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    public async removeAudioInPlaylist(
        playlistId: number,
        audioId: number,
    ): Promise<boolean> {
        try {
            const res = await this.db
                .delete(schema.usersPlaylists)
                .where(
                    and(
                        eq(schema.usersPlaylists.playlistId, playlistId),
                        eq(schema.usersPlaylists.audioId, audioId),
                    ),
                );

            return res.rowCount > 0;
        } catch (error) {
            console.error(`${this.removeAudioInPlaylist.name} error`, error);
            return false;
        }
    }

    public async deletePlaylist(playlistId: number): Promise<boolean> {
        try {
            const res = await this.db
                .delete(schema.playlistMetadata)
                .where(eq(schema.playlistMetadata.id, playlistId));

            return res.rowCount > 0;
        } catch (error) {
            console.error(`${this.deletePlaylist.name} error`, error);
            return false;
        }
    }

    public async create(
        userId: string,
        data: CreatePlaylistDTO,
    ): Promise<PlaylistMetadataModel | undefined> {
        try {
            const res = await this.db
                .insert(schema.playlistMetadata)
                .values({
                    userId: userId,
                    name: data.name,
                    isPublic: data.isPublic,
                    audioCount: 0,
                })
                .returning();

            return res[0];
        } catch (error) {
            console.error(`${this.create.name} error`, error);
            return undefined;
        }
    }

    public async addAudioInPlaylist(
        playlistId: number,
        audioId: number,
    ): Promise<boolean> {
        try {
            const res = await this.db.transaction(async (tx) => {
                try {
                    const insertAudioInPlaylist = tx
                        .insert(schema.usersPlaylists)
                        .values({
                            playlistId: playlistId,
                            audioId: audioId,
                        } as any);

                    const updatePlaylistAudiosCount = tx.execute(sql`
                        UPDATE playlist_metadata
                        SET audio_count = audio_count + 1
                        WHERE id = ${playlistId}
                    `);

                    const [res, _] = await Promise.all([
                        insertAudioInPlaylist,
                        updatePlaylistAudiosCount,
                    ]);

                    return res.rowCount > 0;
                } catch (error) {
                    tx.rollback();
                    console.error(
                        `${this.addAudioInPlaylist.name} error`,
                        error,
                    );
                    return false;
                }
            });

            return res;
        } catch (error) {
            console.error(`${this.addAudioInPlaylist.name} error`, error);
            return false;
        }
    }

    public async editPlaylistMetadata(
        playlistId: number,
        data: CreatePlaylistDTO,
    ): Promise<PlaylistMetadataModel | undefined> {
        try {
            const res = await this.db
                .update(schema.playlistMetadata)
                .set({
                    name: data.name,
                    isPublic: data.isPublic,
                })
                .where(eq(schema.playlistMetadata.id, playlistId))
                .returning();

            return res[0];
        } catch (error) {
            console.error(`${this.addAudioInPlaylist.name} error`, error);
            return undefined;
        }
    }

    public async findMyPlaylists(
        userId: string,
    ): Promise<PlaylistMetadataModel[]> {
        try {
            const res = await this.db.query.playlistMetadata.findMany({
                where: eq(schema.playlistMetadata.userId, userId),
            });

            return res;
        } catch (error) {
            console.error(`${this.findMyPlaylists.name} error`, error);
            return undefined;
        }
    }

    public async findMyPlaylistPreloadAudios(
        userId: string,
        playlistId: number,
    ): Promise<PlaylistAudioDTO | undefined> {
        try {
            const playlistMeta = this.db.query.playlistMetadata.findFirst({
                where: and(
                    eq(schema.playlistMetadata.id, playlistId),
                    eq(schema.playlistMetadata.userId, userId),
                ),
            });
            const audiosInPlaylist = this.db
                .select({
                    id: schema.audios.id,
                    title: schema.audios.title,
                    duration: schema.audios.duration,
                    creator: schema.audios.creator,
                    publishAt: schema.audios.publishAt,
                    likes: schema.audios.likes,
                })
                .from(schema.usersPlaylists)
                .leftJoin(
                    schema.playlistMetadata,
                    eq(
                        schema.usersPlaylists.playlistId,
                        schema.playlistMetadata.id,
                    ),
                )
                .leftJoin(
                    schema.audios,
                    eq(schema.usersPlaylists.audioId, schema.audios.id),
                )
                .where(eq(schema.usersPlaylists.playlistId, playlistId));

            const [p, a] = await Promise.all([playlistMeta, audiosInPlaylist]);

            return {
                id: p.id,
                userId: p.userId,
                name: p.name,
                audioCount: p.audioCount,
                isPublic: p.isPublic,
                createdAt: p.createdAt,
                audios: a,
            };
        } catch (error) {
            console.error(
                `${this.findMyPlaylistPreloadAudios.name} error`,
                error,
            );
            return undefined;
        }
    }
}
