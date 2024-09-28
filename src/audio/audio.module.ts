import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import * as multer from "multer";
import { DrizzleModule } from "../drizzle/drizzle.module.js";
import { UserModule } from "../user/user.module.js";
import { AudioController } from "./audio.controller.js";
import { SAudioService, AudioService } from "./audio.service.js";

@Module({
    controllers: [AudioController],
    providers: [
        {
            provide: SAudioService,
            useClass: AudioService,
        },
    ],
    imports: [
        DrizzleModule,
        UserModule,
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
    ],
})
export class AudioModule {}
