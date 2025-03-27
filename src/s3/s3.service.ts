import { Injectable } from "@nestjs/common";
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

@Injectable()
export class S3Service {
    constructor(private readonly s3Client: S3Client) {}

    async uploadFile(
        bucket: string,
        key: string,
        body: Buffer | Readable,
        contentType: string,
    ): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
        });

        await this.s3Client.send(command);
        return `https://${bucket}.s3.amazonaws.com/${key}`;
    }

    async getFileStream(key: string): Promise<Readable> {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        });

        const response = await this.s3Client.send(command);
        return response.Body as Readable;
    }

    async getFileSize(key: string): Promise<number> {
        const command = new HeadObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        });
        const response = await this.s3Client.send(command);
        return response.ContentLength || 0;
    }

    async getPartialStream(
        key: string,
        start: number,
        end: number,
    ): Promise<Readable> {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Range: `bytes=${start}-${end}`,
        });

        const response = await this.s3Client.send(command);
        return response.Body as Readable;
    }

    async deleteFile(key: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key,
            });

            await this.s3Client.send(command);
            console.log(`File ${key} deleted from S3.`);
            return true;
        } catch (error) {
            console.error("Error deleting file from S3:", error);
            return false;
        }
    }

    async deleteFilesBatch(keys: string[]): Promise<void> {
        if (keys.length === 0) return;

        try {
            const objectsToDelete = keys.map((key) => ({ Key: key }));

            const command = new DeleteObjectsCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Delete: { Objects: objectsToDelete },
            });

            const response = await this.s3Client.send(command);
            console.log(
                "Batch delete response:",
                response.Deleted?.length,
                "files deleted",
            );
        } catch (error) {
            console.error("Failed to delete files in batch from S3", error);
        }
    }
}
