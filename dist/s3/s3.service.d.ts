import { ConfigService } from '@nestjs/config';
import { UploadResponseDto } from './dto/upload-response.dto';
export declare class S3Service {
    private readonly configService;
    private s3Client;
    private bucket;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadResponseDto>;
    uploadMultipleFiles(files: Express.Multer.File[], folder?: string): Promise<UploadResponseDto[]>;
    deleteFile(key: string): Promise<void>;
    deleteMultipleFiles(keys: string[]): Promise<void>;
    getFileUrl(key: string): string;
}
