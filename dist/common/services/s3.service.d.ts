import { ConfigService } from '@nestjs/config';
export type S3Folder = 'categories' | 'menu-items' | 'restaurants' | 'misc';
export declare class S3Service {
    private readonly config;
    private readonly logger;
    private readonly client;
    private readonly bucket;
    private readonly baseUrl;
    constructor(config: ConfigService);
    upload(file: Express.Multer.File, folder?: S3Folder): Promise<string>;
    deleteByUrl(url: string): Promise<void>;
    private validateFile;
}
