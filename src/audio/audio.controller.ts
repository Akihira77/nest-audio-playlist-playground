import {
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject,
    Patch,
    Post,
    Put,
    Req,
    Res,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { parseBuffer } from "music-metadata";
import * as path from "path";
import { AuthGuard } from "../user/auth.guard.js";
import { IAudioService, SAudioService } from "./audio.service.js";
import { UploadAudioDTO } from "./types.js";
import { generateRandomFileName } from "../util/common.js";
import { writeFile } from "fs/promises";
import { createReadStream, statSync } from "fs";

@Controller("audios")
export class AudioController {
    private readonly uploadDir = "./uploads";
    constructor(
        @Inject(SAudioService) private readonly audioSvc: IAudioService,
    ) {}

    @Get("")
    public async findAll(
        @Req() _req: Request<never, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const all = await this.audioSvc.findAll();

            return res.status(HttpStatus.OK).json({ audios: all });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("search")
    public async audiosQuerySearch(
        @Req()
        req: Request<never, never, never, { query: string }>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.audioSvc.audiosQuerySearch(
                req.query.query ?? "",
            );

            return res.status(HttpStatus.OK).json({ audios: result });
        } catch (error) {
            console.error(`${this.audiosQuerySearch.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Get("my-audio")
    public async findAllMyAudio(
        @Req() req: Request<never, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const all = await this.audioSvc.findAllByUserId(req.user.userId);

            return res.status(HttpStatus.OK).json({ audios: all });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("play/:audioId")
    public async playAudio(
        @Req() req: Request<{ audioId: number }, never, never, never>,
        @Res() res: Response,
    ): Promise<Response | StreamableFile> {
        try {
            const a = await this.audioSvc.findAudioById(req.params.audioId);
            if (!a) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }
            const filePath = path.join(this.uploadDir, a.file_path);
            const stat = statSync(filePath);
            const fileSize = stat.size;
            const start = 0;
            const end = fileSize - 1;
            const chunkSize = end - start + 1;
            const file = createReadStream(filePath, { start, end });
            const head = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "audio/mpeg",
            };

            res.writeHead(206, head); // 206 for partial content
            file.pipe(res);
        } catch (error) {
            console.error(`${this.playAudio.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get(":id")
    public async findAudioById(
        @Req() req: Request<{ id: number }, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const a = await this.audioSvc.findAudioById(req.params.id);
            if (!a) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }

            return res.status(HttpStatus.OK).json({ audio: a });
        } catch (error) {
            console.error(`${this.findAudioById.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Post("")
    @UseInterceptors(FileInterceptor("file"))
    public async upload(
        @Req()
        req: Request<
            never,
            never,
            {
                title: string;
                creator: string;
                publishAt: number;
            },
            never
        >,
        @UploadedFile()
        file: Express.Multer.File,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            if (!file) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Audio file is required");
            }

            const metadata = await parseBuffer(file.buffer, file.mimetype);
            const duration = metadata.format.duration;
            console.log(metadata);
            if (!duration || duration <= 0) {
                throw new Error("Invalid audio file");
            }

            const fileName = generateRandomFileName(file.originalname);
            const filePath = path.join(this.uploadDir, fileName);
            const data: UploadAudioDTO = {
                ...req.body,
                uploaderId: req.user.userId,
                duration: duration,
                file_path: fileName,
            };

            const [_, result] = await Promise.all([
                writeFile(filePath, file.buffer),
                this.audioSvc.upload(data),
            ]);

            if (!result) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Failed uploading file");
            }

            return res.status(HttpStatus.OK).json({
                audio: result,
            });
        } catch (error) {
            console.error(`${this.upload.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Put(":audioId")
    @UseInterceptors(FileInterceptor("file"))
    public async updateMyAudio(
        @Req()
        req: Request<
            { audioId: number },
            never,
            {
                title: string;
                creator: string;
                publishAt: number;
            },
            never
        >,
        @UploadedFile()
        file: Express.Multer.File,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let audioFromDb = await this.audioSvc.findMyAudio(
                req.params.audioId,
                req.user.userId,
            );
            if (!audioFromDb) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }

            audioFromDb = {
                ...audioFromDb,
                ...req.body,
            };
            if (file) {
                let filePath = path.join(this.uploadDir, audioFromDb.file_path);
                this.audioSvc.removeFile(filePath);

                const metadata = await parseBuffer(file.buffer, file.mimetype);
                const duration = metadata.format.duration;
                if (!duration || duration <= 0) {
                    throw new Error("Invalid audio file");
                }

                audioFromDb.file_path = generateRandomFileName(
                    file.originalname,
                );
                audioFromDb.duration = duration.toString();
                filePath = path.join(this.uploadDir, audioFromDb.file_path);
                writeFile(filePath, file.buffer);
            }

            const result = await this.audioSvc.update(audioFromDb);
            if (!result) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error updating audio");
            }

            return res.status(HttpStatus.OK).json({
                audio: result,
            });
        } catch (error) {
            console.error(`${this.updateMyAudio.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Patch(":audioId")
    public async editLike(
        @Req()
        req: Request<{ audioId: number }, never, { like: boolean }, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let num = 1;
            if (!req.body.like) {
                num = -1;
            }

            const [result, audio] = await Promise.all([
                this.audioSvc.editLike(req.params.audioId, num),
                this.audioSvc.findAudioById(req.params.audioId),
            ]);

            if (!result) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error updating audio's likes");
            }

            return res.status(HttpStatus.OK).json({
                audio: {
                    ...audio,
                    likes: audio.likes + num,
                },
            });
        } catch (error) {
            console.error(`${this.editLike.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Delete(":audioId")
    public async deleteMyAudio(
        @Req() req: Request<{ audioId: number }, never, never, never>,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const a = await this.audioSvc.findMyAudio(
                req.params.audioId,
                req.user.userId,
            );
            if (!a) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }

            const result = await this.audioSvc.delete(
                a.id,
                path.join(this.uploadDir, a.file_path),
            );
            if (!result) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error deleting audio");
            }

            return res.status(HttpStatus.OK).json({
                message: "Deleting file success",
            });
        } catch (error) {
            console.error(`${this.deleteMyAudio.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }
}
