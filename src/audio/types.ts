import { Playlist } from "../playlist/types.js";
import { User } from "../user/types.js";
import {
    Column,
    Entity,
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
    uploaderId: number;
};

@Entity("audios")
export class Audio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 255 })
    title: string;

    @Column({ type: "decimal" })
    duration: number;

    @Column({ type: "varchar", length: 255 })
    creator: string;

    @Column({ type: "int" })
    publishAt: number;

    @Column({ type: "varchar", length: 255 })
    file_path: string;

    @Column({ type: "int", default: 0 })
    likes: number;

    @ManyToOne(() => User, (user) => user.audios)
    uploader: Promise<User>;

    @ManyToMany(() => Playlist, (playlist) => playlist.audios)
    playlists: Promise<Playlist[]>;

    @Column({ type: "timestamptz", default: new Date() })
    createdAt: Date;

    @Column({ type: "timestamptz", default: null })
    deletedAt: Date | null;

    constructor(data?: Partial<Audio>) {
        if (data) {
            this.title = data.title;
            this.duration = data.duration;
            this.creator = data.creator;
            this.publishAt = data.publishAt;
            this.file_path = data.file_path;
            this.uploader = data.uploader;
        }
    }
}
