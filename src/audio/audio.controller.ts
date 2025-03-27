import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpException,
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
import { AuthGuard } from "../auth/auth.guard.js";
import { IAudioService, SAudioService } from "./audio.service.js";
import { UploadAudioDTO, Audio } from "./types.js";
import { generateRandomFileName } from "../util/common.js";
import { User } from "../util/decorator.js";
import { IUserService, SUserService } from "../user/user.service.js";
import { CacheService } from "../cache/cache.service.js";
import { S3Service } from "../s3/s3.service.js";
import { ConfigService } from "@nestjs/config";

@Controller("audios")
export class AudioController {
    constructor(
        @Inject(SAudioService) private readonly audioService: IAudioService,
        @Inject(SUserService) private readonly userService: IUserService,
        private readonly s3Service: S3Service,
        private readonly cacheService: CacheService,
        private readonly configService: ConfigService,
    ) {}

    @Get("")
    public async findAll(@Res() res: Response): Promise<Response> {
        try {
            let audios = await this.cacheService.get("audios_all");
            if (audios == null) {
                audios = await this.audioService.findAll();
                await this.cacheService.set("audios_all", audios);
            }

            return res.status(HttpStatus.OK).json({ audios: audios });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("search")
    public async audiosQuerySearch(
        @Query() queryParams: { query: string },
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let audios = await this.cacheService.get(
                `audios:query?${queryParams.query}`,
            );
            if (audios == null) {
                audios = await this.audioService.audiosQuerySearch(
                    queryParams.query ?? "",
                );
                await this.cacheService.set(
                    `audios:query?${queryParams.query}`,
                    audios,
                );
            }

            return res.status(HttpStatus.OK).json({ audios: audios });
        } catch (error) {
            console.error(`${this.audiosQuerySearch.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

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
            const audios = await this.audioService.findAllByUserId(
                currentUser.userId,
            );

            return res.status(HttpStatus.OK).json({ audios: audios });
        } catch (error) {
            console.error(`${this.findAll.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

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
            let audio = (await this.cacheService.get(
                `audio_${audioId}`,
            )) as Audio;
            if (audio == null) {
                audio = await this.audioService.findAudioById(audioId);

                if (audio == null) {
                    return res
                        .status(HttpStatus.NOT_FOUND)
                        .send("Audio not found");
                }

                await this.cacheService.set(`audio_${audioId}`, audio, 0);
            }

            const [s3Stream, s3FileSize] = await Promise.all([
                this.s3Service.getFileStream(audio.s3_key),
                this.s3Service.getFileSize(audio.s3_key),
            ]);

            if (!range) {
                const head = {
                    "Content-Length": s3FileSize,
                    "Content-Type": "audio/mpeg",
                };
                res.writeHead(HttpStatus.OK, head);
                s3Stream.pipe(res);
                return;
            }

            const [startString, endString] = range
                .replace(/bytes=/, "")
                .split("-");
            const start = parseInt(startString, 10);
            let end = endString ? parseInt(endString, 10) : s3FileSize - 1;

            console.log(
                `filesize: ${s3FileSize}; start: ${startString}; end: ${endString}`,
            );
            if (end >= s3FileSize) {
                end = s3FileSize - 1;
            }

            if (start >= s3FileSize || start > end || start < 0) {
                res.writeHead(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE, {
                    "Content-Range": `bytes */${s3FileSize}`,
                });
                return res.end();
            }

            const chunkSize = end - start + 1;
            const partialStream = await this.s3Service.getPartialStream(
                audio.s3_key,
                start,
                end,
            );
            const head = {
                "Content-Range": `bytes ${start}-${end}/${s3FileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "audio/mpeg",
            };

            res.writeHead(HttpStatus.PARTIAL_CONTENT, head);
            partialStream.pipe(res);
        } catch (error) {
            console.error(`${this.playAudio.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }

    @Get("id/:id")
    public async findAudioById(
        @Param("id", ParseIntPipe) id: number,
        @Res() res: Response,
    ): Promise<Response> {
        try {
            let audio = await this.cacheService.get(`audio_${id}`);
            if (audio == null) {
                audio = await this.audioService.findAudioById(id);

                if (audio == null) {
                    return res
                        .status(HttpStatus.NOT_FOUND)
                        .send("Audio not found");
                }

                await this.cacheService.set(`audio_${id}`, audio, 0);
            }

            return res.status(HttpStatus.OK).json({ audio: audio });
        } catch (error) {
            console.error(`${this.findAudioById.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

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
            const bucket = this.configService.get<string>("S3_BUCKET_NAME");
            const key = `uploads/${Date.now()}-${fileName}`;
            const url = await this.s3Service.uploadFile(
                bucket,
                key,
                file.buffer,
                file.mimetype,
            );

            const uploadedData: UploadAudioDTO = {
                ...data,
                duration: duration,
                file_path: url,
                s3_key: key,
            };

            const user = await this.userService.findRawUserById(
                currentUser.userId,
            );
            const audio = await this.audioService.upload(uploadedData, user);

            await this.cacheService.set(`audio_${audio.id}`, audio, 0);
            return res.status(HttpStatus.OK).json({
                audio: audio,
            });
        } catch (error) {
            console.error(`${this.upload.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

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
                const deleteResult = await this.s3Service.deleteFile(
                    audioFromDb.s3_key,
                );
                if (!deleteResult) {
                    throw new HttpException(
                        "Failed to delete old audio file from S3",
                        HttpStatus.BAD_REQUEST,
                    );
                }

                const metadata = await parseBuffer(file.buffer, file.mimetype);
                const duration = metadata.format.duration;
                if (!duration || duration <= 0) {
                    throw new HttpException(
                        "Invalid audio file",
                        HttpStatus.BAD_REQUEST,
                    );
                }

                const newS3Key = generateRandomFileName(file.originalname);
                const newFilePath = `uploads/${newS3Key}`;
                const uploadUrl = await this.s3Service.uploadFile(
                    process.env.S3_BUCKET_NAME,
                    newFilePath,
                    file.buffer,
                    file.mimetype,
                );

                audioFromDb.file_path = uploadUrl;
                audioFromDb.s3_key = newS3Key;
                audioFromDb.duration = duration;
            }

            const audio = await this.audioService.update(audioId, audioFromDb);
            if (!audio) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error updating audio");
            }

            await this.cacheService.set(`audio_${audio.id}`, audio, 0);
            return res.status(HttpStatus.OK).json({
                audio: audio,
            });
        } catch (error) {
            console.error(`${this.updateMyAudio.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

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

            await this.cacheService.set(`audio_${audio.id}`, audio, 0);
            return res.status(HttpStatus.OK).json({
                audio: audio,
            });
        } catch (error) {
            console.error(`${this.editLike.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

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
            const audio = await this.audioService.findMyAudio(
                audioId,
                currentUser.userId,
            );
            if (!audio) {
                return res.status(HttpStatus.NOT_FOUND).send("Audio not found");
            }

            const result = await this.audioService.delete(audio.id);
            if (!result) {
                return res
                    .status(HttpStatus.BAD_REQUEST)
                    .send("Error deleting audio");
            }

            await this.cacheService.delete(`audio_${audioId}`);
            return res.status(HttpStatus.OK).json({
                message: "Deleting file success",
            });
        } catch (error) {
            console.error(`${this.deleteMyAudio.name} error`, error);
            if (error instanceof HttpException) {
                return res
                    .status(error.getStatus())
                    .json({ stack_trace: error.stack, error: error.message });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error");
        }
    }
}
