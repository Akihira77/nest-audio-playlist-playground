import { AudioExcFilePathDTO, Audio } from "../audio/types.js";
import { User } from "../user/types.js";
import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";

export type PlaylistMetadataModel = {
    id: number;
    userId: string;
    name: string;
    isPublic: boolean;
    audioCount: number;
    createdAt: Date;
};

export type UserPlaylistModel = {
    playlistId: number;
    audioId: number;
};

export type PlaylistAudioDTO =
    | PlaylistMetadataModel
    | {
          audios: Omit<AudioExcFilePathDTO, "uploaderId">[];
      };

export type CreatePlaylistDTO = {
    name: string;
    isPublic: boolean;
};

@Entity("playlists")
export class Playlist {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.playlists)
    user: Promise<User>;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "boolean", default: true })
    isPublic: boolean;

    @ManyToMany(() => Audio, (audio) => audio.playlists)
    @JoinTable({ name: "users_playlists" }) // Join table to store the many-to-many relation
    audios: Promise<Audio[]>;

    @Column({ type: "int", default: 0 })
    audioCount: number;

    @Column({ type: "timestamptz", default: new Date() })
    createdAt: Date;

    @Column({ type: "timestamptz", default: null })
    deletedAt: Date | null;
}
