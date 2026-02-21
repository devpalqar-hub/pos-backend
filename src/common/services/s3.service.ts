import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as mime from 'mime-types';
import { randomUUID } from 'crypto';

export type S3Folder = 'categories' | 'menu-items' | 'restaurants' | 'misc';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow<string>('AWS_S3_BUCKET');
    this.baseUrl = config.getOrThrow<string>('AWS_S3_BASE_URL');

    this.client = new S3Client({
      region: config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  // ─── Upload a single file buffer ──────────────────────────────────────────

  async upload(
    file: Express.Multer.File,
    folder: S3Folder = 'misc',
  ): Promise<string> {
    this.validateFile(file);

    const ext = mime.extension(file.mimetype) || 'jpg';
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'max-age=31536000',
      }),
    );

    const url = `${this.baseUrl}/${key}`;
    this.logger.log(`Uploaded ${key} → ${url}`);
    return url;
  }

  // ─── Delete an object by its full URL ─────────────────────────────────────

  async deleteByUrl(url: string): Promise<void> {
    try {
      const key = url.replace(`${this.baseUrl}/`, '');
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`Deleted S3 object: ${key}`);
    } catch (err) {
      this.logger.warn(`Failed to delete S3 object from URL ${url}: ${(err as Error).message}`);
    }
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  private validateFile(file: Express.Multer.File): void {
    if (!file) throw new BadRequestException('No file provided');

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME.join(', ')}`,
      );
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max allowed: 5 MB`,
      );
    }
  }
}
