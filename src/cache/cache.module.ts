import { Module } from "@nestjs/common";
import { createKeyv } from "@keyv/redis";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Cacheable } from "cacheable";
import { CacheService } from "./cache.service.js";
import { CUSTOM_CACHE } from "../constants.js";

@Module({
    imports: [ConfigModule],
    providers: [
        {
            inject: [ConfigService],
            provide: CUSTOM_CACHE,
            useFactory: (configService: ConfigService) => {
                const host = configService.get<string>("REDIS_HOST");
                const port = configService.get<number>("REDIS_PORT");

                const secondary = createKeyv(`redis://${host}:${port}`, {
                    useUnlink: false,
                });
                return new Cacheable({ secondary, ttl: 60 * 1000 });
            },
        },
        CacheService,
    ],
    exports: [CacheService],
})
export class CustomCacheModule {}
