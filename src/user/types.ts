import {
    Column,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
} from "typeorm";
import { Audio } from "../audio/types.js";
import { Playlist } from "../playlist/types.js";

export type RegisterDto = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
};

export type LoginDto = {
    email: string;
    password: string;
};

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 255 })
    name: string;

    @Column({ type: "varchar", length: 255 })
    @Index()
    email: string;

    @Column({ type: "varchar", length: 255 })
    password: string;

    @OneToMany(() => Audio, (audio) => audio.uploader)
    audios: Promise<Audio[]>;

    @OneToMany(() => Playlist, (playlist) => playlist.user)
    playlists: Promise<Playlist[]>;

    @Column({ type: "timestamptz", nullable: true })
    deletedAt: Date | null;

    @Column({ type: "timestamptz", default: new Date() })
    createdAt: Date;

    constructor(data?: Partial<User>) {
        if (data) {
            this.name = data.name!;
            this.email = data.email!;
            this.password = data.password!;
            this.createdAt = new Date();
        }
    }
}
