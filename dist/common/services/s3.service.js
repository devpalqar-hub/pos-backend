"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var S3Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const crypto_1 = require("crypto");
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;
let S3Service = S3Service_1 = class S3Service {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(S3Service_1.name);
        this.bucket = config.getOrThrow('AWS_S3_BUCKET');
        this.baseUrl = config.getOrThrow('AWS_S3_BASE_URL');
        this.client = new client_s3_1.S3Client({
            region: config.getOrThrow('AWS_REGION'),
            credentials: {
                accessKeyId: config.getOrThrow('AWS_ACCESS_KEY_ID'),
                secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
            },
        });
    }
    async upload(file, folder = 'misc') {
        this.validateFile(file);
        const ext = mime.extension(file.mimetype) || 'jpg';
        const key = `${folder}/${(0, crypto_1.randomUUID)()}.${ext}`;
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            CacheControl: 'max-age=31536000',
        }));
        const url = `${this.baseUrl}/${key}`;
        this.logger.log(`Uploaded ${key} → ${url}`);
        return url;
    }
    async deleteByUrl(url) {
        try {
            const key = url.replace(`${this.baseUrl}/`, '');
            await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
            this.logger.log(`Deleted S3 object: ${key}`);
        }
        catch (err) {
            this.logger.warn(`Failed to delete S3 object from URL ${url}: ${err.message}`);
        }
    }
    validateFile(file) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        if (!ALLOWED_MIME.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME.join(', ')}`);
        }
        if (file.size > MAX_BYTES) {
            throw new common_1.BadRequestException(`File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max allowed: 5 MB`);
        }
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = S3Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3Service);
//# sourceMappingURL=s3.service.js.map