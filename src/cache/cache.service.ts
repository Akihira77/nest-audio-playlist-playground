import { Inject, Injectable } from "@nestjs/common";
import { Cacheable } from "cacheable";
import { CUSTOM_CACHE } from "../constants.js";

@Injectable()
export class CacheService {
    constructor(@Inject(CUSTOM_CACHE) private readonly cache: Cacheable) {}

    async get<T>(key: string): Promise<T> {
        return await this.cache.get(key);
    }

    async set<T>(key: string, value: T, ttl?: number | string): Promise<void> {
        await this.cache.set(key, value, ttl);
    }

    async delete(key: string): Promise<void> {
        await this.cache.delete(key);
    }
}
