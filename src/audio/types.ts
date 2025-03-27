import { Playlist } from "../playlist/types.js";
import { User } from "../user/types.js";
import {
    Column,
    Entity,
    Index,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";

export type AudioModel = {
    id: number;
    title: string;
    duration: string;
    creator: string;
    publishAt: number;
    file_path: string;
    likes: number;
    uploaderId: number;
};

export type AudioExcFilePathDTO = Omit<AudioModel, "file_path">;

export type UploadAudioDTO = {
    title: string;
    duration: number;
    creator: string;
    publishAt: number;
    file_path: string;
    s3_key: string;
};

@Entity("audios")
export class Audio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 255 })
    @Index()
    title: string;

    @Column({ type: "decimal" })
    duration: number;

    @Column({ type: "varchar", length: 255 })
    @Index()
    creator: string;

    @Column({ type: "int" })
    publishAt: number;

    @Column({ type: "varchar", length: 255 })
    file_path: string;

    @Column({ type: "varchar", length: 255 })
    s3_key: string;

    @Column({ type: "int", default: 0 })
    likes: number;

    @ManyToOne(() => User, (user) => user.audios, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    })
    uploader: Promise<User>;

    @ManyToMany(() => Playlist, (playlist) => playlist.audios)
    playlists: Promise<Playlist[]>;

    @Column({ type: "timestamptz", default: new Date() })
    createdAt: Date;

    @Column({ type: "timestamptz", default: null })
    deletedAt: Date | null;
}
