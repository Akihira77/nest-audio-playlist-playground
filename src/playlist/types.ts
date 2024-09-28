import { AudioExcFilePathDTO } from "src/audio/types.js";

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
