import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class AudioFileValidationPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        return value.size < 10 * 1024 * 1024;
    }
}
