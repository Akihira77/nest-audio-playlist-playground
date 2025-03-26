import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpStatus,
    Inject,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Res,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { parseBuffer } from "music-metadata";
import * as path from "path";
import { AuthGuard } from "../user/auth.guard.js";
import { IAudioService, SAudioService } from "./audio.service.js";
import { UploadAudioDTO } from "./types.js";
import { generateRandomFileName } from "../util/common.js";
import { writeFile } from "fs/promises";
import { createReadStream, statSync } from "fs";
import { User } from "../util/decorator.js";
import { IUserService, SUserService } from "../user/user.service.js";

@Controller("audios")
export class AudioController {
    private readonly uploadDir = "./uploads";
    constructor(
        @Inject(SAudioService)
        private readonly audioService: IAudioService,
        @Inject(SUserService)
        private readonly userService: IUserService,
    ) {}

    @Get("")
    public async findAll(@Res() res: Response): Promise<Response> {
        try {
            const all = await this.audioService.findAll();

            return res.status(HttpStatus.OK).json({ audios: all });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("search")
    public async audiosQuerySearch(
        @Query() queryParams: { query: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const result = await this.audioService.audiosQuerySearch(
                queryParams.query ?? "",
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
        @User() currentUser: { userId: number; name: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const all = await this.audioService.findAllByUserId(
                currentUser.userId,
            );

            return res.status(HttpStatus.OK).json({ audios: all });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("play/:audioId")
    public async playAudio(
        @Headers("range") range: string,
        @Param("audioId", ParseIntPipe) audioId: number,
        @Res() res: Response,
    ): Promise<Response | StreamableFile> {
        try {
            const a = await this.audioService.findAudioById(audioId);
            if (!a) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }
            const filePath = path.join(this.uploadDir, a.file_path);
            const stat = statSync(filePath);
            const fileSize = stat.size;

            if (!range) {
                const head = {
                    "Content-Length": fileSize,
                    "Content-Type": "audio/mpeg",
                };
                res.writeHead(HttpStatus.OK, head);
                createReadStream(filePath).pipe(res);
                return;
            }

            const [startString, endString] = range
                .replace(/bytes=/, "")
                .split("-");
            const start = parseInt(startString, 10);
            let end = endString ? parseInt(endString, 10) : fileSize - 1;

            console.log(
                `filesize: ${fileSize}; start: ${startString}; end: ${endString}`,
            );
            if (end >= fileSize) {
                end = fileSize - 1;
            }

            if (start >= fileSize || start > end || start < 0) {
                res.writeHead(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, {
                    "Content-Range": `bytes */${fileSize}`,
                });
                return res.end();
            }

            const chunkSize = end - start + 1;
            const file = createReadStream(filePath, { start: start, end: end });
            const head = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "audio/mpeg",
            };

            res.writeHead(HttpStatus.PARTIAL_CONTENT, head);
            file.pipe(res);
        } catch (error) {
            console.error(`${this.playAudio.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get(":id")
    public async findAudioById(
        @Param("id", ParseIntPipe) id: number,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const a = await this.audioService.findAudioById(id);
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
        @User() currentUser: { userId: number; name: string },
        @Body() data: { title: string; creator: string; publishAt: number },
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
            if (!duration || duration <= 0) {
                throw new Error("Invalid audio file");
            }

            const fileName = generateRandomFileName(file.originalname);
            const filePath = path.join(this.uploadDir, fileName);
            const user = await this.userService.findRawUserById(
                currentUser.userId,
            );
            const uploadedData: UploadAudioDTO = {
                ...data,
                duration: duration,
                file_path: fileName,
            };

            const [_, result] = await Promise.all([
                writeFile(filePath, file.buffer),
                this.audioService.upload(uploadedData, user),
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
        @User() currentUser: { userId: number; name: string },
        @Param("audioId", ParseIntPipe) audioId: number,
        @Body() data: { title: string; creator: string; publishAt: number },
        @UploadedFile()
        file: Express.Multer.File,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let audioFromDb = await this.audioService.findMyAudio(
                audioId,
                currentUser.userId,
            );
            if (!audioFromDb) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }

            audioFromDb = {
                ...audioFromDb,
                ...data,
            };
            if (file) {
                let filePath = path.join(this.uploadDir, audioFromDb.file_path);
                this.audioService.removeFile(filePath);

                const metadata = await parseBuffer(file.buffer, file.mimetype);
                const duration = metadata.format.duration;
                if (!duration || duration <= 0) {
                    throw new Error("Invalid audio file");
                }

                audioFromDb.file_path = generateRandomFileName(
                    file.originalname,
                );
                audioFromDb.duration = duration;
                filePath = path.join(this.uploadDir, audioFromDb.file_path);
                writeFile(filePath, file.buffer);
            }

            const result = await this.audioService.update(audioId, audioFromDb);
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
        @Param("audioId", ParseIntPipe) audioId: number,
        @Body() data: { like: boolean },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let num = 1;
            if (!data.like) {
                num = -1;
            }

            const audio = await this.audioService.editLike(audioId, num);

            return res.status(HttpStatus.OK).json({
                audio: audio,
            });
        } catch (error) {
            console.error(`${this.editLike.name} error`, error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @UseGuards(AuthGuard)
    @Delete(":audioId")
    public async deleteMyAudio(
        @User() currentUser: { userId: number; name: string },
        @Param("audioId", ParseIntPipe) audioId: number,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            const a = await this.audioService.findMyAudio(
                audioId,
                currentUser.userId,
            );
            if (!a) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }

            const result = await this.audioService.delete(
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
