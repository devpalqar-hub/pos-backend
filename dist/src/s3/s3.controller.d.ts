import { S3Service } from './s3.service';
import { UploadResponseDto } from './dto/upload-response.dto';
export declare class S3Controller {
    private readonly s3Service;
    constructor(s3Service: S3Service);
    uploadFile(file: Express.Multer.File, folder?: string): Promise<UploadResponseDto>;
    uploadMultipleFiles(files: Express.Multer.File[], folder?: string): Promise<UploadResponseDto[]>;
    deleteFile(key: string): Promise<{
        message: string;
    }>;
    deleteMultipleFiles(keys: string[]): Promise<{
        message: string;
    }>;
}
