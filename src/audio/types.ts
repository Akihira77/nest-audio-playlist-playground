export type AudioModel = {
    id: number;
    title: string;
    duration: string;
    creator: string;
    publishAt: number;
    file_path: string;
    likes: number;
    uploaderId: string;
};

export type AudioExcFilePathDTO = Omit<AudioModel, "file_path">;

export type UploadAudioDTO = {
    title: string;
    duration: number;
    creator: string;
    publishAt: number;
    file_path: string;
    uploaderId: string;
};
