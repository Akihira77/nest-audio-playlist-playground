import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import * as multer from "multer";
import { UserModule } from "../user/user.module.js";
import { AudioController } from "./audio.controller.js";
import { SAudioService, AudioService } from "./audio.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Audio } from "../audio/types.js";
import { CustomCacheModule } from "../cache/cache.module.js";
import { S3Module } from "../s3/s3.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { User } from "../user/types.js";

@Module({
    controllers: [AudioController],
    providers: [
        {
            provide: SAudioService,
            useClass: AudioService,
        },
    ],
    imports: [
        UserModule,
        CustomCacheModule,
        TypeOrmModule.forFeature([Audio, User]),
        MulterModule.register({
            dest: "./uploads",
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024,
                files: 1,
            },
            fileFilter(_req, file, callback) {
                if (
                    !file.mimetype.match(
                        /^audio\/(mpeg|wav|x-wav|aac|ogg|flac|m4a|mp4|x-ms-wma|amr|aiff|x-aiff|midi|x-midi)$/,
                    )
                ) {
                    return callback(new Error("Invalid audio file"), false);
                }

                callback(undefined, true);
            },
        }),
        S3Module,
        AuthModule,
    ],
})
export class AudioModule {}
