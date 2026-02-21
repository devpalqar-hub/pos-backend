import { S3Service, S3Folder } from '../common/services/s3.service';
export declare class UploadController {
    private readonly s3;
    constructor(s3: S3Service);
    uploadImage(file: Express.Multer.File, folder?: S3Folder): Promise<{
        message: string;
        data: {
            url: string;
        };
    }>;
}
